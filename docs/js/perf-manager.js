// PerformanceManager: monitors frame times and exposes adaptive quality settings
// Quality tiers: high, medium, low, ultraLow

export class PerformanceManager {
    constructor() {
        this.samples = [];
        this.maxSamples = 120; // ~2s at 60fps
        this.lastTimestamp = 0;
        this.currentTier = 'high';
        this.hidden = false;
        this.frameSkipCounter = 0;
        this.targetFPS = 60;
        this.degradeThresholdMs = 24; // ~41fps
        this.upgradeThresholdMs = 14; // ~71fps
        this.degradeStreakMs = 1500;
        this.upgradeStreakMs = 2500;
        this._degradeAccum = 0;
        this._upgradeAccum = 0;
        this._lastAdjustTime = 0;
        this.minAdjustIntervalMs = 1500;
        this.listeners = new Set();
        window.PerformanceManager = this; // expose for non-module scripts
    }

    onTierChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    setHidden(isHidden) {
        this.hidden = !!isHidden;
    }

    tick(nowMs) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = nowMs;
            return;
        }
        const dt = nowMs - this.lastTimestamp;
        this.lastTimestamp = nowMs;
        // Ignore obviously bad deltas
        if (dt <= 0 || dt > 1000) return;
        this.samples.push(dt);
        if (this.samples.length > this.maxSamples) this.samples.shift();
        this._maybeAdjustTier(dt);
    }

    _maybeAdjustTier(dt) {
        const now = performance.now();
        if (now - this._lastAdjustTime < this.minAdjustIntervalMs) return;
        if (this.hidden) {
            this._setTier('ultraLow');
            this._lastAdjustTime = now;
            return;
        }
        // Accumulate time above/below thresholds with hysteresis
        if (dt > this.degradeThresholdMs) {
            this._degradeAccum += dt;
            this._upgradeAccum = Math.max(0, this._upgradeAccum - dt);
        } else if (dt < this.upgradeThresholdMs) {
            this._upgradeAccum += dt;
            this._degradeAccum = Math.max(0, this._degradeAccum - dt);
        }

        if (this._degradeAccum > this.degradeStreakMs) {
            this._degradeAccum = 0;
            this._upgradeAccum = 0;
            this._stepDown();
            this._lastAdjustTime = now;
        } else if (this._upgradeAccum > this.upgradeStreakMs) {
            this._degradeAccum = 0;
            this._upgradeAccum = 0;
            this._stepUp();
            this._lastAdjustTime = now;
        }
    }

    _stepDown() {
        const order = ['high', 'medium', 'low', 'ultraLow'];
        const idx = order.indexOf(this.currentTier);
        const next = order[Math.min(order.length - 1, idx + 1)];
        this._setTier(next);
    }

    _stepUp() {
        const order = ['high', 'medium', 'low', 'ultraLow'];
        const idx = order.indexOf(this.currentTier);
        const next = order[Math.max(0, idx - 1)];
        this._setTier(next);
    }

    _setTier(tier) {
        if (tier === this.currentTier) return;
        this.currentTier = tier;
        this.listeners.forEach((l) => {
            try { l(tier); } catch (_) {}
        });
    }

    getTier() {
        return this.currentTier;
    }

    // Three.js pixel ratio cap per tier
    getThreePixelRatioCap() {
        switch (this.currentTier) {
            case 'high': return Math.min(window.devicePixelRatio || 1, 1.5);
            case 'medium': return 1.0;
            case 'low': return 0.85;
            case 'ultraLow': return 0.75;
            default: return 1.0;
        }
    }

    // Fluid simulation settings per tier
    getFluidSettings() {
        switch (this.currentTier) {
            case 'high':
                return {
                    SIM_RESOLUTION: 128,
                    DYE_RESOLUTION: 512,
                    PRESSURE_ITERATIONS: 10,
                    BLOOM: true,
                    BLOOM_ITERATIONS: 6,
                    BLOOM_RESOLUTION: 256,
                    SUNRAYS: true,
                    maxDevicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
                    simulationStepDivisor: 1,
                    brainTurbulencePoints: 10,
                    brainTurbulenceInterval: 1
                };
            case 'medium':
                return {
                    SIM_RESOLUTION: 96,
                    DYE_RESOLUTION: 384,
                    PRESSURE_ITERATIONS: 8,
                    BLOOM: true,
                    BLOOM_ITERATIONS: 4,
                    BLOOM_RESOLUTION: 192,
                    SUNRAYS: false,
                    maxDevicePixelRatio: 1.0,
                    simulationStepDivisor: 2,
                    brainTurbulencePoints: 8,
                    brainTurbulenceInterval: 2
                };
            case 'low':
                return {
                    SIM_RESOLUTION: 64,
                    DYE_RESOLUTION: 256,
                    PRESSURE_ITERATIONS: 6,
                    BLOOM: false,
                    BLOOM_ITERATIONS: 0,
                    BLOOM_RESOLUTION: 128,
                    SUNRAYS: false,
                    maxDevicePixelRatio: 0.85,
                    simulationStepDivisor: 3,
                    brainTurbulencePoints: 6,
                    brainTurbulenceInterval: 3
                };
            case 'ultraLow':
            default:
                return {
                    SIM_RESOLUTION: 48,
                    DYE_RESOLUTION: 192,
                    PRESSURE_ITERATIONS: 4,
                    BLOOM: false,
                    BLOOM_ITERATIONS: 0,
                    BLOOM_RESOLUTION: 96,
                    SUNRAYS: false,
                    maxDevicePixelRatio: 0.75,
                    simulationStepDivisor: 4,
                    brainTurbulencePoints: 4,
                    brainTurbulenceInterval: 4
                };
        }
    }

    // Tunnel complexity per tier
    getTunnelSettings() {
        switch (this.currentTier) {
            case 'high': return { geometryComplexity: 120, innerTube: true, rings: 3 };
            case 'medium': return { geometryComplexity: 90, innerTube: true, rings: 2 };
            case 'low': return { geometryComplexity: 70, innerTube: false, rings: 1 };
            case 'ultraLow': default: return { geometryComplexity: 50, innerTube: false, rings: 0 };
        }
    }

    // Brain rendering options
    getBrainSettings() {
        switch (this.currentTier) {
            case 'high': return { shadows: false, frameSkip: 0 };
            case 'medium': return { shadows: false, frameSkip: 1 }; // render every other frame
            case 'low': return { shadows: false, frameSkip: 2 };
            case 'ultraLow': default: return { shadows: false, frameSkip: 3 };
        }
    }
}

const performanceManager = new PerformanceManager();
export default performanceManager;


