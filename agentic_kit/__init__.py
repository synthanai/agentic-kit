"""
agentic-kit: Reusable agentic infrastructure for AI decision systems.

Modules:
- memory: Semantic memory with embedding-based retrieval
- dispatchers: Pluggable action execution backends
- circuit_breaker: Safety mechanisms (circuit breakers, kill switches, rate limiters)
- reflection: Post-action self-critique and re-deliberation
"""

from agentic_kit.memory import (
    SemanticMemoryStore,
    SimpleMemoryStore,
    StoredItem,
)
from agentic_kit.dispatchers import (
    ActionDispatcher,
    LoggingDispatcher,
    HttpDispatcher,
    DryRunDispatcher,
    CompositeDispatcher,
    Action,
    Observation,
    ActionType,
    create_dispatcher,
)
from agentic_kit.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpen,
    KillSwitch,
    KillSwitchActivated,
    RateLimiter,
    RateLimitExceeded,
    BreakerState,
)
from agentic_kit.reflection import (
    ReflectionLoop,
    ReflectionResult,
    ReflectionVerdict,
    ConfidenceCalibration,
)

__version__ = "0.1.0"
__all__ = [
    # Memory
    "SemanticMemoryStore",
    "SimpleMemoryStore", 
    "StoredItem",
    # Dispatchers
    "ActionDispatcher",
    "LoggingDispatcher",
    "HttpDispatcher",
    "DryRunDispatcher",
    "CompositeDispatcher",
    "Action",
    "Observation",
    "ActionType",
    "create_dispatcher",
    # Circuit Breaker
    "CircuitBreaker",
    "CircuitBreakerOpen",
    "KillSwitch",
    "KillSwitchActivated",
    "RateLimiter",
    "RateLimitExceeded",
    "BreakerState",
    # Reflection
    "ReflectionLoop",
    "ReflectionResult",
    "ReflectionVerdict",
    "ConfidenceCalibration",
]
