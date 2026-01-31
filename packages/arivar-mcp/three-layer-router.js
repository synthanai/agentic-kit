/**
 * ARIVAR 3-Layer Routing Module
 * 
 * Implements the BmadBridge pattern from BMAD:
 * - Intent Layer: Natural language → Pattern matching → Route selection
 * - Execution Layer: Persona loading → Workflow execution → Template fill
 * - Artifact Layer: Unified output → Consistent naming → Easy retrieval
 * 
 * Enhanced with Abstraction of Thought (AoT) pre-phase detection.
 * 
 * @see https://bennycheung.github.io/harmonizing-two-ai-agent-systems
 * @see https://bennycheung.github.io/abstraction-of-thought-makes-ai-better-reasoners
 */

import { detectAbstractionNeed, generateAbstractionMap } from './aot-abstraction.js';
const INTENT_PATTERNS = {
    // Research intents
    research: {
        patterns: [
            /research\s+(about|on|into)\s+(.+)/i,
            /investigate\s+(.+)/i,
            /deep\s*dive\s+(on|into)\s+(.+)/i,
            /analyze\s+(.+)/i
        ],
        workflow: 'research',
        personas: ['strategist', 'skeptic', 'synthesist']
    },

    // Writing intents
    write: {
        patterns: [
            /write\s+(a|the)?\s*(chapter|section|article)\s*(about|on)?\s*(.+)/i,
            /draft\s+(.+)/i,
            /compose\s+(.+)/i
        ],
        workflow: 'write-book-content',
        personas: ['author']
    },

    // Debate intents
    debate: {
        patterns: [
            /debate\s+(about|on)?\s*(.+)/i,
            /spar\s+(about|on)?\s*(.+)/i,
            /discuss\s+(.+)/i,
            /should\s+(we|i|the team)\s+(.+)/i
        ],
        workflow: 'sparkit',
        personas: ['strategist', 'sentinel', 'synthesist']
    },

    // Review intents
    review: {
        patterns: [
            /review\s+(.+)/i,
            /critique\s+(.+)/i,
            /evaluate\s+(.+)/i,
            /audit\s+(.+)/i
        ],
        workflow: 'review',
        personas: ['skeptic', 'sentinel', 'guardian']
    },

    // Knowledge extraction intents
    extract: {
        patterns: [
            /extract\s+knowledge\s+(from|about)\s+(.+)/i,
            /document\s+(the|our)?\s*(.+)/i,
            /capture\s+(.+)/i
        ],
        workflow: 'knowledge-extraction',
        personas: ['synthesist']
    }
};

/**
 * Layer 1: Intent Detection
 * Matches natural language input to known intent patterns
 */
function detectIntent(input) {
    const normalizedInput = input.trim().toLowerCase();

    for (const [intentName, config] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of config.patterns) {
            const match = normalizedInput.match(pattern);
            if (match) {
                return {
                    intent: intentName,
                    workflow: config.workflow,
                    personas: config.personas,
                    extractedTopic: match[match.length - 1], // Last capture group
                    confidence: 0.9,
                    rawMatch: match
                };
            }
        }
    }

    // Fallback: no match
    return {
        intent: 'unknown',
        workflow: null,
        personas: [],
        extractedTopic: input,
        confidence: 0.3,
        rawMatch: null
    };
}

/**
 * Layer 2: Execution Router
 * Routes to appropriate workflow with persona loading
 */
async function routeToExecution(intentResult, context = {}) {
    const { workflow, personas, extractedTopic } = intentResult;

    if (!workflow) {
        return {
            success: false,
            error: 'No workflow matched for this intent',
            suggestion: 'Try rephrasing or use /help to see available workflows'
        };
    }

    // Pre-load personas (BMAD lesson: pre-extract for performance)
    const loadedPersonas = await loadPersonas(personas);

    return {
        success: true,
        workflow,
        topic: extractedTopic,
        personas: loadedPersonas,
        workflowPath: `.agent/workflows/${workflow}.md`,
        outputPath: generateOutputPath(workflow, extractedTopic)
    };
}

/**
 * Load personas from the SPAR archetype registry
 */
async function loadPersonas(personaIds) {
    // In real implementation, load from spar_archetypes.json
    const archetypes = {
        strategist: {
            role: 'Strategic analyst and systems integrator',
            principles: [
                'Every decision has a second-order effect',
                'Strategy is about what you choose NOT to do'
            ]
        },
        sentinel: {
            role: 'Risk-aware governance specialist',
            principles: [
                'It is not paranoia if the risks are real',
                'The absence of evidence is not evidence of absence'
            ]
        },
        synthesist: {
            role: 'Integration expert bridging perspectives',
            principles: [
                'Opposites are often complements in disguise',
                'The synthesis is always more than the sum'
            ]
        },
        skeptic: {
            role: 'Critical challenger and devil\'s advocate',
            principles: [
                'Correlation is not causation',
                'Anecdotes are not data'
            ]
        },
        guardian: {
            role: 'Cultural steward and values protector',
            principles: [
                'Culture eats strategy for breakfast',
                'Reputation takes decades to build and minutes to destroy'
            ]
        }
    };

    return personaIds.map(id => archetypes[id] || { role: 'Unknown', principles: [] });
}

/**
 * Layer 3: Artifact Path Generation
 * Unified output location following BMAD's unified output principle
 */
function generateOutputPath(workflow, topic) {
    const sanitizedTopic = topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 50);

    const timestamp = new Date().toISOString().split('T')[0];

    // Unified output hierarchy: ~/.synthai/{category}/{workflow}_{topic}_{date}/
    const categoryMap = {
        'research': 'research',
        'research-org': 'research',
        'research-theorist': 'research',
        'research-concept': 'research',
        'write-book-content': 'writing',
        'sparkit': 'debates',
        'debate': 'debates',
        'review': 'reviews',
        'knowledge-extraction': 'knowledge'
    };

    const category = categoryMap[workflow] || 'misc';

    return {
        base: `~/.synthai/${category}`,
        session: `${sanitizedTopic}_${timestamp}`,
        full: `~/.synthai/${category}/${sanitizedTopic}_${timestamp}`,
        artifacts: {
            main: `${sanitizedTopic}_${timestamp}/output.md`,
            debate: `${sanitizedTopic}_${timestamp}/debate.json`,
            log: `${sanitizedTopic}_${timestamp}/session.log`
        }
    };
}

/**
 * Main router entry point
 * Enhanced with AoT pre-phase detection
 */
async function route(userInput, context = {}) {
    // Layer 0: Abstraction Pre-Phase (AoT)
    const abstractionAssessment = detectAbstractionNeed(userInput);
    let abstractionMap = null;

    if (abstractionAssessment.needsAbstraction) {
        abstractionMap = generateAbstractionMap(userInput);
    }

    // Layer 1: Intent
    const intent = detectIntent(userInput);

    // Layer 2: Execution
    const execution = await routeToExecution(intent, context);

    // Layer 3: Artifact paths are generated in execution
    return {
        abstraction: {
            needed: abstractionAssessment.needsAbstraction,
            level: abstractionAssessment.recommendedLevel,
            problemType: abstractionAssessment.problemType,
            map: abstractionMap
        },
        intent,
        execution,
        ready: execution.success
    };
}

/**
 * Quick route without AoT (for simple queries)
 */
async function routeSimple(userInput, context = {}) {
    const intent = detectIntent(userInput);
    const execution = await routeToExecution(intent, context);
    return { intent, execution, ready: execution.success };
}

export {
    detectIntent,
    routeToExecution,
    generateOutputPath,
    loadPersonas,
    route,
    routeSimple,
    detectAbstractionNeed,
    generateAbstractionMap,
    INTENT_PATTERNS
};

export default { route, routeSimple };
