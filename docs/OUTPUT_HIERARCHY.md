# SYNTHAI Output Hierarchy Standard

> **BMAD Pattern**: Unified Output Location  
> All tools write to consistent paths for easy artifact retrieval.

---

## Base Directory

```
~/.synthai/
```

**Rationale**: User-level directory that persists across projects, following XDG conventions.

---

## Hierarchy Structure

```
~/.synthai/
├── config/                    # Global configuration
│   ├── providers.yaml         # LLM provider settings
│   ├── personas.yaml          # Custom persona overrides
│   └── fallback-chain.yaml    # Model fallback configuration
│
├── sessions/                  # Active session state
│   ├── current.json           # Current session pointer
│   └── {session-id}/          # Session-specific state
│       ├── context.json       # Accumulated context
│       └── decisions.json     # DMS decision log
│
├── research/                  # Research workflow outputs
│   └── {topic}_{date}/
│       ├── output.md          # Main research document
│       ├── sources.json       # Collected sources
│       └── debate.json        # SPAR validation debate
│
├── writing/                   # Writing workflow outputs
│   └── {topic}_{date}/
│       ├── draft.md           # Current draft
│       ├── revisions/         # Version history
│       └── feedback.json      # SPAR feedback
│
├── debates/                   # SPARKIT debate outputs
│   └── {topic}_{date}/
│       ├── transcript.md      # Human-readable transcript
│       ├── debate.json        # Structured debate data
│       └── synthesis.md       # Final synthesis
│
├── reviews/                   # Review workflow outputs
│   └── {topic}_{date}/
│       ├── report.md          # Review report
│       ├── findings.json      # Structured findings
│       └── recommendations.md
│
├── knowledge/                 # Knowledge extraction outputs
│   └── {domain}_{date}/
│       ├── ki.md              # Generated Knowledge Item
│       ├── interview.md       # ENCORES transcript
│       └── validation.json    # SPAR validation
│
├── logs/                      # System logs
│   ├── router.log             # 3-layer routing decisions
│   ├── gauge.log              # GAUGE event stream
│   └── errors.log             # Error tracking
│
└── cache/                     # Ephemeral cache
    ├── personas/              # Pre-extracted personas
    ├── workflows/             # Parsed workflow definitions
    └── context/               # Recent context snapshots
```

---

## Naming Conventions

| Component | Format | Example |
|-----------|--------|---------|
| Topic slug | lowercase, underscores | `bmad_integration` |
| Date | ISO 8601 short | `2026-01-31` |
| Session ID | UUID v4 | `ef5f7eb9-af3d-4b64-938a-dd588435ccd3` |
| Revision | Increment | `v1`, `v2`, `v3` |

---

## File Formats

| Extension | Purpose |
|-----------|---------|
| `.md` | Human-readable documents |
| `.json` | Structured data, machine-readable |
| `.yaml` | Configuration files |
| `.log` | Append-only logs |

---

## Integration Points

### ARIVAR Router

```javascript
import { generateOutputPath } from 'agentic-kit/arivar-mcp/three-layer-router.js';

const path = generateOutputPath('research', 'bmad integration');
// Returns: ~/.synthai/research/bmad_integration_2026-01-31/
```

### GAUGE Event Bus

```javascript
import { emitGaugeEvent } from 'agentic-kit/gauge.js';

emitGaugeEvent('artifact.created', {
    path: '~/.synthai/research/bmad_integration_2026-01-31/output.md',
    type: 'research',
    confidence: 0.85
});
```

### VAULT-KIT Protected Paths

Sensitive outputs use VAULT references:

```markdown
## Acknowledgments
See [vault://acknowledgments/personal](vault://acknowledgments/personal)
```

---

## Migration

For existing outputs in project directories:

```bash
# Symlink project-local outputs to unified hierarchy
ln -s ~/.synthai/research ./research-outputs
```

---

## References

- [BMAD Unified Output Pattern](https://bennycheung.github.io/harmonizing-two-ai-agent-systems)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
