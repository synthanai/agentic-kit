/**
 * Abstraction of Thought (AoT) Module
 * 
 * Implements Benny Cheung's AoT framework for enhanced reasoning.
 * Core insight: Abstraction-of-Thought > Chain-of-Thought
 * 
 * Step S_i = {A¹_i, A²_i, ..., Aᵏ_i}
 * Where A¹ = highest abstraction, Aᵏ = most concrete
 */

/**
 * AoT Abstraction Levels
 */
const AOT_LEVELS = {
    ABSTRACT: {
        level: 1,
        name: 'Abstract',
        question: 'WHAT type of problem is this?',
        sparMapping: 'Ground Turn',
        ultrathinkTier: 1
    },
    STRATEGIC: {
        level: 2,
        name: 'Strategic',
        question: 'WHICH principles apply?',
        sparMapping: 'Flow Turn',
        ultrathinkTier: 2
    },
    TACTICAL: {
        level: 3,
        name: 'Tactical',
        question: 'HOW do we approach this?',
        sparMapping: 'Burn Turn',
        ultrathinkTier: 3
    },
    CONCRETE: {
        level: 4,
        name: 'Concrete',
        question: 'WHAT specific actions?',
        sparMapping: 'Expand Turn',
        ultrathinkTier: 4
    }
};

/**
 * Problem Type Classification
 * Maps common problem patterns to abstraction strategies
 */
const PROBLEM_TYPES = {
    SEQUENCING: {
        pattern: /should\s+(we|i).*first|priority|order|before|after/i,
        abstractionHint: 'This is a sequencing decision, not an exclusion decision.',
        decompositionType: 'temporal'
    },
    TRADEOFF: {
        pattern: /vs|versus|trade.?off|balance|or/i,
        abstractionHint: 'This is a tradeoff requiring multi-criteria evaluation.',
        decompositionType: 'dimensional'
    },
    RESOURCE_ALLOCATION: {
        pattern: /allocate|invest|spend|budget|capacity|bandwidth/i,
        abstractionHint: 'This is a resource allocation under constraints.',
        decompositionType: 'constraint-based'
    },
    ROOT_CAUSE: {
        pattern: /why|cause|reason|explain|broke|failed/i,
        abstractionHint: 'This requires causal analysis at multiple levels.',
        decompositionType: 'hierarchical'
    },
    DESIGN: {
        pattern: /design|architect|structure|how\s+should|build/i,
        abstractionHint: 'This is a design decision with cascading implications.',
        decompositionType: 'structural'
    },
    PREDICTION: {
        pattern: /will|predict|expect|forecast|future|outcome/i,
        abstractionHint: 'This requires scenario modeling and uncertainty acknowledgment.',
        decompositionType: 'probabilistic'
    }
};

/**
 * Classify problem type from input
 */
function classifyProblem(input) {
    const normalizedInput = input.trim();

    for (const [typeName, config] of Object.entries(PROBLEM_TYPES)) {
        if (config.pattern.test(normalizedInput)) {
            return {
                type: typeName,
                hint: config.abstractionHint,
                decompositionType: config.decompositionType,
                confidence: 0.8
            };
        }
    }

    return {
        type: 'GENERAL',
        hint: 'Standard problem requiring systematic analysis.',
        decompositionType: 'general',
        confidence: 0.5
    };
}

/**
 * Generate problem decomposition (Type 1 Abstraction)
 * Breaks down complex problem into component dimensions
 */
function decomposeProblem(input, problemType) {
    const decomposition = {
        root: extractCoreDecision(input),
        branches: []
    };

    // Standard dimensions for most problems
    const standardDimensions = [
        { name: 'Revenue Implications', focus: 'financial impact' },
        { name: 'Credibility Implications', focus: 'reputation and trust' },
        { name: 'Capacity Implications', focus: 'resources and constraints' },
        { name: 'Strategic Implications', focus: 'long-term positioning' }
    ];

    // Adjust based on problem type
    switch (problemType.decompositionType) {
        case 'temporal':
            decomposition.branches = [
                { name: 'Immediate Effects', focus: 'what happens now' },
                { name: 'Short-term Effects', focus: 'what happens this quarter' },
                { name: 'Long-term Effects', focus: 'what happens this year+' },
                { name: 'Reversibility', focus: 'can we undo this?' }
            ];
            break;
        case 'constraint-based':
            decomposition.branches = [
                { name: 'Hard Constraints', focus: 'non-negotiable limits' },
                { name: 'Soft Constraints', focus: 'preferences and trade-offs' },
                { name: 'Resource Pool', focus: 'what we have to work with' },
                { name: 'Opportunity Cost', focus: 'what we give up' }
            ];
            break;
        default:
            decomposition.branches = standardDimensions;
    }

    return decomposition;
}

/**
 * Extract core decision from input
 */
function extractCoreDecision(input) {
    // Remove common prefixes
    const cleaned = input
        .replace(/^(should|how|what|when|why|can|could|would)\s+(we|i|the team)?\s*/i, '')
        .replace(/\?$/, '');

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Generate relational structure (Type 2 Abstraction)
 * Maps relationships between decomposition branches
 */
function mapRelations(decomposition) {
    const branches = decomposition.branches;
    const relations = [];

    // Common relation patterns
    const relationPatterns = [
        { from: 0, to: 1, type: 'CONTRADICTS', label: 'short-term tension' },
        { from: 1, to: 0, type: 'ENABLES', label: 'long-term unlock' },
        { from: 2, to: 0, type: 'CONSTRAINS', label: 'limits options' },
        { from: 3, to: 2, type: 'UNLOCKS', label: 'clarity enables focus' }
    ];

    for (const pattern of relationPatterns) {
        if (branches[pattern.from] && branches[pattern.to]) {
            relations.push({
                from: branches[pattern.from].name,
                to: branches[pattern.to].name,
                type: pattern.type,
                label: pattern.label
            });
        }
    }

    return relations;
}

/**
 * Determine required abstraction level for a given input
 * Returns whether AoT pre-phase is needed
 */
function detectAbstractionNeed(input) {
    const wordCount = input.split(/\s+/).length;
    const problemType = classifyProblem(input);

    // Complex problems benefit from AoT
    const complexityIndicators = [
        problemType.type !== 'GENERAL',
        wordCount > 20,
        /and|but|however|although|while/i.test(input),
        /multiple|several|various|different/i.test(input)
    ];

    const complexityScore = complexityIndicators.filter(Boolean).length;

    return {
        needsAbstraction: complexityScore >= 2,
        complexityScore,
        recommendedLevel: complexityScore >= 3 ? 'FULL' : complexityScore >= 2 ? 'LIGHT' : 'SKIP',
        problemType
    };
}

/**
 * Generate complete AoT pre-phase output
 */
function generateAbstractionMap(input) {
    const assessment = detectAbstractionNeed(input);

    if (!assessment.needsAbstraction) {
        return {
            skipped: true,
            reason: 'Problem does not require abstraction pre-phase',
            directExecution: true
        };
    }

    const decomposition = decomposeProblem(input, assessment.problemType);
    const relations = mapRelations(decomposition);

    return {
        skipped: false,
        problemType: assessment.problemType,
        decomposition,
        relations,
        abstractionLevel: assessment.problemType.hint,
        sparGuidance: {
            groundTurn: `Frame as: ${assessment.problemType.hint}`,
            shareDecomposition: decomposition.branches.map(b => b.name),
            shareRelations: relations.map(r => `${r.from} ${r.type} ${r.to}`)
        }
    };
}

/**
 * Format abstraction map as markdown for SPAR consumption
 */
function formatAsMarkdown(abstractionMap) {
    if (abstractionMap.skipped) {
        return `> **AoT Pre-Phase**: Skipped (${abstractionMap.reason})`;
    }

    let md = `## STEP 3: ABSTRACT 🗺️ (AoT Pre-Phase)\n\n`;

    // Problem classification
    md += `### Problem Classification\n\n`;
    md += `**Type**: ${abstractionMap.problemType.type}\n\n`;
    md += `**Framing**: "${abstractionMap.abstractionLevel}"\n\n`;

    // Decomposition
    md += `### Type 1: Problem Decomposition\n\n`;
    md += `\`\`\`\nDECISION: ${abstractionMap.decomposition.root}\n\n`;
    md += `DECOMPOSITION:\n`;
    for (const branch of abstractionMap.decomposition.branches) {
        md += `├── ${branch.name}\n`;
        md += `│   └── Focus: ${branch.focus}\n`;
    }
    md += `\`\`\`\n\n`;

    // Relations
    md += `### Type 2: Relational Structure\n\n`;
    md += `Key Relations:\n`;
    for (const rel of abstractionMap.relations) {
        md += `• ${rel.from} **${rel.type}** ${rel.to} (${rel.label})\n`;
    }
    md += `\n`;

    return md;
}

export {
    AOT_LEVELS,
    PROBLEM_TYPES,
    classifyProblem,
    decomposeProblem,
    mapRelations,
    detectAbstractionNeed,
    generateAbstractionMap,
    formatAsMarkdown
};

export default {
    generateAbstractionMap,
    detectAbstractionNeed
};
