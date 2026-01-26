"""Tests for agentic_kit.dispatchers module."""

import pytest
import logging

from agentic_kit.dispatchers import (
    LoggingDispatcher,
    DryRunDispatcher,
    CompositeDispatcher,
    Action,
    ActionType,
    Observation,
    create_dispatcher
)


class TestAction:
    """Tests for Action dataclass."""
    
    def test_create_action(self):
        """Test creating an action."""
        action = Action(
            action_type=ActionType.LOG,
            payload={"key": "value"},
            target="test"
        )
        
        assert action.action_type == ActionType.LOG
        assert action.payload == {"key": "value"}
        assert action.target == "test"
    
    def test_from_dict(self):
        """Test creating action from dict."""
        action = Action.from_dict({"foo": "bar"})
        
        assert action.action_type == ActionType.LOG
        assert action.payload == {"foo": "bar"}
        assert "created_at" in action.metadata


class TestObservation:
    """Tests for Observation dataclass."""
    
    def test_create_observation(self):
        """Test creating an observation."""
        obs = Observation(
            summary="Test",
            success=True,
            metrics={"count": 1}
        )
        
        assert obs.summary == "Test"
        assert obs.success is True
        assert obs.get_metric("count") == 1
    
    def test_validates_method(self):
        """Test validates method."""
        success_obs = Observation(summary="OK", success=True)
        fail_obs = Observation(summary="Fail", success=False)
        
        assert success_obs.validates("any") is True
        assert fail_obs.validates("any") is False


class TestLoggingDispatcher:
    """Tests for LoggingDispatcher."""
    
    def test_can_execute_any(self):
        """Test that logging dispatcher can execute any action."""
        dispatcher = LoggingDispatcher()
        
        for action_type in ActionType:
            action = Action(action_type=action_type, payload={})
            assert dispatcher.can_execute(action) is True
    
    def test_execute_dict(self):
        """Test executing with dict input."""
        dispatcher = LoggingDispatcher()
        result = dispatcher.execute({"action": "test"})
        
        assert result.success is True
        assert "logged" in result.summary.lower()
    
    def test_execute_action(self):
        """Test executing with Action input."""
        dispatcher = LoggingDispatcher()
        action = Action(action_type=ActionType.LOG, payload={"test": True})
        
        result = dispatcher.execute(action)
        
        assert result.success is True
        assert len(dispatcher.executed_actions) == 1
    
    def test_rollback(self):
        """Test rollback removes action."""
        dispatcher = LoggingDispatcher()
        action = Action(action_type=ActionType.LOG, payload={})
        
        dispatcher.execute(action)
        assert len(dispatcher.executed_actions) == 1
        
        assert dispatcher.rollback(action) is True
        assert len(dispatcher.executed_actions) == 0
    
    def test_rollback_nonexistent(self):
        """Test rollback of non-executed action."""
        dispatcher = LoggingDispatcher()
        action = Action(action_type=ActionType.LOG, payload={})
        
        assert dispatcher.rollback(action) is False


class TestDryRunDispatcher:
    """Tests for DryRunDispatcher."""
    
    def test_always_success(self):
        """Test 100% success rate."""
        dispatcher = DryRunDispatcher(success_rate=1.0, latency_ms=10)
        
        for _ in range(10):
            result = dispatcher.execute({"test": True})
            assert result.success is True
    
    def test_always_failure(self):
        """Test 0% success rate."""
        dispatcher = DryRunDispatcher(success_rate=0.0, latency_ms=10)
        
        for _ in range(10):
            result = dispatcher.execute({"test": True})
            assert result.success is False
    
    def test_records_actions(self):
        """Test that actions are recorded."""
        dispatcher = DryRunDispatcher()
        
        dispatcher.execute({"action": 1})
        dispatcher.execute({"action": 2})
        
        assert len(dispatcher.simulated_actions) == 2
    
    def test_rollback_always_succeeds(self):
        """Test rollback in dry run mode."""
        dispatcher = DryRunDispatcher()
        action = Action(action_type=ActionType.LOG, payload={})
        
        assert dispatcher.rollback(action) is True


class TestCompositeDispatcher:
    """Tests for CompositeDispatcher."""
    
    def test_uses_first_success(self):
        """Test that first successful dispatcher is used."""
        failing = DryRunDispatcher(success_rate=0.0, latency_ms=10)
        succeeding = DryRunDispatcher(success_rate=1.0, latency_ms=10)
        
        composite = CompositeDispatcher([failing, succeeding])
        result = composite.execute({"test": True})
        
        assert result.success is True
    
    def test_can_execute_any_child_can(self):
        """Test can_execute checks all children."""
        dispatcher = CompositeDispatcher([LoggingDispatcher()])
        action = Action(action_type=ActionType.LOG, payload={})
        
        assert dispatcher.can_execute(action) is True
    
    def test_returns_last_error_on_all_fail(self):
        """Test that last error is returned if all fail."""
        failing1 = DryRunDispatcher(success_rate=0.0, latency_ms=10)
        failing2 = DryRunDispatcher(success_rate=0.0, latency_ms=10)
        
        composite = CompositeDispatcher([failing1, failing2])
        result = composite.execute({"test": True})
        
        assert result.success is False


class TestCreateDispatcher:
    """Tests for create_dispatcher factory."""
    
    def test_create_logging(self):
        """Test creating logging dispatcher."""
        dispatcher = create_dispatcher({"type": "logging"})
        assert isinstance(dispatcher, LoggingDispatcher)
    
    def test_create_dry_run(self):
        """Test creating dry run dispatcher."""
        dispatcher = create_dispatcher({
            "type": "dry_run",
            "success_rate": 0.5
        })
        assert isinstance(dispatcher, DryRunDispatcher)
        assert dispatcher.success_rate == 0.5
    
    def test_unknown_type_raises(self):
        """Test that unknown type raises error."""
        with pytest.raises(ValueError):
            create_dispatcher({"type": "unknown"})
