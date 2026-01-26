"""Tests for agentic_kit.circuit_breaker module."""

import pytest
import time
import threading

from agentic_kit.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpen,
    KillSwitch,
    KillSwitchActivated,
    RateLimiter,
    RateLimitExceeded,
    BreakerState
)


class TestCircuitBreaker:
    """Tests for CircuitBreaker."""
    
    def test_initial_state_closed(self):
        """Test initial state is closed."""
        breaker = CircuitBreaker()
        assert breaker.state == BreakerState.CLOSED
    
    def test_allows_request_when_closed(self):
        """Test requests allowed when closed."""
        breaker = CircuitBreaker()
        assert breaker.allow_request() is True
    
    def test_opens_after_threshold(self):
        """Test breaker opens after failure threshold."""
        breaker = CircuitBreaker(failure_threshold=3)
        
        for _ in range(3):
            breaker.record_failure()
        
        assert breaker.state == BreakerState.OPEN
    
    def test_rejects_when_open(self):
        """Test requests rejected when open."""
        breaker = CircuitBreaker(failure_threshold=1)
        breaker.record_failure()
        
        assert breaker.allow_request() is False
    
    def test_context_manager_success(self):
        """Test context manager records success."""
        breaker = CircuitBreaker()
        
        with breaker:
            pass  # Success
        
        assert breaker.stats.successful_calls == 1
    
    def test_context_manager_failure(self):
        """Test context manager records failure."""
        breaker = CircuitBreaker(failure_threshold=5)
        
        try:
            with breaker:
                raise ValueError("Test error")
        except ValueError:
            pass
        
        assert breaker.stats.failed_calls == 1
    
    def test_context_manager_raises_when_open(self):
        """Test context manager raises when open."""
        breaker = CircuitBreaker(failure_threshold=1)
        breaker.record_failure()
        
        with pytest.raises(CircuitBreakerOpen):
            with breaker:
                pass
    
    def test_reset(self):
        """Test manual reset."""
        breaker = CircuitBreaker(failure_threshold=1)
        breaker.record_failure()
        
        assert breaker.state == BreakerState.OPEN
        
        breaker.reset()
        
        assert breaker.state == BreakerState.CLOSED
    
    def test_force_open(self):
        """Test force open."""
        breaker = CircuitBreaker(recovery_timeout=9999)  # Long timeout to prevent auto-recovery
        breaker.force_open()
        
        assert breaker.state == BreakerState.OPEN
    
    def test_decorator(self):
        """Test protect decorator."""
        breaker = CircuitBreaker()
        
        @breaker.protect
        def my_func():
            return "success"
        
        result = my_func()
        
        assert result == "success"
        assert breaker.stats.successful_calls == 1
    
    def test_half_open_after_recovery(self):
        """Test transition to half-open after recovery timeout."""
        breaker = CircuitBreaker(failure_threshold=1, recovery_timeout=9999)
        breaker.record_failure()
        
        assert breaker.state == BreakerState.OPEN
        
        # Manually set recovery timeout to 0 to trigger transition
        breaker.recovery_timeout = 0
        time.sleep(0.1)
        assert breaker.state == BreakerState.HALF_OPEN
    
    def test_exclude_exceptions(self):
        """Test excluded exceptions don't count as failures."""
        breaker = CircuitBreaker(failure_threshold=1, exclude_exceptions=(ValueError,))
        
        breaker.record_failure(ValueError("ignored"))
        
        assert breaker.state == BreakerState.CLOSED


class TestKillSwitch:
    """Tests for KillSwitch."""
    
    def setup_method(self):
        """Reset singleton before each test."""
        KillSwitch.reset_singleton()
    
    def test_singleton(self):
        """Test singleton pattern."""
        switch1 = KillSwitch()
        switch2 = KillSwitch()
        
        assert switch1 is switch2
    
    def test_initially_active(self):
        """Test switch is active by default."""
        switch = KillSwitch()
        assert switch.is_active is True
    
    def test_activate(self):
        """Test activation."""
        switch = KillSwitch()
        switch.activate("Test reason")
        
        assert switch.is_active is False
        assert switch.status["reason"] == "Test reason"
    
    def test_deactivate(self):
        """Test deactivation."""
        switch = KillSwitch()
        switch.activate("Test")
        switch.deactivate("All clear")
        
        assert switch.is_active is True
        assert switch.status["reason"] is None
    
    def test_check_raises_when_active(self):
        """Test check raises when activated."""
        switch = KillSwitch()
        switch.activate("Emergency")
        
        with pytest.raises(KillSwitchActivated):
            switch.check()
    
    def test_check_passes_when_inactive(self):
        """Test check passes when not activated."""
        switch = KillSwitch()
        switch.check()  # Should not raise
    
    def test_history(self):
        """Test activation history is recorded."""
        switch = KillSwitch()
        switch.activate("First")
        switch.deactivate("Resume")
        switch.activate("Second")
        
        assert switch.status["history_count"] == 3


class TestRateLimiter:
    """Tests for RateLimiter."""
    
    def test_allows_within_limit(self):
        """Test allows calls within limit."""
        limiter = RateLimiter(max_calls=5, window_seconds=60)
        
        for _ in range(5):
            assert limiter.allow() is True
    
    def test_rejects_over_limit(self):
        """Test rejects calls over limit."""
        limiter = RateLimiter(max_calls=3, window_seconds=60)
        
        for _ in range(3):
            limiter.allow()
        
        assert limiter.allow() is False
    
    def test_remaining(self):
        """Test remaining count."""
        limiter = RateLimiter(max_calls=5, window_seconds=60)
        
        assert limiter.remaining() == 5
        
        limiter.allow()
        limiter.allow()
        
        assert limiter.remaining() == 3
    
    def test_reset(self):
        """Test reset clears calls."""
        limiter = RateLimiter(max_calls=3, window_seconds=60)
        
        for _ in range(3):
            limiter.allow()
        
        assert limiter.allow() is False
        
        limiter.reset()
        
        assert limiter.allow() is True
    
    def test_window_expiry(self):
        """Test calls expire after window."""
        limiter = RateLimiter(max_calls=1, window_seconds=0)  # 0 second window
        
        limiter.allow()
        time.sleep(0.1)
        
        # Call should have expired
        assert limiter.allow() is True
