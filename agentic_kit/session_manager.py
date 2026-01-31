"""
OpenClaw Session Management for ARIVAR

Implements implicit session state tracking following Peter Steinberger's pattern.
Commands automatically use the latest session without explicit session IDs.

Author: SYNTHAI Team
Version: 1.0.0
"""

import json
import uuid
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


@dataclass
class SessionCheckpoint:
    """Checkpoint state within a session."""
    phase: str = "INIT"  # INIT, FRAME, SPAR, GATE, COMMIT, RETRO
    turn: int = 0
    transcript_lines: int = 0
    last_persona: Optional[str] = None
    custom_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SessionMetadata:
    """Session metadata for filtering and display."""
    topic: Optional[str] = None
    depth: str = "DEEP"
    model: Optional[str] = None
    panel: Optional[str] = None
    tags: List[str] = field(default_factory=list)


@dataclass
class Session:
    """
    ARIVAR session for implicit state tracking.
    
    Sessions are stored as JSON files in ~/.arivar/sessions/
    and are automatically cleaned up after 24 hours.
    """
    session_id: str
    tool: str = "arivar"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    checkpoint: SessionCheckpoint = field(default_factory=SessionCheckpoint)
    metadata: SessionMetadata = field(default_factory=SessionMetadata)
    state: Dict[str, Any] = field(default_factory=dict)
    
    def touch(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "session_id": self.session_id,
            "tool": self.tool,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "checkpoint": asdict(self.checkpoint),
            "metadata": asdict(self.metadata),
            "state": self.state,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Session":
        """Create session from dictionary."""
        checkpoint = SessionCheckpoint(**data.get("checkpoint", {}))
        metadata = SessionMetadata(**data.get("metadata", {}))
        return cls(
            session_id=data["session_id"],
            tool=data.get("tool", "arivar"),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
            checkpoint=checkpoint,
            metadata=metadata,
            state=data.get("state", {}),
        )
    
    def save(self, sessions_dir: Optional[Path] = None) -> Path:
        """Save session to disk."""
        if sessions_dir is None:
            sessions_dir = Path.home() / ".arivar" / "sessions"
        sessions_dir.mkdir(parents=True, exist_ok=True)
        
        self.touch()
        path = sessions_dir / f"{self.session_id}.json"
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
        logger.debug(f"Session saved: {path}")
        return path
    
    @classmethod
    def load(cls, path: Path) -> "Session":
        """Load session from file."""
        with open(path) as f:
            data = json.load(f)
        return cls.from_dict(data)


class SessionManager:
    """
    Manages ARIVAR sessions with implicit state tracking.
    
    Key behaviors:
    - Commands without --session flag use the most recent session
    - Sessions auto-expire after 24 hours
    - Session state persists across CLI invocations
    """
    
    def __init__(
        self,
        tool: str = "arivar",
        sessions_dir: Optional[Path] = None,
        auto_cleanup_hours: int = 24,
        max_sessions: int = 50,
    ):
        self.tool = tool
        self.sessions_dir = sessions_dir or Path.home() / f".{tool}" / "sessions"
        self.auto_cleanup_hours = auto_cleanup_hours
        self.max_sessions = max_sessions
        self._current: Optional[Session] = None
        
        # Ensure sessions directory exists
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
    
    def create(
        self,
        topic: Optional[str] = None,
        depth: str = "DEEP",
        model: Optional[str] = None,
        **kwargs,
    ) -> Session:
        """
        Create a new session.
        
        Auto-generates session ID in format: session_<timestamp>_<random>
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        random_suffix = uuid.uuid4().hex[:6]
        session_id = f"session_{timestamp}_{random_suffix}"
        
        session = Session(
            session_id=session_id,
            tool=self.tool,
            metadata=SessionMetadata(
                topic=topic,
                depth=depth,
                model=model,
            ),
            state=kwargs,
        )
        
        session.save(self.sessions_dir)
        self._current = session
        
        logger.info(f"Created session: {session_id}")
        return session
    
    def get_current(self) -> Optional[Session]:
        """
        Get the current (most recent) session.
        
        This is the core of implicit session tracking:
        - If no explicit session is specified, use the most recent one
        - Returns None if no sessions exist
        """
        if self._current is not None:
            return self._current
        
        # Find most recent session file
        sessions = sorted(
            self.sessions_dir.glob("session_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        
        if sessions:
            self._current = Session.load(sessions[0])
            return self._current
        
        return None
    
    def get_by_id(self, session_id: str) -> Optional[Session]:
        """Get session by explicit ID."""
        path = self.sessions_dir / f"{session_id}.json"
        if path.exists():
            return Session.load(path)
        return None
    
    def update_current(self, **updates) -> Optional[Session]:
        """Update the current session with new data."""
        session = self.get_current()
        if session is None:
            logger.warning("No current session to update")
            return None
        
        # Update state
        session.state.update(updates)
        session.save(self.sessions_dir)
        return session
    
    def set_checkpoint(
        self,
        phase: str,
        turn: int = 0,
        transcript_lines: int = 0,
        last_persona: Optional[str] = None,
        **custom_data,
    ) -> Optional[Session]:
        """Set checkpoint on current session."""
        session = self.get_current()
        if session is None:
            logger.warning("No current session for checkpoint")
            return None
        
        session.checkpoint = SessionCheckpoint(
            phase=phase,
            turn=turn,
            transcript_lines=transcript_lines,
            last_persona=last_persona,
            custom_data=custom_data,
        )
        session.save(self.sessions_dir)
        return session
    
    def list_sessions(self, limit: int = 10) -> List[Session]:
        """List recent sessions."""
        sessions = sorted(
            self.sessions_dir.glob("session_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )[:limit]
        
        return [Session.load(p) for p in sessions]
    
    def cleanup_old_sessions(self) -> int:
        """Remove sessions older than auto_cleanup_hours."""
        cutoff = datetime.now() - timedelta(hours=self.auto_cleanup_hours)
        removed = 0
        
        for path in self.sessions_dir.glob("session_*.json"):
            try:
                session = Session.load(path)
                updated = datetime.fromisoformat(session.updated_at)
                if updated < cutoff:
                    path.unlink()
                    removed += 1
                    logger.debug(f"Removed old session: {path.name}")
            except Exception as e:
                logger.warning(f"Error checking session {path}: {e}")
        
        # Also enforce max_sessions limit
        sessions = sorted(
            self.sessions_dir.glob("session_*.json"),
            key=lambda p: p.stat().st_mtime,
        )
        while len(sessions) > self.max_sessions:
            oldest = sessions.pop(0)
            oldest.unlink()
            removed += 1
            logger.debug(f"Removed excess session: {oldest.name}")
        
        if removed:
            logger.info(f"Cleaned up {removed} old sessions")
        
        return removed
    
    def resume_from_checkpoint(
        self,
        session_id: Optional[str] = None,
    ) -> Optional[Session]:
        """
        Resume from a checkpoint.
        
        If session_id is None, uses current session.
        """
        if session_id:
            session = self.get_by_id(session_id)
        else:
            session = self.get_current()
        
        if session is None:
            logger.warning("No session to resume")
            return None
        
        if session.checkpoint.phase:
            logger.info(
                f"Resuming {session.session_id} from phase {session.checkpoint.phase}, "
                f"turn {session.checkpoint.turn}"
            )
        
        self._current = session
        return session


# Global session manager instance (singleton pattern)
_session_manager: Optional[SessionManager] = None


def get_session_manager(tool: str = "arivar") -> SessionManager:
    """Get or create the global session manager."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager(tool=tool)
        _session_manager.cleanup_old_sessions()
    return _session_manager


# Convenience functions for CLI integration
def current_session() -> Optional[Session]:
    """Get current session (implicit state)."""
    return get_session_manager().get_current()


def create_session(**kwargs) -> Session:
    """Create new session."""
    return get_session_manager().create(**kwargs)


def checkpoint(phase: str, **kwargs) -> Optional[Session]:
    """Set checkpoint on current session."""
    return get_session_manager().set_checkpoint(phase, **kwargs)


def resume(session_id: Optional[str] = None) -> Optional[Session]:
    """Resume from checkpoint."""
    return get_session_manager().resume_from_checkpoint(session_id)
