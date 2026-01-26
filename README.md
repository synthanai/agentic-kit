# agentic-kit

> **Reusable agentic infrastructure for AI decision systems.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

---

## What is agentic-kit?

**agentic-kit** provides battle-tested primitives for building reliable AI agent systems:

- 🧠 **Semantic Memory** — Embedding-based retrieval with fallback to keywords
- 🚀 **Action Dispatchers** — Pluggable execution backends (logging, HTTP, dry-run)
- 🔒 **Circuit Breakers** — Automatic failure handling and rate limiting
- 🔄 **Reflection Loops** — Post-action self-critique and re-deliberation

---

## Installation

```bash
pip install agentic-kit

# With optional dependencies
pip install agentic-kit[embeddings]  # For semantic memory
pip install agentic-kit[http]        # For HTTP dispatchers
pip install agentic-kit[all]         # Everything
```

---

## Quick Start

### Semantic Memory

```python
from agentic_kit import SemanticMemoryStore

store = SemanticMemoryStore()
store.add({"id": "decision-001", "question": "Should we migrate?", "answer": "Yes"})

# Query similar decisions
similar = store.query("migration strategy", limit=5)
```

### Action Dispatchers

```python
from agentic_kit import LoggingDispatcher, DryRunDispatcher

# Log actions without side effects
dispatcher = LoggingDispatcher()
result = dispatcher.execute({"action": "deploy", "target": "production"})

# Simulate with configurable success rate
dry_run = DryRunDispatcher(success_rate=0.9)
```

### Circuit Breakers

```python
from agentic_kit import CircuitBreaker, RateLimiter

breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)

with breaker:
    result = risky_operation()

# Rate limiting
limiter = RateLimiter(max_calls=100, window_seconds=3600)
if limiter.allow():
    execute_action()
```

### Reflection Loop

```python
from agentic_kit import ReflectionLoop

reflector = ReflectionLoop()
result = reflector.evaluate(decision_data, observation)

if result.should_respar:
    print(f"Re-deliberation needed: {result.reason}")
```

---

## Module Reference

| Module | Classes | Purpose |
|--------|---------|---------|
| `memory` | `SemanticMemoryStore`, `SimpleMemoryStore` | Decision/context retrieval |
| `dispatchers` | `LoggingDispatcher`, `HttpDispatcher`, `DryRunDispatcher`, `CompositeDispatcher` | Action execution |
| `circuit_breaker` | `CircuitBreaker`, `KillSwitch`, `RateLimiter` | Safety mechanisms |
| `reflection` | `ReflectionLoop`, `ConfidenceCalibration` | Post-action analysis |

---

## Used By

- [DMG (Decision Moment Graph)](https://github.com/synthanai/decision-moment-graph) — Decision governance standard
- [VAULT-KIT](https://github.com/synthanai/vault-kit) — Privacy-first crisis coordination

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — see [LICENSE](LICENSE).

**Trademark**: "agentic-kit" is a trademark of SYNTHAI TECH PTY LTD.

---

## The Philosophy

> Agents need infrastructure, not just prompts.
> agentic-kit provides the primitives so you can focus on the logic.

Built by [SYNTHAI](https://synthai.tech) — Decision Intelligence for the AI Era.
