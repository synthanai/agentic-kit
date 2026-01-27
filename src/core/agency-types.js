/**
 * SYNTHAI Agency Types - The Three Hands of Miller
 * 
 * Based on Miller's Living Systems Theory "Decider Subsystem"
 * Formalizes the separation of concerns between human judgment,
 * agent reasoning, and machine execution.
 * 
 * @module agentic-kit/core/agency-types
 */

/**
 * Agency type definitions aligned with Miller's Living Systems
 */
export const AGENCY_TYPES = {
    /**
     * DECIDER - Human-backed judgment authority
     * Maps to Heptagon Phase: COMMIT
     * Characteristics: Final approval, MERIT-bound, accountability
     */
    DECIDER: {
        id: 'decider',
        name: 'Decider',
        description: 'Human-backed judgment authority',
        heptagonPhase: 'COMMIT',
        characteristics: [
            'Final approval authority',
            'MERIT-bound accountability',
            'Cannot be fully automated',
            'Traces to human identity'
        ],
        meritBinding: ['Irrevocability', 'Traceability']
    },

    /**
     * DELIBERATOR - Multi-agent reasoning engine
     * Maps to Heptagon Phase: SPAR
     * Characteristics: Structured debate, persona synthesis, consensus-seeking
     */
    DELIBERATOR: {
        id: 'deliberator',
        name: 'Deliberator',
        description: 'Multi-agent reasoning through structured debate',
        heptagonPhase: 'SPAR',
        characteristics: [
            'Persona-based argumentation',
            'Synthesis through friction',
            'Explores solution space',
            'Generates options, not decisions'
        ],
        meritBinding: ['Explainability', 'Reversibility']
    },

    /**
     * DOER - Deterministic machine executor
     * Maps to Heptagon Phase: ENACT
     * Characteristics: Reproducible, auditable, stateless
     */
    DOER: {
        id: 'doer',
        name: 'Doer',
        description: 'Deterministic execution of committed decisions',
        heptagonPhase: 'ENACT',
        characteristics: [
            'Reproducible outcomes',
            'Fully auditable trace',
            'No judgment required',
            'Stateless execution'
        ],
        meritBinding: ['Traceability']
    }
};

/**
 * Get agency type by Heptagon phase
 * @param {string} phase - Heptagon phase name
 * @returns {Object|null} Agency type or null
 */
export function getAgencyByPhase(phase) {
    const phaseUpper = phase.toUpperCase();
    return Object.values(AGENCY_TYPES).find(
        agency => agency.heptagonPhase === phaseUpper
    ) || null;
}

/**
 * Validate that an action is appropriate for an agency type
 * @param {string} agencyType - Agency type id
 * @param {Object} action - Action to validate
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateAgencyAction(agencyType, action) {
    const agency = AGENCY_TYPES[agencyType.toUpperCase()];
    if (!agency) {
        return { valid: false, reason: `Unknown agency type: ${agencyType}` };
    }

    // Doers cannot make decisions
    if (agency.id === 'doer' && action.type === 'decide') {
        return {
            valid: false,
            reason: 'DOER agency cannot make decisions - escalate to DECIDER'
        };
    }

    // Deliberators cannot commit
    if (agency.id === 'deliberator' && action.type === 'commit') {
        return {
            valid: false,
            reason: 'DELIBERATOR agency cannot commit - escalate to DECIDER'
        };
    }

    return { valid: true, reason: 'Action permitted for agency type' };
}

/**
 * Determine which agency should handle an action
 * @param {Object} action - Action requiring agency assignment
 * @returns {string} Agency type id
 */
export function routeToAgency(action) {
    if (action.requiresJudgment || action.type === 'commit') {
        return 'decider';
    }
    if (action.requiresDebate || action.type === 'deliberate') {
        return 'deliberator';
    }
    return 'doer';
}

export default AGENCY_TYPES;
