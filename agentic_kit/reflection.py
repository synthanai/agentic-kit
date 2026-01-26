"""
Reflection Loop Extension

Adds post-action self-critique capability:
"Given this outcome, should we re-run?"

Usage:
    from agentic_kit import ReflectionLoop
    
    reflector = ReflectionLoop()
    result = reflector.evaluate(data, observation)
    
    if result.should_respar:
        print(f"Re-deliberation needed: {result.reason}")
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple, List, Optional, Callable
from enum import Enum


class ReflectionVerdict(Enum):
    """Result of reflection evaluation."""
    CONTINUE = "continue"     # Decision is working, proceed
    ADJUST = "adjust"         # Minor tweaks needed
    RESPAR = "respar"         # Significant issues, re-deliberate
    ESCALATE = "escalate"     # Human review needed


@dataclass
class ReflectionResult:
    """Result of reflection evaluation."""
    verdict: ReflectionVerdict
    confidence: float
    reason: str
    suggestions: List[str]
    should_respar: bool
    
    @classmethod
    def continue_decision(cls, reason: str = "Decision performing as expected"):
        return cls(
            verdict=ReflectionVerdict.CONTINUE,
            confidence=0.9,
            reason=reason,
            suggestions=[],
            should_respar=False
        )
    
    @classmethod
    def suggest_respar(cls, reason: str, suggestions: List[str] = None):
        return cls(
            verdict=ReflectionVerdict.RESPAR,
            confidence=0.7,
            reason=reason,
            suggestions=suggestions or ["Re-run with updated context"],
            should_respar=True
        )
    
    @classmethod
    def suggest_adjust(cls, reason: str, suggestions: List[str] = None):
        return cls(
            verdict=ReflectionVerdict.ADJUST,
            confidence=0.8,
            reason=reason,
            suggestions=suggestions or [],
            should_respar=False
        )


class ReflectionLoop:
    """
    Post-action reflection module.
    
    Evaluates whether a decision needs re-deliberation based on:
    - Outcome vs expectations
    - Failure patterns
    - Changed assumptions
    - Environmental changes
    
    Args:
        evaluator: Optional custom evaluator function
        confidence_drop_threshold: Threshold for triggering re-run (default: 0.3)
        failure_threshold: Number of failures before suggesting re-run (default: 2)
    """
    
    def __init__(
        self,
        evaluator: Optional[Callable[[Dict, Optional[Dict]], ReflectionResult]] = None,
        confidence_drop_threshold: float = 0.3,
        failure_threshold: int = 2
    ):
        self.evaluator = evaluator
        self.confidence_drop_threshold = confidence_drop_threshold
        self.failure_threshold = failure_threshold
    
    def evaluate(
        self,
        data: Dict[str, Any],
        observation: Optional[Dict[str, Any]] = None
    ) -> ReflectionResult:
        """
        Evaluate whether decision needs re-deliberation.
        
        Args:
            data: The decision/action data
            observation: Optional observation from execution
            
        Returns:
            ReflectionResult with verdict and suggestions
        """
        # Use custom evaluator if provided
        if self.evaluator:
            return self.evaluator(data, observation)
        
        # Default evaluation logic
        return self._default_evaluate(data, observation)
    
    def _default_evaluate(
        self,
        data: Dict[str, Any],
        observation: Optional[Dict[str, Any]] = None
    ) -> ReflectionResult:
        """Default evaluation logic."""
        issues = []
        suggestions = []
        
        # Check for explicit failure indicators
        if observation:
            # Check success flag
            if not observation.get("success", True):
                issues.append("Execution failed")
                suggestions.append("Review failure cause and retry")
            
            # Check for environment changes
            if observation.get("environment_changed", False):
                issues.append("Environment has significantly changed")
                suggestions.append("Re-evaluate with updated context")
            
            # Check confidence drop
            original_confidence = data.get("confidence", 0.7)
            actual_confidence = observation.get("actual_confidence", original_confidence)
            drop = original_confidence - actual_confidence
            
            if drop > self.confidence_drop_threshold:
                issues.append(f"Confidence dropped {drop:.0%}")
                suggestions.append("Recalibrate expectations")
        
        # Check for failure patterns in data
        failures = data.get("failures", [])
        if len(failures) >= self.failure_threshold:
            issues.append(f"{len(failures)} failures recorded")
            suggestions.append("Analyze failure patterns")
        
        # Check for explicit re-run flag
        if data.get("needs_rerun", False):
            issues.append("Re-run flag set")
            suggestions.append("Execute with updated parameters")
        
        # Determine overall verdict
        if len(issues) >= 2:
            return ReflectionResult(
                verdict=ReflectionVerdict.RESPAR,
                confidence=0.75,
                reason="; ".join(issues),
                suggestions=suggestions[:5],
                should_respar=True
            )
        elif len(issues) == 1:
            return ReflectionResult(
                verdict=ReflectionVerdict.ADJUST,
                confidence=0.8,
                reason=issues[0],
                suggestions=suggestions[:3],
                should_respar=False
            )
        else:
            return ReflectionResult.continue_decision()


class ConfidenceCalibration:
    """
    Track prediction accuracy over time to calibrate confidence.
    
    Usage:
        calibrator = ConfidenceCalibration()
        calibrator.record(predicted=0.8, actual_success=True)
        calibrator.record(predicted=0.7, actual_success=False)
        
        # Get calibrated confidence
        adjusted = calibrator.adjust(raw_confidence=0.8)
    """
    
    def __init__(self):
        self.records: List[Dict] = []
    
    def record(self, predicted: float, actual_success: bool):
        """Record a prediction and its outcome."""
        self.records.append({
            "predicted": predicted,
            "actual": 1.0 if actual_success else 0.0
        })
    
    def adjust(self, raw_confidence: float) -> float:
        """
        Adjust confidence based on historical accuracy.
        
        If we've been overconfident, this reduces the confidence.
        If we've been underconfident, this increases it.
        """
        if len(self.records) < 5:
            return raw_confidence
        
        avg_predicted = sum(r["predicted"] for r in self.records) / len(self.records)
        avg_actual = sum(r["actual"] for r in self.records) / len(self.records)
        
        bias = avg_predicted - avg_actual
        adjusted = raw_confidence - bias
        
        return max(0.1, min(0.95, adjusted))
    
    def accuracy_score(self) -> float:
        """Calculate accuracy score (higher is better)."""
        if not self.records:
            return 0.0
        
        mse = sum(
            (r["predicted"] - r["actual"]) ** 2
            for r in self.records
        ) / len(self.records)
        
        return 1.0 - mse
    
    def stats(self) -> Dict[str, Any]:
        """Return calibration statistics."""
        if not self.records:
            return {"records": 0}
        
        return {
            "records": len(self.records),
            "avg_predicted": sum(r["predicted"] for r in self.records) / len(self.records),
            "avg_actual": sum(r["actual"] for r in self.records) / len(self.records),
            "accuracy_score": self.accuracy_score()
        }


if __name__ == "__main__":
    # Demo
    sample_data = {
        "confidence": 0.8,
        "failures": ["f1", "f2"]
    }
    
    observation = {
        "success": False,
        "actual_confidence": 0.4
    }
    
    reflector = ReflectionLoop()
    result = reflector.evaluate(sample_data, observation)
    
    print(f"Verdict: {result.verdict.value}")
    print(f"Should re-run: {result.should_respar}")
    print(f"Reason: {result.reason}")
    print(f"Suggestions: {result.suggestions}")
