# OpenClaw Configuration Standard for SYNTHAI Tools

## Overview
This specification defines the unified configuration structure for all SYNTHAI tools,
following Peter Steinberger's configuration layering pattern.

## Precedence Order (Highest to Lowest)

```
1. CLI Flags           --model gpt-5.2
2. Environment Vars    ARIVAR_MODEL=gemini-3
3. Credentials File    ~/.arivar/credentials
4. Config File         ~/.arivar/config.json
5. Built-in Defaults
```

## Directory Structure

All SYNTHAI tools MUST follow this structure:

```
~/.arivar/                      # Tool-specific directory
├── config.json                 # User preferences (JSONC supported)
├── credentials                 # API keys (chmod 600, never logged)
├── sessions/                   # Implicit session state
│   ├── session_<timestamp>_<random>.json
│   └── ...
└── logs/
    └── arivar.log              # Structured JSON logs

~/.arangam/                     # Same structure
~/.resonance-kit/               # Same structure
~/.vault-kit/                   # Same structure
```

## Config Schema (config.json)

```jsonc
{
    // Model configuration
    "models": {
        "default": "claude-opus-4",
        "fallback_chain": [
            "anthropic/claude-opus-4",
            "openai/gpt-5.2-pro",
            "google/gemini-3-pro",
            "ollama/llama-3.1-70b"
        ],
        "ollama_base_url": "http://localhost:11434"
    },
    
    // Session configuration
    "sessions": {
        "auto_cleanup_hours": 24,
        "max_stored": 50,
        "implicit_mode": true
    },
    
    // Logging configuration
    "logging": {
        "level": "info",  // debug, info, warn, error
        "format": "json", // json, text
        "path": "~/.arivar/logs/arivar.log"
    },
    
    // Tool-specific settings
    "debate": {
        "default_depth": "DEEP",
        "default_rounds": 3,
        "merit_threshold": 0.7
    }
}
```

## Credentials Schema (credentials)

Plain key-value format, chmod 600:

```ini
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
OLLAMA_HOST=http://localhost:11434
```

## Session Schema (sessions/*.json)

```json
{
    "session_id": "session_20260131_174500_a1b2c3",
    "created_at": "2026-01-31T17:45:00Z",
    "updated_at": "2026-01-31T17:46:30Z",
    "tool": "arivar",
    "state": {
        "debate_id": "deb_xyz123",
        "current_turn": 3,
        "personas_invoked": ["strategist", "sentinel"],
        "checkpoint": {
            "phase": "SPAR",
            "transcript_lines": 42
        }
    },
    "metadata": {
        "topic": "AI governance",
        "depth": "ULTRA",
        "model": "claude-opus-4"
    }
}
```

## Environment Variables

All tools recognize these standard environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `ARIVAR_MODEL` | Override default model | `claude-opus-4` |
| `ARIVAR_SESSION` | Explicit session ID | `session_abc123` |
| `ARIVAR_DEBUG` | Enable debug logging | `1` |
| `ARIVAR_CONFIG` | Custom config path | `~/.config/arivar.json` |

## CLI Flag Standards

```bash
# Common flags across all tools
--model, -m        Override model
--session, -s      Explicit session ID
--verbose, -v      Debug logging
--json             JSON output mode
--config           Custom config path
--dry-run          Preview without execution

# Entity-Action pattern
arivar debate start --topic "..."
arivar debate resume --from checkpoint
arivar persona invoke --name strategist
arivar gate check --standard merit
arivar commit publish --format markdown
```

## Implementation Requirements

### Config Loading Order

```python
def load_config() -> Config:
    config = DEFAULT_CONFIG.copy()
    
    # 5. Built-in defaults (already in config)
    
    # 4. Config file
    config_path = Path.home() / ".arivar" / "config.json"
    if config_path.exists():
        config.update(load_jsonc(config_path))
    
    # 3. Credentials file
    creds_path = Path.home() / ".arivar" / "credentials"
    if creds_path.exists():
        config["credentials"] = load_credentials(creds_path)
    
    # 2. Environment variables
    for key in ["MODEL", "SESSION", "DEBUG"]:
        env_val = os.getenv(f"ARIVAR_{key}")
        if env_val:
            config[key.lower()] = env_val
    
    # 1. CLI flags (applied at runtime)
    
    return config
```

### Session Management

```python
def get_current_session() -> Optional[Session]:
    """Return most recent session for implicit state."""
    sessions_dir = Path.home() / ".arivar" / "sessions"
    sessions = sorted(sessions_dir.glob("session_*.json"), reverse=True)
    if sessions:
        return Session.load(sessions[0])
    return None

def create_session(**kwargs) -> Session:
    """Create new session with auto-generated ID."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    random_suffix = uuid.uuid4().hex[:6]
    session_id = f"session_{timestamp}_{random_suffix}"
    return Session(session_id=session_id, **kwargs)
```

## Compatibility Matrix

| Tool | Config Version | Status |
|------|----------------|--------|
| arivar | 1.0 | 🔄 Implementing |
| arangam | 1.0 | 📋 Planned |
| resonance-kit | 1.0 | 📋 Planned |
| vault-kit | 1.0 | 📋 Planned |
| kural-kit | 1.0 | 📋 Planned |

---

*Spec Version: 1.0*  
*Based on: OpenClaw Configuration Layering Pattern*  
*Status: Phase 1 Implementation*
