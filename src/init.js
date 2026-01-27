/**
 * SYNTHAI Ecosystem Initializer
 * 
 * Bootstraps the GAUGE event bus and registers all kit subscribers.
 * Call this once at ecosystem startup (e.g., in the master CLI or agentic-kit entry).
 * 
 * @module agentic-kit/init
 */

import { getGaugeEventBus } from './core/event-bus.js';
import { registerAllKitSubscribers } from './core/gauge-subscribers.js';

let initialized = false;

/**
 * Initialize the SYNTHAI ecosystem
 * - Sets up GAUGE event bus
 * - Registers all kit subscribers
 * - Enables cross-kit learning
 * 
 * @param {Object} options - Initialization options
 * @param {boolean} options.verbose - Log initialization steps
 * @returns {Object} The initialized event bus
 */
export function initEcosystem(options = {}) {
    if (initialized) {
        if (options.verbose) {
            console.log('[SYNTHAI] Ecosystem already initialized');
        }
        return getGaugeEventBus();
    }

    if (options.verbose) {
        console.log('[SYNTHAI] Initializing ecosystem...');
    }

    // Get the singleton event bus
    const eventBus = getGaugeEventBus();

    // Register all kit subscribers
    registerAllKitSubscribers(eventBus);

    // Mark as initialized
    initialized = true;

    if (options.verbose) {
        console.log('[SYNTHAI] Ecosystem initialized successfully');
        console.log('[SYNTHAI] GAUGE propagation active across all kits');
    }

    return eventBus;
}

/**
 * Reset the ecosystem (for testing)
 */
export function resetEcosystem() {
    const eventBus = getGaugeEventBus();
    eventBus.removeAllListeners('GAUGE_EVENT');
    initialized = false;
}

/**
 * Check if ecosystem is initialized
 */
export function isEcosystemInitialized() {
    return initialized;
}

export default {
    initEcosystem,
    resetEcosystem,
    isEcosystemInitialized
};
