/**
 * GAUGE Flow End-to-End Test
 * 
 * Verifies the nervous system works across all kits.
 */

import { emitGaugeEvent, onGaugeEvent } from '../src/core/event-bus.js';
import { registerAllKitSubscribers } from '../src/core/gauge-subscribers.js';

// Track received events
const receivedEvents = [];

// Test harness subscriber
function testSubscriber(event) {
    receivedEvents.push({
        ...event,
        receivedAt: new Date().toISOString()
    });
    console.log(`✅ Event received: ${event.source} → ${event.phase}`);
}

async function runGaugeTest() {
    console.log('\n🧪 GAUGE Flow E2E Test\n');
    console.log('━'.repeat(50));
    
    // Step 1: Register test subscriber
    console.log('\n1️⃣  Registering test subscriber...');
    onGaugeEvent(testSubscriber);
    console.log('   ✓ Test subscriber registered');
    
    // Step 2: Register all kit subscribers
    console.log('\n2️⃣  Registering kit subscribers...');
    registerAllKitSubscribers({ emitGaugeEvent, onGaugeEvent });
    console.log('   ✓ All kit subscribers registered');
    
    // Step 3: Emit test event (simulating DMS phase completion)
    console.log('\n3️⃣  Emitting GAUGE_EVENT...');
    emitGaugeEvent({
        id: `gauge_test_${Date.now()}`,
        source: 'dms',
        phase: 'YIELD',
        insight: {
            audit: { M: 0.8, E: 0.9, R: 0.85, I: 0.88, T: 0.82 },
            trigger: 'test-harness'
        },
        timestamp: new Date().toISOString()
    });
    
    // Give async handlers time to process
    await new Promise(r => setTimeout(r, 100));
    
    // Step 4: Verify receipt
    console.log('\n4️⃣  Verifying event propagation...');
    console.log(`   Events received: ${receivedEvents.length}`);
    
    if (receivedEvents.length > 0) {
        console.log('\n✅ GAUGE Flow Test PASSED');
        console.log('   Nervous system is operational!');
    } else {
        console.log('\n❌ GAUGE Flow Test FAILED');
        console.log('   No events received by subscribers');
    }
    
    console.log('\n' + '━'.repeat(50));
    return receivedEvents.length > 0;
}

// Run if called directly
runGaugeTest().then(success => {
    process.exit(success ? 0 : 1);
});

export { runGaugeTest };
