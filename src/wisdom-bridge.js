/**
 * Wisdom Embeddings Bridge
 * 
 * Connects Kural-Kit's semantic search to Agentic-Kit's decision memory.
 * Enables grounding AI decisions in classical Tamil wisdom.
 * 
 * @module agentic-kit/wisdom-bridge
 */

/**
 * Wisdom grounding categories (align with Thirukkural divisions)
 */
export const WISDOM_DOMAINS = {
    ARAM: 'aram',       // Virtue/Ethics (Chapters 1-38)
    PORUL: 'porul',     // Governance/Wealth (Chapters 39-108)
    INBAM: 'inbam'      // Love/Relationships (Chapters 109-133)
};

/**
 * Decision grounding patterns
 * Maps decision types to relevant wisdom domains
 */
const GROUNDING_PATTERNS = {
    // Ethical decisions ground in Aram
    'ethical': { domains: [WISDOM_DOMAINS.ARAM], priority: 'high' },
    'moral': { domains: [WISDOM_DOMAINS.ARAM], priority: 'high' },
    'right_wrong': { domains: [WISDOM_DOMAINS.ARAM], priority: 'high' },

    // Strategic decisions ground in Porul
    'strategic': { domains: [WISDOM_DOMAINS.PORUL], priority: 'medium' },
    'governance': { domains: [WISDOM_DOMAINS.PORUL], priority: 'high' },
    'leadership': { domains: [WISDOM_DOMAINS.PORUL], priority: 'medium' },
    'resource': { domains: [WISDOM_DOMAINS.PORUL], priority: 'medium' },

    // Relationship decisions ground in Inbam
    'relationship': { domains: [WISDOM_DOMAINS.INBAM], priority: 'low' },
    'interpersonal': { domains: [WISDOM_DOMAINS.INBAM], priority: 'low' },

    // Complex decisions may span all domains
    'complex': { domains: Object.values(WISDOM_DOMAINS), priority: 'medium' }
};

/**
 * In-memory cache for decision-wisdom associations
 */
const wisdomAssociations = new Map();

/**
 * Get relevant wisdom domain for a decision type
 * 
 * @param {string} decisionType - Type of decision
 * @returns {Object} Grounding configuration
 */
export function getGroundingPattern(decisionType) {
    const normalized = decisionType.toLowerCase().replace(/[\s-]/g, '_');
    return GROUNDING_PATTERNS[normalized] || GROUNDING_PATTERNS.complex;
}

/**
 * Ground a decision in wisdom
 * 
 * @param {Object} decision - The decision context
 * @param {string} decision.question - The decision question
 * @param {string} decision.type - Type of decision
 * @param {Object} options - Grounding options
 * @returns {Promise<Object>} Grounded decision with wisdom context
 */
export async function groundDecisionInWisdom(decision, options = {}) {
    const { question, type = 'complex', id } = decision;
    const { verbose = false, maxKurals = 3 } = options;

    // Get grounding pattern
    const pattern = getGroundingPattern(type);

    // Build grounding context
    const grounding = {
        decisionId: id || `dec_${Date.now()}`,
        question,
        type,
        domains: pattern.domains,
        priority: pattern.priority,
        kurals: [],
        timestamp: new Date().toISOString()
    };

    // Try to fetch relevant kurals from Kural-Kit
    try {
        // Dynamic import to avoid hard dependency
        const { protectedSearch } = await import('kural-kit/cli/protected-wisdom.js');

        // Search for relevant wisdom
        const searchResult = await protectedSearch(question, options.corpusPath, {
            plane: options.plane || 'C1',
            accessor: options.accessor || 'agentic-kit',
            topK: maxKurals
        });

        grounding.kurals = searchResult.results.map(r => ({
            number: r.number,
            text: r.kural?.Translation || '',
            score: r.score
        }));

        if (verbose) {
            console.log(`[WISDOM-BRIDGE] Found ${grounding.kurals.length} relevant kurals`);
        }

    } catch (error) {
        // Kural-Kit not available - fall back to sage context
        if (verbose) {
            console.log(`[WISDOM-BRIDGE] Kural-Kit unavailable: ${error.message}`);
        }

        // Fall back to wisdom-loader sage context
        try {
            const { getWisdomContext } = await import('./core/wisdom-loader.js');
            grounding.sageContext = await getWisdomContext(question);
        } catch {
            // Neither available - proceed without wisdom grounding
            grounding.sageContext = null;
        }
    }

    // Cache the association
    wisdomAssociations.set(grounding.decisionId, grounding);

    return grounding;
}

/**
 * Format grounding for LLM context injection
 * 
 * @param {Object} grounding - The grounding result
 * @returns {string} Formatted context for LLM
 */
export function formatGroundingContext(grounding) {
    if (!grounding) return '';

    let context = `\n--- WISDOM GROUNDING ---\n`;
    context += `Decision Type: ${grounding.type} (${grounding.priority} priority)\n`;
    context += `Domains: ${grounding.domains.join(', ')}\n`;

    if (grounding.kurals && grounding.kurals.length > 0) {
        context += `\nRelevant Kurals:\n`;
        grounding.kurals.forEach(k => {
            context += `  Kural ${k.number}: "${k.text}"\n`;
        });
    }

    if (grounding.sageContext) {
        context += grounding.sageContext;
    }

    context += `--- END WISDOM ---\n`;
    return context;
}

/**
 * Get wisdom grounding for a past decision
 * 
 * @param {string} decisionId - The decision ID
 * @returns {Object|null} The cached grounding
 */
export function getDecisionGrounding(decisionId) {
    return wisdomAssociations.get(decisionId) || null;
}

/**
 * Associate wisdom insight with a decision outcome
 * Used for GAUGE phase learning
 * 
 * @param {string} decisionId - The decision ID
 * @param {Object} outcome - The decision outcome
 * @returns {Object} Updated association
 */
export function recordWisdomOutcome(decisionId, outcome) {
    const grounding = wisdomAssociations.get(decisionId);

    if (!grounding) {
        return { success: false, error: 'No grounding found for decision' };
    }

    grounding.outcome = {
        success: outcome.success,
        notes: outcome.notes,
        recordedAt: new Date().toISOString()
    };

    // Mark which kurals were most relevant
    if (outcome.relevantKurals) {
        grounding.kurals.forEach(k => {
            if (outcome.relevantKurals.includes(k.number)) {
                k.confirmed = true;
            }
        });
    }

    wisdomAssociations.set(decisionId, grounding);

    return { success: true, grounding };
}

/**
 * Export wisdom associations for analysis
 * 
 * @param {Object} options - Export options
 * @returns {Array} Wisdom associations
 */
export function exportWisdomAssociations(options = {}) {
    const { since, withOutcomes = false } = options;

    let associations = Array.from(wisdomAssociations.values());

    if (since) {
        associations = associations.filter(a =>
            new Date(a.timestamp) > new Date(since)
        );
    }

    if (withOutcomes) {
        associations = associations.filter(a => a.outcome);
    }

    return associations;
}

export default {
    WISDOM_DOMAINS,
    getGroundingPattern,
    groundDecisionInWisdom,
    formatGroundingContext,
    getDecisionGrounding,
    recordWisdomOutcome,
    exportWisdomAssociations
};
