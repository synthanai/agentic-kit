"""
Safety mechanisms for agentic loops.

Includes DestructiveCommandGuard for validating shell commands against
whitelist and blacklist patterns to prevent accidental data loss.
"""

import re
import logging
from typing import List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class GuardResult:
    """Result of a safety check."""
    safe: bool
    reason: Optional[str] = None
    suggestion: Optional[str] = None

class DestructiveCommandGuard:
    """
    Guards against destructive shell commands using regex pattern matching.
    
    Based on the destructive_command_guard (dcg) tool.
    See: https://github.com/Dicklesworthstone/destructive_command_guard
    """
    
    def __init__(self):
        self.logger = logging.getLogger("agentic_kit.safety")
        
        # Compiled regex patterns
        # Whitelist - commands that are explicitly allowed even if they look dangerous
        self.whitelist_patterns = [
            re.compile(r"git\s+checkout\s+-b\s+"),
            re.compile(r"git\s+checkout\s+--orphan\s+"),
            re.compile(r"git\s+restore\s+--staged\s+"),
            re.compile(r"git\s+restore\s+-S\s+"),
            re.compile(r"git\s+clean\s+-n\b"),
            re.compile(r"git\s+clean\s+--dry-run\b"),
            # Temp directory cleanups are usually safe
            re.compile(r"rm\s+(-r|-rf|-fr)\s+/tmp/.*"),
            re.compile(r"rm\s+(-r|-rf|-fr)\s+\$TMPDIR/.*"),
        ]
        
        # Blacklist - commands that are known to be destructive
        self.blacklist_patterns = [
            # Git destructive
            (re.compile(r"git\s+reset\s+--hard"), "Hard reset destroys uncommitted changes"),
            (re.compile(r"git\s+reset\s+--merge"), "Merge reset can lose data"),
            (re.compile(r"git\s+checkout\s+--\s+"), "Checkout file discard changes"),
            (re.compile(r"git\s+restore\s+(?!--staged|-S)"), "Restore modifies working tree"),
            (re.compile(r"git\s+clean\s+-f"), "Clean force destroys untracked files"),
            (re.compile(r"git\s+push\s+.*(--force|-f)"), "Force push rewrites remote history"),
            (re.compile(r"git\s+branch\s+-D"), "Force delete branch drops commits"),
            (re.compile(r"git\s+stash\s+drop"), "Stash drop permanently removes stash"),
            (re.compile(r"git\s+stash\s+clear"), "Stash clear removes all stashes"),
            
            # Filesystem destructive
            (re.compile(r"rm\s+(-r|-rf|-fr)\s+/?$"), "Recursive delete of root is dangerous"),
            (re.compile(r"rm\s+(-r|-rf|-fr)\s+/[^/]+$"), "Recursive delete of top-level dirs is dangerous"),
            (re.compile(r"rm\s+(-r|-rf|-fr)\s+.*"), "Recursive delete is dangerous"),
        ]

    def is_safe(self, command: str) -> GuardResult:
        """
        Check if a command is safe to execute.
        
        Returns:
            GuardResult object with safe boolean and optional reason/suggestion.
        """
        command = command.strip()
        
        # 1. Check whitelist first (Allow specific patterns)
        for pattern in self.whitelist_patterns:
            if pattern.search(command):
                return GuardResult(safe=True)
                
        # 2. Check blacklist (Block dangerous patterns)
        for pattern, reason in self.blacklist_patterns:
            if pattern.search(command):
                return GuardResult(
                    safe=False,
                    reason=f"Blocked by DestructiveCommandGuard: {reason}"
                )
                
        # 3. Default safe if no blacklist match
        return GuardResult(safe=True)

    def check(self, command: str):
        """
        Raise exception if command is unsafe.
        
        Args:
            command: The command string to check.
            
        Raises:
            UnsafeCommandError: If the command is deemed unsafe.
        """
        result = self.is_safe(command)
        if not result.safe:
            self.logger.warning(f"Blocked unsafe command: '{command}' - {result.reason}")
            raise UnsafeCommandError(result.reason or "Command blocked by safety guard")

class UnsafeCommandError(Exception):
    """Raised when a command fails safety checks."""
    pass
