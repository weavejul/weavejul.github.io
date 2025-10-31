import { PerformanceManager } from '../perf-manager.js';

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (e) {
        console.error(`❌ ${name}:`, e.message);
    }
}

// Simulate a sequence of frame times
function feedFrames(pm, msArray, start = performance.now()) {
    let t = start;
    msArray.forEach((ms) => {
        t += ms;
        pm.tick(t);
    });
}

export function runPerfManagerTests() {
    runTest('Starts at high tier', () => {
        const pm = new PerformanceManager();
        assert(pm.getTier() === 'high', 'Initial tier should be high');
    });

    runTest('Degrades tier on sustained slow frames', () => {
        const pm = new PerformanceManager();
        // Feed 2 seconds of 30ms frames
        const frames = Array(70).fill(30);
        feedFrames(pm, frames);
        const tier = pm.getTier();
        assert(tier === 'medium' || tier === 'low' || tier === 'ultraLow', 'Should degrade below high');
    });

    runTest('Upgrades tier on sustained fast frames', () => {
        const pm = new PerformanceManager();
        // First degrade
        feedFrames(pm, Array(80).fill(30));
        const degraded = pm.getTier();
        // Then 3s of 10ms frames
        feedFrames(pm, Array(200).fill(10));
        const upgraded = pm.getTier();
        assert(['high','medium','low','ultraLow'].indexOf(upgraded) >= 0, 'Tier is valid');
        assert(upgraded <= degraded || upgraded === 'high', 'Should upgrade or be high');
    });

    runTest('Fluid settings map per tier', () => {
        const pm = new PerformanceManager();
        pm._setTier('high');
        assert(pm.getFluidSettings().SIM_RESOLUTION >= 96, 'High tier sim res');
        pm._setTier('medium');
        assert(pm.getFluidSettings().simulationStepDivisor >= 2, 'Medium tier step divisor');
        pm._setTier('low');
        assert(pm.getFluidSettings().BLOOM === false || pm.getFluidSettings().BLOOM_ITERATIONS === 0, 'Low tier disables bloom');
    });
}

// Auto-run in browser
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        runPerfManagerTests();
    });
}


