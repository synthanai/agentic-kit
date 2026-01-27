"""
agentic-kit: Reusable agentic infrastructure for AI decision systems.

Modules:
- memory: Semantic memory with embedding-based retrieval
- dispatchers: Pluggable action execution backends
- circuit_breaker: Safety mechanisms (circuit breakers, kill switches, rate limiters)
- reflection: Post-action self-critique and re-deliberation
- context7_bridge: Integration with Context7 for versioned library docs (optional)
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

# Optional: Context7 integration (graceful degradation if unavailable)
try:
    from agentic_kit.context7_bridge import (
        Context7Client,
        LibraryInfo,
        LibraryDocs,
        get_library_docs_sync,
        context7_available,
    )
    _CONTEXT7_AVAILABLE = True
except ImportError:
    _CONTEXT7_AVAILABLE = False
    Context7Client = None
    LibraryInfo = None
    LibraryDocs = None
    get_library_docs_sync = None
    context7_available = lambda: False

__version__ = "0.2.0"
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
    # Context7 Bridge (optional)
    "Context7Client",
    "LibraryInfo",
    "LibraryDocs",
    "get_library_docs_sync",
    "context7_available",
]
