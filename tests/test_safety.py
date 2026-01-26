"""Tests for agentic_kit.safety module."""

import pytest
from agentic_kit.safety import DestructiveCommandGuard, UnsafeCommandError

class TestDestructiveCommandGuard:
    """Tests for DestructiveCommandGuard."""
    
    def setup_method(self):
        self.guard = DestructiveCommandGuard()
    
    def test_safe_commands_pass(self):
        """Test that benign commands pass."""
        assert self.guard.is_safe("ls -la").safe
        assert self.guard.is_safe("echo 'hello'").safe
        assert self.guard.is_safe("cat file.txt").safe
        assert self.guard.is_safe("git status").safe
    
    def test_whitelisted_destructive_pass(self):
        """Test that whitelisted patterns pass."""
        # Git whitelist
        assert self.guard.is_safe("git checkout -b new-branch").safe
        assert self.guard.is_safe("git checkout --orphan new-branch").safe
        assert self.guard.is_safe("git restore --staged file.txt").safe
        assert self.guard.is_safe("git clean -n").safe
        
        # Filesystem whitelist
        assert self.guard.is_safe("rm -rf /tmp/junk").safe
        assert self.guard.is_safe("rm -rf $TMPDIR/cache").safe
    
    def test_blacklisted_destructive_fail(self):
        """Test that blacklisted patterns fail."""
        # Git blacklist
        assert not self.guard.is_safe("git reset --hard HEAD").safe
        assert not self.guard.is_safe("git push origin master --force").safe
        assert not self.guard.is_safe("git push -f origin").safe
        assert not self.guard.is_safe("git clean -f").safe
        assert not self.guard.is_safe("git stash drop").safe
        
        # Filesystem blacklist
        assert not self.guard.is_safe("rm -rf /").safe
        assert not self.guard.is_safe("rm -rf /usr").safe
        assert not self.guard.is_safe("rm -rf ./project").safe
        
        # Verify reason is populated
        result = self.guard.is_safe("git reset --hard")
        assert not result.safe
        assert "Hard reset" in result.reason
    
    def test_check_raises_exception(self):
        """Test that check() raises UnsafeCommandError."""
        with pytest.raises(UnsafeCommandError) as exc:
            self.guard.check("rm -rf /")
        
        assert "Blocked" in str(exc.value)

    def test_lookahead_logic(self):
        """Test specific regex lookahead logic for restore."""
        # restore without --staged should block
        assert not self.guard.is_safe("git restore file.txt").safe
        
        # restore with --staged should pass (via whitelist)
        assert self.guard.is_safe("git restore --staged file.txt").safe
