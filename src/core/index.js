/**
 * Agentic-Kit Core Exports
 * 
 * Infrastructure primitives for the SYNTHAI ecosystem
 * @module agentic-kit/core
 */

// Agency Types (Miller's Three Hands)
export {
    AGENCY_TYPES,
    getAgencyByPhase,
    validateAgencyAction,
    routeToAgency
} from './agency-types.js';

// Event Bus (GAUGE propagation)
export {
    emitGaugeEvent,
    subscribeToGauge,
    buildGaugeEvent,
    getGaugeEventBus
} from './event-bus.js';

// GAUGE Subscribers
export {
    registerAllKitSubscribers,
    sparGaugeHandler,
    vaultGaugeHandler,
    kuralGaugeHandler,
    resonanceGaugeHandler,
    agenticGaugeHandler
} from './gauge-subscribers.js';

// Wisdom Loader
export { default as WisdomLoader } from './wisdom-loader.js';
