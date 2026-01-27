/**
 * WISDOM Trace Type
 * 
 * Formalizes wisdom citations in Decision Moment traces.
 * Integrates Kural sages and couplets into the DMG audit trail.
 * 
 * @module agentic-kit/traces/wisdom-trace
 */

/**
 * WISDOM trace type identifier
 */
export const TRACE_TYPE = 'WISDOM';

/**
 * WISDOM trace schema
 */
export const WISDOM_TRACE_SCHEMA = {
    type: TRACE_TYPE,
    version: '1.0.0',
    properties: {
        source: 'string',      // e.g., 'thirukkural', 'aathichoodi'
        sage: 'string',        // e.g., 'Thiruvalluvar', 'Avvaiyar'
        couplet: {
            english: 'string',
            meaning: 'string',
            principle: 'string'
        },
        relevanceScore: 'number',  // 0.0 to 1.0
        context: 'string'          // Why this wisdom was invoked
    }
};

/**
 * Create a WISDOM trace for the DMG audit trail
 * 
 * @param {Object} sage - Sage metadata from kural-embeddings
 * @param {Object} couplet - Generated couplet object
 * @param {Object} options - Additional options
 * @returns {Object} WISDOM trace object
 */
export function createWisdomTrace(sage, couplet, options = {}) {
    return {
        traceType: TRACE_TYPE,
        version: '1.0.0',
        timestamp: new Date().toISOString(),

        // Sage metadata
        source: sage?.source || 'unknown',
        sage: sage?.name || 'Unknown Sage',
        sageId: sage?.id || null,
        era: sage?.era || null,

        // Couplet data
        couplet: {
            english: couplet?.english || '',
            meaning: couplet?.meaning || '',
            principle: couplet?.principle || ''
        },

        // Relevance and context
        relevanceScore: options.relevanceScore || 0.5,
        context: options.context || 'SPAR synthesis',

        // Audit metadata
        momentId: options.momentId || null,
        phaseId: options.phaseId || 'GAUGE',
        traceId: `wisdom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };
}

/**
 * Validate a WISDOM trace object
 * 
 * @param {Object} trace - Trace to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateWisdomTrace(trace) {
    const errors = [];

    if (trace.traceType !== TRACE_TYPE) {
        errors.push(`Invalid trace type: ${trace.traceType}`);
    }

    if (!trace.sage) {
        errors.push('Missing sage name');
    }

    if (!trace.couplet?.english) {
        errors.push('Missing couplet english text');
    }

    if (trace.relevanceScore < 0 || trace.relevanceScore > 1) {
        errors.push('Relevance score must be between 0 and 1');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Format WISDOM trace for DMG integration
 * 
 * @param {Object} trace - WISDOM trace object
 * @returns {Object} DMG-compatible trace format
 */
export function formatForDMG(trace) {
    return {
        type: 'TRACE',
        subtype: TRACE_TYPE,
        id: trace.traceId,
        timestamp: trace.timestamp,
        payload: {
            sage: trace.sage,
            source: trace.source,
            couplet: trace.couplet.english,
            meaning: trace.couplet.meaning,
            relevance: trace.relevanceScore
        },
        metadata: {
            phaseId: trace.phaseId,
            momentId: trace.momentId
        }
    };
}

/**
 * Get all trace types including WISDOM
 */
export function getAllTraceTypes() {
    return ['SPAR', 'VAULT', 'RESONANCE', 'WISDOM'];
}

export default {
    TRACE_TYPE,
    WISDOM_TRACE_SCHEMA,
    createWisdomTrace,
    validateWisdomTrace,
    formatForDMG,
    getAllTraceTypes
};
