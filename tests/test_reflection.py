"""Tests for agentic_kit.reflection module."""

import pytest

from agentic_kit.reflection import (
    ReflectionLoop,
    ReflectionResult,
    ReflectionVerdict,
    ConfidenceCalibration
)


class TestReflectionResult:
    """Tests for ReflectionResult."""
    
    def test_continue_decision(self):
        """Test continue_decision factory."""
        result = ReflectionResult.continue_decision("All good")
        
        assert result.verdict == ReflectionVerdict.CONTINUE
        assert result.should_respar is False
        assert result.confidence == 0.9
    
    def test_suggest_respar(self):
        """Test suggest_respar factory."""
        result = ReflectionResult.suggest_respar(
            "Problems detected",
            ["Fix A", "Fix B"]
        )
        
        assert result.verdict == ReflectionVerdict.RESPAR
        assert result.should_respar is True
        assert len(result.suggestions) == 2
    
    def test_suggest_adjust(self):
        """Test suggest_adjust factory."""
        result = ReflectionResult.suggest_adjust("Minor issue")
        
        assert result.verdict == ReflectionVerdict.ADJUST
        assert result.should_respar is False


class TestReflectionLoop:
    """Tests for ReflectionLoop."""
    
    def test_default_evaluation_no_issues(self):
        """Test default evaluation with no issues."""
        reflector = ReflectionLoop()
        result = reflector.evaluate({}, None)
        
        assert result.verdict == ReflectionVerdict.CONTINUE
        assert result.should_respar is False
    
    def test_failed_execution_suggests_adjust(self):
        """Test failed execution suggests adjustment."""
        reflector = ReflectionLoop()
        
        result = reflector.evaluate(
            {},
            {"success": False}
        )
        
        assert result.verdict in (ReflectionVerdict.ADJUST, ReflectionVerdict.RESPAR)
    
    def test_environment_change_detected(self):
        """Test environment change is detected."""
        reflector = ReflectionLoop()
        
        result = reflector.evaluate(
            {},
            {"environment_changed": True}
        )
        
        assert "environment" in result.reason.lower()
    
    def test_confidence_drop_detected(self):
        """Test confidence drop is detected."""
        reflector = ReflectionLoop(confidence_drop_threshold=0.2)
        
        result = reflector.evaluate(
            {"confidence": 0.9},
            {"actual_confidence": 0.5}
        )
        
        assert "confidence" in result.reason.lower()
    
    def test_failure_threshold(self):
        """Test failure threshold triggers adjustment."""
        reflector = ReflectionLoop(failure_threshold=2)
        
        result = reflector.evaluate(
            {"failures": ["f1", "f2", "f3"]},
            None
        )
        
        assert "failures" in result.reason.lower()
    
    def test_multiple_issues_triggers_respar(self):
        """Test multiple issues trigger re-spar."""
        reflector = ReflectionLoop()
        
        result = reflector.evaluate(
            {"failures": ["f1", "f2"]},
            {"success": False, "environment_changed": True}
        )
        
        assert result.should_respar is True
    
    def test_custom_evaluator(self):
        """Test custom evaluator function."""
        def always_respar(data, obs):
            return ReflectionResult.suggest_respar("Custom reason")
        
        reflector = ReflectionLoop(evaluator=always_respar)
        result = reflector.evaluate({}, None)
        
        assert result.should_respar is True
        assert result.reason == "Custom reason"
    
    def test_needs_rerun_flag(self):
        """Test needs_rerun flag is respected."""
        reflector = ReflectionLoop()
        
        result = reflector.evaluate(
            {"needs_rerun": True},
            None
        )
        
        assert "re-run" in result.reason.lower()


class TestConfidenceCalibration:
    """Tests for ConfidenceCalibration."""
    
    def test_initial_empty(self):
        """Test initial state."""
        calibrator = ConfidenceCalibration()
        
        assert calibrator.stats()["records"] == 0
    
    def test_record_predictions(self):
        """Test recording predictions."""
        calibrator = ConfidenceCalibration()
        
        calibrator.record(predicted=0.8, actual_success=True)
        calibrator.record(predicted=0.7, actual_success=False)
        
        assert calibrator.stats()["records"] == 2
    
    def test_adjust_with_insufficient_data(self):
        """Test adjust returns raw confidence with insufficient data."""
        calibrator = ConfidenceCalibration()
        
        calibrator.record(0.8, True)
        calibrator.record(0.8, True)
        
        # Less than 5 records
        assert calibrator.adjust(0.8) == 0.8
    
    def test_adjust_removes_overconfidence_bias(self):
        """Test adjustment for overconfidence."""
        calibrator = ConfidenceCalibration()
        
        # Simulate overconfidence: predict 0.9, but only 50% success
        for _ in range(5):
            calibrator.record(predicted=0.9, actual_success=True)
        for _ in range(5):
            calibrator.record(predicted=0.9, actual_success=False)
        
        adjusted = calibrator.adjust(0.9)
        
        # Should be reduced
        assert adjusted < 0.9
    
    def test_accuracy_score(self):
        """Test accuracy score calculation."""
        calibrator = ConfidenceCalibration()
        
        # Perfect calibration
        calibrator.record(predicted=1.0, actual_success=True)
        calibrator.record(predicted=0.0, actual_success=False)
        
        assert calibrator.accuracy_score() == 1.0
    
    def test_accuracy_score_empty(self):
        """Test accuracy score with no records."""
        calibrator = ConfidenceCalibration()
        
        assert calibrator.accuracy_score() == 0.0
    
    def test_adjust_clamps_result(self):
        """Test adjust clamps to valid range."""
        calibrator = ConfidenceCalibration()
        
        # Create extreme bias
        for _ in range(10):
            calibrator.record(predicted=0.1, actual_success=True)
        
        # Even with extreme adjustment, should clamp
        adjusted = calibrator.adjust(0.5)
        
        assert 0.1 <= adjusted <= 0.95
    
    def test_stats_averages(self):
        """Test stats returns correct averages."""
        calibrator = ConfidenceCalibration()
        
        calibrator.record(predicted=0.8, actual_success=True)
        calibrator.record(predicted=0.6, actual_success=False)
        
        stats = calibrator.stats()
        
        assert stats["avg_predicted"] == 0.7
        assert stats["avg_actual"] == 0.5
