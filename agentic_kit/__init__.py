"""
agentic-kit: Reusable agentic infrastructure for AI decision systems.

Modules:
- memory: Semantic memory with embedding-based retrieval
- dispatchers: Pluggable action execution backends
- circuit_breaker: Safety mechanisms (circuit breakers, kill switches, rate limiters)
- reflection: Post-action self-critique and re-deliberation
- context7_bridge: Integration with Context7 for versioned library docs (optional)
- model_fallback: OpenClaw graceful degradation across LLM providers
- session_manager: OpenClaw implicit session state tracking
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

# OpenClaw Pattern Implementations
from agentic_kit.model_fallback import (
    invoke_with_fallback,
    arivar_invoke,
    ModelConfig,
    ModelProvider,
    FallbackError,
    load_fallback_chain_from_config,
    DEFAULT_FALLBACK_CHAIN,
)
from agentic_kit.session_manager import (
    Session,
    SessionManager,
    SessionCheckpoint,
    SessionMetadata,
    get_session_manager,
    current_session,
    create_session,
    checkpoint,
    resume,
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

__version__ = "0.3.0"  # Bump for OpenClaw integration
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
    # OpenClaw: Model Fallback
    "invoke_with_fallback",
    "arivar_invoke",
    "ModelConfig",
    "ModelProvider",
    "FallbackError",
    "load_fallback_chain_from_config",
    "DEFAULT_FALLBACK_CHAIN",
    # OpenClaw: Session Manager
    "Session",
    "SessionManager",
    "SessionCheckpoint",
    "SessionMetadata",
    "get_session_manager",
    "current_session",
    "create_session",
    "checkpoint",
    "resume",
]

