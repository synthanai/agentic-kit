/**
 * Decision Graph Types
 * 
 * TypeScript types for visualizing DMG decision moments.
 * Adapted from supermemory's memory-graph package.
 * 
 * @see https://github.com/supermemoryai/supermemory/tree/main/packages/memory-graph
 */

// =============================================================================
// Core Node Types
// =============================================================================

/**
 * DMG lifecycle phases (7-step Heptagon)
 */
export type DMGPhase =
    | 'FRAME'   // Define the decision context
    | 'SPAR'    // Structured persona deliberation
    | 'GATE'    // Threshold checks
    | 'COMMIT'  // Final decision commitment
    | 'ENACT'   // Execute the decision
    | 'YIELD'   // Handoff/completion
    | 'GAUGE';  // Measure outcomes

/**
 * Node types in the decision graph
 */
export type NodeType = 'decision' | 'deliberation' | 'action' | 'outcome';

/**
 * Base graph node (d3-force compatible)
 */
export interface GraphNode {
    id: string;
    x: number;
    y: number;
    size: number;
    color: string;
    isHovered: boolean;
    isDragging: boolean;
    // D3-force simulation properties
    vx?: number;  // velocity x
    vy?: number;  // velocity y
    fx?: number | null;  // fixed x (pinning)
    fy?: number | null;  // fixed y (pinning)
}

/**
 * Decision node with DMG phase information
 */
export interface DecisionNode extends GraphNode {
    type: 'decision';
    phase: DMGPhase;
    title: string;
    description?: string;
    meritScore: number;  // MERIT compliance score (0-100)
    timestamp: Date;
    metadata?: {
        confidenceLevel?: number;
        reversibility?: 'low' | 'medium' | 'high';
        stakeholders?: string[];
        tags?: string[];
    };
}

/**
 * Deliberation node (SPAR session)
 */
export interface DeliberationNode extends GraphNode {
    type: 'deliberation';
    sparSessionId: string;
    personas: string[];
    outcome: 'consensus' | 'majority' | 'no-consensus' | 'pending';
    rounds: number;
}

/**
 * Action node (ENACT phase)
 */
export interface ActionNode extends GraphNode {
    type: 'action';
    actionType: 'execute' | 'delegate' | 'defer' | 'cancel';
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    actor?: string;
}

/**
 * Outcome node (GAUGE phase)
 */
export interface OutcomeNode extends GraphNode {
    type: 'outcome';
    success: boolean;
    metrics?: Record<string, number>;
    feedback?: string;
}

// =============================================================================
// Edge Types
// =============================================================================

/**
 * Edge relationship types
 */
export type EdgeType =
    | 'consequence'  // Decision leads to outcome
    | 'alternative'  // Alternative decision path
    | 'escalation'   // Escalated decision
    | 'dependency'   // Depends on another decision
    | 'sparLink';    // Link to SPAR deliberation

/**
 * Base graph edge (d3-force compatible)
 */
export interface GraphEdge {
    id: string;
    source: string | GraphNode;  // D3 mutates to node refs
    target: string | GraphNode;
    color: string;
    visualProps: {
        opacity: number;
        thickness: number;
        glow: number;
        pulseDuration: number;
    };
}

/**
 * Deliberation edge with SPAR reference
 */
export interface DeliberationEdge extends GraphEdge {
    edgeType: EdgeType;
    sparReference?: string;  // Link to SPAR session ID
    weight?: number;  // Relationship strength (0-1)
    label?: string;
}

// =============================================================================
// Component Props (React-compatible)
// =============================================================================

/**
 * Props for the DecisionGraph React component
 */
export interface DecisionGraphProps {
    /** Decision nodes to display */
    nodes: (DecisionNode | DeliberationNode | ActionNode | OutcomeNode)[];
    /** Edges connecting nodes */
    edges: DeliberationEdge[];
    /** Loading state */
    isLoading?: boolean;
    /** Error to display */
    error?: Error | null;
    /** Highlighted node IDs */
    highlightNodeIds?: string[];
    /** Selected phase filter */
    phaseFilter?: DMGPhase | 'all';
    /** Callback when node is clicked */
    onNodeClick?: (nodeId: string) => void;
    /** Callback when node is hovered */
    onNodeHover?: (nodeId: string | null) => void;
    /** Visual variant */
    variant?: 'full' | 'compact' | 'embedded';
    /** Theme class name */
    themeClassName?: string;
    /** Canvas dimensions */
    width?: number;
    height?: number;
}

/**
 * Props for zoom/pan controls
 */
export interface ControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
    onPhaseFilter?: (phase: DMGPhase | 'all') => void;
    currentPhase?: DMGPhase | 'all';
}

/**
 * Props for the legend component
 */
export interface LegendProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    variant?: 'full' | 'compact';
}

// =============================================================================
// Canvas/Rendering Types
// =============================================================================

/**
 * Props for the graph canvas component
 */
export interface GraphCanvasProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    panX: number;
    panY: number;
    zoom: number;
    width: number;
    height: number;
    onNodeHover: (nodeId: string | null) => void;
    onNodeClick: (nodeId: string) => void;
    onNodeDragStart: (nodeId: string, e: MouseEvent) => void;
    onNodeDragMove: (e: MouseEvent) => void;
    onNodeDragEnd: () => void;
    onPanStart: (e: MouseEvent) => void;
    onPanMove: (e: MouseEvent) => void;
    onPanEnd: () => void;
    onWheel: (e: WheelEvent) => void;
    draggingNodeId: string | null;
    highlightNodeIds?: string[];
    selectedNodeId?: string | null;
    isSimulationActive?: boolean;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Phase colors matching DMS visual identity
 */
export const PHASE_COLORS: Record<DMGPhase, string> = {
    FRAME: '#3b82f6',   // Blue - conceptualization
    SPAR: '#8b5cf6',    // Purple - deliberation
    GATE: '#f59e0b',    // Amber - threshold
    COMMIT: '#10b981',  // Green - commitment
    ENACT: '#6366f1',   // Indigo - execution
    YIELD: '#14b8a6',   // Teal - handoff
    GAUGE: '#06b6d4',   // Cyan - measurement
};

/**
 * Node type icons (emoji for quick prototyping)
 */
export const NODE_ICONS: Record<NodeType, string> = {
    decision: '⚖️',
    deliberation: '💬',
    action: '⚡',
    outcome: '📊',
};
