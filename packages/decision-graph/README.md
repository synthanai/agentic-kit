# @synthai/decision-graph

Interactive graph visualization for DMG decision moments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

TypeScript types and React components for visualizing decision moments in the DMG (Decision Moment Graph) lifecycle. Adapted from [supermemory/memory-graph](https://github.com/supermemoryai/supermemory/tree/main/packages/memory-graph).

## Installation

```bash
npm install @synthai/decision-graph
# or
bun add @synthai/decision-graph
```

## Quick Start

```tsx
import type { DecisionNode, DeliberationEdge, DecisionGraphProps } from '@synthai/decision-graph';

const nodes: DecisionNode[] = [
  {
    id: 'decision-1',
    type: 'decision',
    phase: 'FRAME',
    title: 'Strategic Platform Choice',
    meritScore: 85,
    timestamp: new Date(),
    x: 0, y: 0, size: 50, color: '#3b82f6',
    isHovered: false, isDragging: false,
  },
];

const edges: DeliberationEdge[] = [
  {
    id: 'edge-1',
    source: 'decision-1',
    target: 'decision-2',
    edgeType: 'consequence',
    color: '#6366f1',
    visualProps: { opacity: 0.8, thickness: 2, glow: 0, pulseDuration: 0 },
  },
];
```

## Types

### Node Types

| Type | Description |
|------|-------------|
| `DecisionNode` | Decision moment with DMG phase |
| `DeliberationNode` | SPAR deliberation session |
| `ActionNode` | ENACT phase action |
| `OutcomeNode` | GAUGE phase outcome |

### DMG Phases

```typescript
type DMGPhase = 'FRAME' | 'SPAR' | 'GATE' | 'COMMIT' | 'ENACT' | 'YIELD' | 'GAUGE';
```

### Edge Types

```typescript
type EdgeType = 'consequence' | 'alternative' | 'escalation' | 'dependency' | 'sparLink';
```

## Tech Stack

- **Physics**: d3-force for force-directed layout
- **Animation**: motion (Framer Motion)
- **Rendering**: Canvas 2D (for performance)
- **Types**: Full TypeScript support

## Requirements

- React 18+
- Modern browser with Canvas support

## License

MIT

## Links

- [DMG Standard](https://github.com/synthanai/decision-moment-graph)
- [Agentic-Kit](https://github.com/synthanai/agentic-kit)
- [SYNTHAI](https://synthanai.github.io)
