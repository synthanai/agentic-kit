/**
 * GAUGE Event Bus
 * 
 * Event-driven pub/sub for cross-kit insight propagation.
 * Part of the SYNTHAI Living Architecture metacognitive loop.
 * 
 * Pattern: GAUGE phase completes → emits event → kits subscribe and update
 */

import { EventEmitter } from 'events';

/**
 * Singleton event bus for GAUGE events
 */
class GaugeEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(20); // Allow many kit subscribers
        this.eventLog = [];
        this.subscribers = new Map();
    }

    /**
     * Emit a GAUGE_EVENT after phase completion
     * @param {Object} event - The GAUGE event payload
     */
    emitGaugeEvent(event) {
        const enrichedEvent = {
            type: 'GAUGE_EVENT',
            id: `gauge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            ...event
        };

        // Log for auditability
        this.eventLog.push(enrichedEvent);

        // Emit to all subscribers
        this.emit('GAUGE_EVENT', enrichedEvent);

        return enrichedEvent;
    }

    /**
     * Subscribe a kit to GAUGE events
     * @param {string} kitName - Name of the subscribing kit
     * @param {Function} handler - Handler function for events
     */
    subscribeKit(kitName, handler) {
        const wrappedHandler = (event) => {
            // Only process if kit is in target list (or no targets specified)
            if (!event.targetKits || event.targetKits.includes(kitName)) {
                try {
                    handler(event);
                } catch (error) {
                    console.error(`[GAUGE] ${kitName} handler error:`, error.message);
                }
            }
        };

        this.subscribers.set(kitName, wrappedHandler);
        this.on('GAUGE_EVENT', wrappedHandler);

        return () => this.unsubscribeKit(kitName);
    }

    /**
     * Unsubscribe a kit from GAUGE events
     * @param {string} kitName - Name of the kit to unsubscribe
     */
    unsubscribeKit(kitName) {
        const handler = this.subscribers.get(kitName);
        if (handler) {
            this.off('GAUGE_EVENT', handler);
            this.subscribers.delete(kitName);
        }
    }

    /**
     * Get recent event log for auditing
     * @param {number} limit - Max events to return
     */
    getEventLog(limit = 100) {
        return this.eventLog.slice(-limit);
    }

    /**
     * Get list of subscribed kits
     */
    getSubscribers() {
        return Array.from(this.subscribers.keys());
    }
}

// Singleton instance
const gaugeEventBus = new GaugeEventBus();

/**
 * Build a standard GAUGE event
 * @param {Object} moment - The decision moment that completed GAUGE
 * @param {Object} insight - The insight generated from GAUGE
 * @param {Object} options - Additional options
 */
export function buildGaugeEvent(moment, insight, options = {}) {
    return {
        momentId: moment?.id || 'unknown',
        insight: {
            category: insight.category || 'general',
            delta: insight.delta || 0,
            confidence: insight.confidence || 0.5,
            summary: insight.summary || ''
        },
        targetKits: options.targetKits || ['spar', 'vault', 'kural', 'resonance', 'agentic'],
        priority: options.priority || 'medium',
        source: options.source || 'gauge-phase'
    };
}

/**
 * Emit GAUGE event (convenience function)
 */
export function emitGaugeEvent(moment, insight, options) {
    const event = buildGaugeEvent(moment, insight, options);
    return gaugeEventBus.emitGaugeEvent(event);
}

/**
 * Subscribe kit to GAUGE events (convenience function)
 */
export function subscribeToGauge(kitName, handler) {
    return gaugeEventBus.subscribeKit(kitName, handler);
}

/**
 * Get event bus for advanced usage
 */
export function getGaugeEventBus() {
    return gaugeEventBus;
}

export default {
    emitGaugeEvent,
    subscribeToGauge,
    buildGaugeEvent,
    getGaugeEventBus
};
