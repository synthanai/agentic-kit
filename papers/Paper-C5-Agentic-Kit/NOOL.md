# நூல் / NOOL — Agentic-Kit Software Paper (C5)

## நோக்கம் / Intent
1. Agentic AI frameworks lack production resilience patterns
2. Model fallback, circuit breaking, and session state are solved in web infrastructure but not in AI agent infrastructure
3. No open-source agent framework provides metacognitive telemetry (knowing what the agent knows about its own performance)

**Purpose:** Software engineering paper presenting Agentic-Kit's architecture patterns (OpenClaw: Unified Config, Graceful Degradation, Implicit Session, GAUGE Event Bus) as reusable infrastructure for production agentic systems.

## வடிவம் / Abstraction
**DESIGN SCIENCE + SOFTWARE ENGINEERING**: Present architecture patterns, demonstrate with working implementation, evaluate against resilience requirements.

### Key Patterns
| Pattern | Function |
|---------|----------|
| Unified Configuration | Single config object, environment-aware |
| Graceful Degradation | 3-tier model fallback chain |
| Implicit Session State | Context preserved without explicit session management |
| Circuit Breakers | Automatic failure isolation |
| GAUGE Event Bus | Metacognitive telemetry and learning signals |

## சங்கிலி / Chain
| Phase | Status |
|-------|--------|
| Manifesto + NOOL | ✅ |
| Research Req / Outline / Write | ⬜ |

> *நூல்: the thread that connects, the text that records, the classic that endures.*
