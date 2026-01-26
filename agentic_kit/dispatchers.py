"""
Action Dispatcher Protocol & Implementations

Provides the interface and implementations for executing actions
in various backends: logging, HTTP, dry-run, composite.

Usage:
    from agentic_kit import LoggingDispatcher, HttpDispatcher
    
    # Simple logging (for testing)
    dispatcher = LoggingDispatcher()
    
    # HTTP API calls
    dispatcher = HttpDispatcher(base_url="https://api.example.com")
    
    result = dispatcher.execute({"action": "deploy", "target": "prod"})
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from enum import Enum
import json
import logging
import time

# Try to import requests, fall back gracefully
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class ActionType(Enum):
    """Types of actions that can be dispatched."""
    LOG = "log"
    HTTP_POST = "http_post"
    HTTP_GET = "http_get"
    SHELL = "shell"
    WEBHOOK = "webhook"
    CUSTOM = "custom"


@dataclass
class Action:
    """Represents an action to be executed."""
    action_type: ActionType
    payload: Dict[str, Any]
    target: str = ""
    timeout: int = 30
    retries: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], action_type: ActionType = ActionType.LOG) -> "Action":
        """Create an action from a dictionary."""
        return cls(
            action_type=action_type,
            payload=data,
            metadata={
                "created_at": datetime.now().isoformat()
            }
        )


@dataclass
class Observation:
    """Result of executing an action."""
    summary: str
    success: bool
    metrics: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat() + "Z")
    raw_response: Any = None
    duration_ms: int = 0
    
    def get_metric(self, name: str) -> Any:
        """Get a specific metric value."""
        return self.metrics.get(name)
    
    def validates(self, claim: str) -> bool:
        """Check if observation validates a claim."""
        return self.success


class ActionDispatcher(ABC):
    """
    Protocol for action execution backends.
    
    Implementations handle specific execution strategies:
    - LoggingDispatcher: Just logs (for testing)
    - HttpDispatcher: Makes HTTP requests
    - DryRunDispatcher: Simulates execution
    - CompositeDispatcher: Chains multiple dispatchers
    """
    
    @abstractmethod
    def can_execute(self, action: Action) -> bool:
        """Check if this dispatcher can handle this action type."""
        pass
    
    @abstractmethod
    def execute(self, action_or_data: Any) -> Observation:
        """
        Execute an action and return observation.
        
        Can accept either an Action object or a dict directly.
        """
        pass
    
    @abstractmethod
    def rollback(self, action: Action) -> bool:
        """Attempt to reverse an action. Returns True if successful."""
        pass


class LoggingDispatcher(ActionDispatcher):
    """
    Dispatcher that logs actions without side effects.
    
    Ideal for:
    - Testing and development
    - Dry-run mode
    - Audit trail generation
    """
    
    def __init__(self, log_file: Optional[str] = None):
        self.log_file = log_file
        self.logger = logging.getLogger("agentic_kit.dispatcher")
        self.executed_actions: List[Action] = []
    
    def can_execute(self, action: Action) -> bool:
        """Logging dispatcher can handle any action type."""
        return True
    
    def execute(self, action_or_data: Any) -> Observation:
        """Log the action and return successful observation."""
        start = time.time()
        
        if isinstance(action_or_data, dict):
            action = Action.from_dict(action_or_data)
        else:
            action = action_or_data
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "action_type": action.action_type.value,
            "target": action.target,
            "payload": action.payload,
            "metadata": action.metadata
        }
        
        self.logger.info(f"ACTION: {json.dumps(log_entry, indent=2)}")
        
        if self.log_file:
            with open(self.log_file, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        
        self.executed_actions.append(action)
        
        duration = int((time.time() - start) * 1000)
        
        return Observation(
            summary=f"Action logged: {action.action_type.value}",
            success=True,
            metrics={"actions_logged": len(self.executed_actions)},
            duration_ms=duration
        )
    
    def rollback(self, action: Action) -> bool:
        """Remove action from log (symbolic rollback)."""
        if action in self.executed_actions:
            self.executed_actions.remove(action)
            self.logger.info(f"ROLLBACK: {action.action_type.value}")
            return True
        return False


class HttpDispatcher(ActionDispatcher):
    """
    Dispatcher that makes HTTP requests.
    
    Usage:
        dispatcher = HttpDispatcher(
            base_url="https://api.example.com",
            headers={"Authorization": "Bearer xxx"}
        )
    """
    
    def __init__(
        self,
        base_url: str = "",
        headers: Optional[Dict[str, str]] = None,
        verify_ssl: bool = True
    ):
        if not HAS_REQUESTS:
            raise ImportError("requests library required for HttpDispatcher. Install with: pip install agentic-kit[http]")
        
        self.base_url = base_url.rstrip("/")
        self.headers = headers or {"Content-Type": "application/json"}
        self.verify_ssl = verify_ssl
        self.logger = logging.getLogger("agentic_kit.http")
    
    def can_execute(self, action: Action) -> bool:
        """HTTP dispatcher handles HTTP action types."""
        return action.action_type in (ActionType.HTTP_POST, ActionType.HTTP_GET, ActionType.WEBHOOK)
    
    def execute(self, action_or_data: Any) -> Observation:
        """Make HTTP request and return observation."""
        start = time.time()
        
        if isinstance(action_or_data, dict):
            action = Action.from_dict(action_or_data, ActionType.HTTP_POST)
        else:
            action = action_or_data
        
        url = action.target if action.target.startswith("http") else f"{self.base_url}/{action.target}"
        
        try:
            if action.action_type == ActionType.HTTP_GET:
                response = requests.get(
                    url,
                    headers=self.headers,
                    timeout=action.timeout,
                    verify=self.verify_ssl
                )
            else:
                response = requests.post(
                    url,
                    json=action.payload,
                    headers=self.headers,
                    timeout=action.timeout,
                    verify=self.verify_ssl
                )
            
            duration = int((time.time() - start) * 1000)
            success = response.status_code < 400
            
            return Observation(
                summary=f"HTTP {response.status_code}: {response.reason}",
                success=success,
                metrics={
                    "status_code": response.status_code,
                    "response_length": len(response.content)
                },
                raw_response=response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
                duration_ms=duration
            )
            
        except requests.Timeout:
            return Observation(
                summary=f"Request timed out after {action.timeout}s",
                success=False,
                metrics={"error": "timeout"},
                duration_ms=action.timeout * 1000
            )
        except requests.RequestException as e:
            return Observation(
                summary=f"Request failed: {str(e)}",
                success=False,
                metrics={"error": str(e)},
                duration_ms=int((time.time() - start) * 1000)
            )
    
    def rollback(self, action: Action) -> bool:
        """HTTP rollback not supported by default."""
        self.logger.warning(f"HTTP rollback not implemented for {action.target}")
        return False


class DryRunDispatcher(ActionDispatcher):
    """
    Dispatcher that simulates execution without side effects.
    
    Useful for:
    - Testing the full execution loop
    - Validating logic without side effects
    - Generating "what would happen" reports
    """
    
    def __init__(self, success_rate: float = 1.0, latency_ms: int = 100):
        self.success_rate = success_rate
        self.latency_ms = latency_ms
        self.simulated_actions: List[Dict] = []
    
    def can_execute(self, action: Action) -> bool:
        """Dry run can simulate any action."""
        return True
    
    def execute(self, action_or_data: Any) -> Observation:
        """Simulate execution with configurable success rate."""
        import random
        
        if isinstance(action_or_data, dict):
            action = Action.from_dict(action_or_data)
        else:
            action = action_or_data
        
        # Simulate latency
        time.sleep(self.latency_ms / 1000)
        
        # Determine success based on rate
        success = random.random() < self.success_rate
        
        self.simulated_actions.append({
            "action": action.payload,
            "success": success,
            "timestamp": datetime.now().isoformat()
        })
        
        return Observation(
            summary=f"[DRY RUN] {'Success' if success else 'Simulated failure'}",
            success=success,
            metrics={
                "simulated": True,
                "success_rate": self.success_rate
            },
            duration_ms=self.latency_ms
        )
    
    def rollback(self, action: Action) -> bool:
        """Always succeeds in dry run mode."""
        return True


class CompositeDispatcher(ActionDispatcher):
    """
    Chains multiple dispatchers with fallback.
    
    Usage:
        composite = CompositeDispatcher([
            HttpDispatcher(base_url="https://primary.api"),
            HttpDispatcher(base_url="https://fallback.api"),
            LoggingDispatcher()  # Final fallback
        ])
    """
    
    def __init__(self, dispatchers: List[ActionDispatcher]):
        self.dispatchers = dispatchers
        self.logger = logging.getLogger("agentic_kit.composite")
    
    def can_execute(self, action: Action) -> bool:
        """Can execute if any child dispatcher can."""
        return any(d.can_execute(action) for d in self.dispatchers)
    
    def execute(self, action_or_data: Any) -> Observation:
        """Try each dispatcher in order until one succeeds."""
        if isinstance(action_or_data, dict):
            action = Action.from_dict(action_or_data)
        else:
            action = action_or_data
        
        last_error = None
        
        for dispatcher in self.dispatchers:
            if dispatcher.can_execute(action):
                try:
                    result = dispatcher.execute(action)
                    if result.success:
                        return result
                    last_error = result
                except Exception as e:
                    self.logger.warning(f"Dispatcher failed: {e}")
                    last_error = Observation(
                        summary=f"Dispatcher error: {str(e)}",
                        success=False
                    )
        
        return last_error or Observation(
            summary="No dispatcher could handle action",
            success=False
        )
    
    def rollback(self, action: Action) -> bool:
        """Try rollback on all dispatchers."""
        return any(d.rollback(action) for d in self.dispatchers)


def create_dispatcher(config: Dict[str, Any]) -> ActionDispatcher:
    """
    Factory function to create dispatcher from config.
    
    Config examples:
        {"type": "logging", "log_file": "/tmp/actions.log"}
        {"type": "http", "base_url": "https://api.example.com"}
        {"type": "dry_run", "success_rate": 0.9}
    """
    dispatcher_type = config.get("type", "logging")
    
    if dispatcher_type == "logging":
        return LoggingDispatcher(log_file=config.get("log_file"))
    elif dispatcher_type == "http":
        return HttpDispatcher(
            base_url=config.get("base_url", ""),
            headers=config.get("headers"),
            verify_ssl=config.get("verify_ssl", True)
        )
    elif dispatcher_type == "dry_run":
        return DryRunDispatcher(
            success_rate=config.get("success_rate", 1.0),
            latency_ms=config.get("latency_ms", 100)
        )
    else:
        raise ValueError(f"Unknown dispatcher type: {dispatcher_type}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    dispatcher = LoggingDispatcher()
    
    action = Action(
        action_type=ActionType.LOG,
        payload={"decision": "Migrate to microservices", "confidence": 0.72},
        target="decision-log"
    )
    
    result = dispatcher.execute(action)
    print(f"✅ Result: {result.summary}")
    print(f"   Success: {result.success}")
    print(f"   Duration: {result.duration_ms}ms")
