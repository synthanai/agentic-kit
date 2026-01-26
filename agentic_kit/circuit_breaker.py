"""
Circuit Breaker & Kill Switch

Safety mechanisms for agentic loops:
- Circuit breaker: Automatically stops after too many failures
- Kill switch: Manual or automatic emergency stop
- Rate limiting: Prevents runaway loops

Usage:
    from agentic_kit import CircuitBreaker, KillSwitch, RateLimiter
    
    breaker = CircuitBreaker(failure_threshold=3)
    
    with breaker:
        result = risky_operation()
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable, List
from enum import Enum
from contextlib import contextmanager
import threading
import time
import logging


class BreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Blocking all calls
    HALF_OPEN = "half_open" # Testing recovery


@dataclass
class BreakerStats:
    """Circuit breaker statistics."""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state_changes: int = 0


class CircuitBreaker:
    """
    Circuit breaker for safe operation execution.
    
    States:
    - CLOSED: Normal operation, tracking failures
    - OPEN: Too many failures, blocking all calls
    - HALF_OPEN: Testing if system recovered
    
    Usage:
        breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=60
        )
        
        # Method 1: Context manager
        with breaker:
            result = risky_operation()
        
        # Method 2: Decorator
        @breaker.protect
        def my_function():
            ...
        
        # Method 3: Manual
        if breaker.allow_request():
            try:
                result = risky_operation()
                breaker.record_success()
            except Exception as e:
                breaker.record_failure()
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        half_open_max_calls: int = 3,
        exclude_exceptions: tuple = ()
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.exclude_exceptions = exclude_exceptions
        
        self._state = BreakerState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0
        self._last_failure_time: Optional[datetime] = None
        self._lock = threading.Lock()
        
        self.stats = BreakerStats()
        self.logger = logging.getLogger("agentic_kit.breaker")
    
    @property
    def state(self) -> BreakerState:
        """Get current state, checking for recovery."""
        with self._lock:
            if self._state == BreakerState.OPEN:
                if self._should_attempt_recovery():
                    self._transition_to(BreakerState.HALF_OPEN)
            return self._state
    
    def allow_request(self) -> bool:
        """Check if request should be allowed."""
        state = self.state
        
        with self._lock:
            if state == BreakerState.CLOSED:
                return True
            elif state == BreakerState.OPEN:
                self.stats.rejected_calls += 1
                return False
            else:  # HALF_OPEN
                if self._half_open_calls < self.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False
    
    def record_success(self):
        """Record a successful call."""
        with self._lock:
            self.stats.total_calls += 1
            self.stats.successful_calls += 1
            self.stats.last_success_time = datetime.now()
            self._success_count += 1
            
            if self._state == BreakerState.HALF_OPEN:
                if self._success_count >= self.half_open_max_calls:
                    self._transition_to(BreakerState.CLOSED)
    
    def record_failure(self, exception: Optional[Exception] = None):
        """Record a failed call."""
        if exception and isinstance(exception, self.exclude_exceptions):
            return
        
        with self._lock:
            self.stats.total_calls += 1
            self.stats.failed_calls += 1
            self.stats.last_failure_time = datetime.now()
            self._failure_count += 1
            self._last_failure_time = datetime.now()
            
            if self._state == BreakerState.HALF_OPEN:
                self._transition_to(BreakerState.OPEN)
            elif self._failure_count >= self.failure_threshold:
                self._transition_to(BreakerState.OPEN)
    
    def reset(self):
        """Manually reset the circuit breaker."""
        with self._lock:
            self._transition_to(BreakerState.CLOSED)
            self._failure_count = 0
            self._success_count = 0
            self._half_open_calls = 0
    
    def force_open(self):
        """Force the breaker open (kill switch)."""
        with self._lock:
            self._last_failure_time = datetime.now()  # Prevent immediate recovery
            self._transition_to(BreakerState.OPEN)
    
    def _should_attempt_recovery(self) -> bool:
        """Check if enough time has passed to try recovery."""
        if not self._last_failure_time:
            return True
        elapsed = (datetime.now() - self._last_failure_time).total_seconds()
        return elapsed >= self.recovery_timeout
    
    def _transition_to(self, new_state: BreakerState):
        """Transition to a new state."""
        if new_state != self._state:
            self.logger.info(f"Circuit breaker: {self._state.value} → {new_state.value}")
            self._state = new_state
            self.stats.state_changes += 1
            
            if new_state == BreakerState.CLOSED:
                self._failure_count = 0
                self._success_count = 0
            elif new_state == BreakerState.HALF_OPEN:
                self._half_open_calls = 0
                self._success_count = 0
    
    @contextmanager
    def __call__(self):
        """Context manager for protected calls."""
        if not self.allow_request():
            raise CircuitBreakerOpen(f"Circuit breaker is {self.state.value}")
        
        try:
            yield
            self.record_success()
        except Exception as e:
            self.record_failure(e)
            raise
    
    def __enter__(self):
        """Enter context manager."""
        if not self.allow_request():
            raise CircuitBreakerOpen(f"Circuit breaker is {self.state.value}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        if exc_type is None:
            self.record_success()
        else:
            self.record_failure(exc_val)
        return False
    
    def protect(self, func: Callable) -> Callable:
        """Decorator to protect a function."""
        def wrapper(*args, **kwargs):
            with self:
                return func(*args, **kwargs)
        return wrapper


class CircuitBreakerOpen(Exception):
    """Raised when circuit breaker is open."""
    pass


class KillSwitch:
    """
    Global kill switch for agentic loops.
    
    Provides emergency stop capability across all loops.
    
    Usage:
        switch = KillSwitch()
        
        # In main loop
        if not switch.is_active:
            raise KillSwitchActivated("Emergency stop")
        
        # To activate
        switch.activate("Too many failures")
        
        # To check status
        print(switch.status)
    """
    
    _instance: Optional["KillSwitch"] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._active = True
        self._reason: Optional[str] = None
        self._activated_at: Optional[datetime] = None
        self._activation_history: List[Dict] = []
        self.logger = logging.getLogger("agentic_kit.killswitch")
        self._initialized = True
    
    @property
    def is_active(self) -> bool:
        """Check if system is active (kill switch NOT triggered)."""
        return self._active
    
    @property
    def status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "active": self._active,
            "reason": self._reason,
            "activated_at": self._activated_at.isoformat() if self._activated_at else None,
            "history_count": len(self._activation_history)
        }
    
    def activate(self, reason: str = "Manual activation"):
        """Activate the kill switch (stop all loops)."""
        self._active = False
        self._reason = reason
        self._activated_at = datetime.now()
        
        self._activation_history.append({
            "action": "activated",
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        })
        
        self.logger.critical(f"KILL SWITCH ACTIVATED: {reason}")
    
    def deactivate(self, reason: str = "Manual deactivation"):
        """Deactivate the kill switch (resume operations)."""
        self._active = True
        self._reason = None
        self._activated_at = None
        
        self._activation_history.append({
            "action": "deactivated",
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        })
        
        self.logger.info(f"Kill switch deactivated: {reason}")
    
    def check(self):
        """Check kill switch, raise if activated."""
        if not self._active:
            raise KillSwitchActivated(self._reason or "Kill switch is active")
    
    @classmethod
    def reset_singleton(cls):
        """Reset the singleton (for testing)."""
        cls._instance = None


class KillSwitchActivated(Exception):
    """Raised when kill switch is activated."""
    pass


class RateLimiter:
    """
    Rate limiter for agentic loops.
    
    Prevents runaway loops by limiting calls per time window.
    
    Usage:
        limiter = RateLimiter(max_calls=10, window_seconds=60)
        
        if limiter.allow():
            result = execute_action()
    """
    
    def __init__(self, max_calls: int = 100, window_seconds: int = 3600):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls: List[datetime] = []
        self._lock = threading.Lock()
    
    def allow(self) -> bool:
        """Check if call is allowed."""
        with self._lock:
            now = datetime.now()
            cutoff = now - timedelta(seconds=self.window_seconds)
            
            # Remove old calls
            self._calls = [t for t in self._calls if t > cutoff]
            
            if len(self._calls) >= self.max_calls:
                return False
            
            self._calls.append(now)
            return True
    
    def remaining(self) -> int:
        """Get remaining calls in current window."""
        with self._lock:
            now = datetime.now()
            cutoff = now - timedelta(seconds=self.window_seconds)
            self._calls = [t for t in self._calls if t > cutoff]
            return max(0, self.max_calls - len(self._calls))
    
    def reset(self):
        """Reset the rate limiter."""
        with self._lock:
            self._calls = []


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""
    pass


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=5)
    
    print("Circuit Breaker Demo")
    print("=" * 40)
    
    for i in range(5):
        try:
            with breaker:
                if i < 3:
                    raise Exception(f"Simulated failure {i+1}")
                print(f"Call {i+1} succeeded")
        except CircuitBreakerOpen as e:
            print(f"Call {i+1} rejected: {e}")
        except Exception as e:
            print(f"Call {i+1} failed: {e}")
    
    print(f"\nBreaker state: {breaker.state.value}")
    print(f"Stats: {breaker.stats}")
