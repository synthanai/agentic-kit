# GAUGE Propagation Pattern

> **Pattern**: Event-driven insight propagation from GAUGE phase to all kits  
> **Status**: Specification (v1.0)

---

## Overview

The GAUGE phase in the Heptagon lifecycle produces retrospective insights. Today, these insights stay local to the DMG. The GAUGE Propagation Pattern defines how insights should flow to all kits to close the metacognitive learning loop.

## Problem

```
GAUGE completes → Insight generated → Stored in DMG → **END**
```

Insights don't update:
- SPAR personas (no learning from past debates)
- Vault access patterns (no learning from audit outcomes)
- Kural wisdom selection (no preference tuning)
- Agentic memory (no semantic update)
- Resonance thresholds (no calibration)

## Solution: Event-Driven Propagation

```
GAUGE completes → Insight generated → GAUGE_EVENT emitted → Kits subscribe
```

### GAUGE Event Schema

```javascript
{
  type: 'GAUGE_EVENT',
  timestamp: '2026-01-27T13:00:00Z',
  momentId: 'uuid',
  insight: {
    category: 'prediction_accuracy' | 'decision_quality' | 'process_efficiency',
    delta: number, // -1.0 to +1.0 change
    confidence: number, // 0.0 to 1.0
    summary: string
  },
  propagation: {
    target_kits: ['spar', 'vault', 'kural', 'resonance', 'agentic'],
    priority: 'high' | 'medium' | 'low'
  }
}
```

### Kit Subscription Handlers

| Kit | Handler | Effect |
|:----|:--------|:-------|
| **SPAR** | `onGaugeEvent` | Update persona effectiveness scores |
| **Vault** | `onGaugeEvent` | Adjust access pattern thresholds |
| **Kural** | `onGaugeEvent` | Tune wisdom relevance weights |
| **Resonance** | `onGaugeEvent` | Calibrate MERIT scoring baselines |
| **Agentic** | `onGaugeEvent` | Update SemanticMemory embeddings |

## Implementation Hooks

### 1. DMG Emitter (gauge-trigger.js)

```javascript
// After GAUGE phase completes
function emitGaugeEvent(moment, insight) {
  const event = buildGaugeEvent(moment, insight);
  eventBus.emit('GAUGE_EVENT', event);
}
```

### 2. Kit Subscriber (per kit)

```javascript
// In each kit's initialization
eventBus.on('GAUGE_EVENT', async (event) => {
  if (event.propagation.target_kits.includes('this-kit')) {
    await handleGaugeInsight(event.insight);
  }
});
```

### 3. Event Bus Options

- **In-process**: Node.js EventEmitter (same process)
- **Cross-process**: Redis Pub/Sub or NATS
- **Durable**: PostgreSQL LISTEN/NOTIFY or Kafka

## Flow Diagram

```
┌─────────┐     GAUGE_EVENT     ┌──────────────┐
│   DMG   │────────────────────▶│  Event Bus   │
│  GAUGE  │                     └──────┬───────┘
└─────────┘                            │
                                       ▼
        ┌──────────────────────────────┴───────────────────────────┐
        │                              │                           │
        ▼                              ▼                           ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│   SPAR-Kit    │            │  Resonance    │            │  Agentic-Kit  │
│ Update scores │            │ Calibrate     │            │ Update memory │
└───────────────┘            └───────────────┘            └───────────────┘
```

## Benefits

1. **Closed Loop**: Insights flow back to improve future decisions
2. **Loose Coupling**: Kits subscribe independently
3. **Selective Propagation**: Filter by kit and priority
4. **Auditability**: Events are logged for traceability

## Future Extensions

- **Cross-organization learning**: Aggregated GAUGE patterns across instances
- **Federated learning**: Privacy-preserving insight sharing
- **Adaptive thresholds**: MERIT scores auto-calibrate based on GAUGE history

---

*Pattern defined: 2026-01-27 | Part of SYNTHAI Ecosystem Connection Gaps work*
