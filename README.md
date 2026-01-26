# agentic-kit

> **Reusable agentic infrastructure for AI decision systems.**  
> *Agents need infrastructure, not just prompts.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

---

## What is agentic-kit?

**agentic-kit** is the **Standard Infrastructure** for building reliable AI agent systems.
It provides the battle-tested primitives you need to move from "demo" to "production":

- 🧠 **Semantic Memory** — Embedding-based retrieval with fallback to keywords
- 🚀 **Action Dispatchers** — Pluggable execution backends (logging, HTTP, dry-run)
- 🔒 **Circuit Breakers** — Automatic failure handling and rate limiting
- 🔄 **Reflection Loops** — Post-action self-critique and re-deliberation

---

## Installation

```bash
pip install agentic-kit
# Options: [embeddings], [http], [all]
```

## Quick Start

### Semantic Memory

```python
from agentic_kit import SemanticMemoryStore
store = SemanticMemoryStore()
store.add({"id": "1", "text": "Deploy to prod"})
print(store.query("deployment"))
```

---

## Module Reference

| Module | Classes | Purpose |
|--------|---------|---------|
| `memory` | `SemanticMemoryStore` | Context retrieval |
| `dispatchers` | `LoggingDispatcher` | Safe execution |
| `circuit_breaker` | `CircuitBreaker` | Loop safety |
| `reflection` | `ReflectionLoop` | Self-correction |

---

## The SYNTHAI Ecosystem

| Component | Role |
| :--- | :--- |
| **[Decision Moment Graph](https://github.com/synthanai/decision-moment-graph)** | The **Standard** for reversible, auditable decisions. |
| **[VAULT-KIT](https://github.com/synthanai/vault-kit)** | The **Protocol** for privacy-first coordination. |
| **[agentic-kit](https://github.com/synthanai/agentic-kit)** | The **Infrastructure** for reliable agent systems. |

> *Built by [SYNTHAI](https://synthai.tech) — Decision Intelligence for the AI Era.*

