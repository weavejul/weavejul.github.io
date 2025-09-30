import { HangingText } from './hanging-text.js';
import { Responsive } from './responsive.js';
import { getWorld, getRender, Composite } from './config.js';
import { GroundManager } from './ground-manager.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';
import { TunnelEffect } from './tunnel-effect.js';
import { FluidIntegration } from './fluid-integration.js';
import { BrainManager } from './brain-manager.js';

/**
 * SceneManager class to orchestrate the sequence of text appearances and transitions
 * @class SceneManager
 */
export class SceneManager {
    /**
     * Create a new SceneManager instance
     * @param {BackgroundParticles} [backgroundParticles] - Background particles instance
     */
    constructor(backgroundParticles = null) {
        // Core properties
        this.hangingTexts = [];
        this.currentScene = 'hello';
        this.isRunning = false;
        this.readyTextFell = false;
        this.isTransitioning = false;
        this.backgroundParticles = backgroundParticles;
        
        // Managers
        this.groundManager = new GroundManager();
        this.tunnelEffect = null;
        this.fluidIntegration = null;
        this.brainManager = null;
        
        // Event handling
        this.eventListeners = [];
        this.onSceneChangeCallback = null;
        this.collisionHandler = null;
        
        // Transition management
        this.transitionState = 'idle'; // 'idle', 'transitioning', 'skipping'
        this.pendingTransitions = new Set();
        this.transitionCallbacks = new Map();
        this.skipRequested = false;
        
        // Timeouts
        this.colorChangeTimeout = null;
        this.tunnelTimeout = null;
        
        // Skip text overlay
        this.skipTextOverlay = {
            visible: false,
            startTime: null,
            fadeInDuration: 500,
            displayDuration: 3000,
            fadeOutDuration: 1000,
            totalDuration: 4500,
            alpha: undefined
        };
    }
    
    /**
     * Set callback for scene changes
     * @param {Function} callback - Callback function to execute on scene change
     * @returns {SceneManager} - This instance for chaining
     */
    onSceneChange(callback) {
        this.onSceneChangeCallback = callback;
        return this;
    }
    
    /**
     * Emit scene change event
     * @param {string} scene - Scene name
     */
    emitSceneChange(scene) {
        if (this.onSceneChangeCallback) {
            this.onSceneChangeCallback(scene);
        }
    }
    
    /**
     * Check if currently in transition
     * @returns {boolean} - True if in transition
     */
    isInTransition() {
        return this.transitionState !== 'idle' || this.skipRequested;
    }
    
    /**
     * Check if can start a new transition
     * @returns {boolean} - True if can start transition
     */
    canStartTransition() {
        return this.transitionState === 'idle' && !this.skipRequested;
    }
    
    /**
     * Begin a transition
     * @param {string} type - Transition type ('normal' or 'skip')
     * @returns {boolean} - True if transition started successfully
     */
    beginTransition(type = 'normal') {
        if (this.skipRequested) {
            logger.scene(`Transition blocked - skip requested`);
            return false;
        }
        
        this.transitionState = type === 'skip' ? 'skipping' : 'scene transitioning';
        logger.scene(`Transition started: ${this.transitionState}`);
        return true;
    }
    
    /**
     * End current transition
     */
    endTransition() {
        this.transitionState = 'idle';
        this.pendingTransitions.clear();
        this.transitionCallbacks.clear();
        logger.scene('Transition ended');
    }
    
    /**
     * Cancel all pending transitions
     */
    cancelAllPendingTransitions() {
        logger.scene('Cancelling all pending transitions...');
        
        this.cleanupColorChangeTimeout();
        this.cleanupTunnelTimeout();
        
        this.pendingTransitions.forEach(transitionId => {
            if (this.transitionCallbacks.has(transitionId)) {
                const callback = this.transitionCallbacks.get(transitionId);
                if (callback && callback.cancel) {
                    callback.cancel();
                }
            }
        });
        
        this.pendingTransitions.clear();
        this.transitionCallbacks.clear();
        
        logger.scene('All pending transitions cancelled');
    }
    
    /**
     * Schedule a transition with delay
     * @param {number} delay - Delay in milliseconds
     * @param {Function} callback - Function to execute after delay
     * @param {Function} [cancelCallback] - Function to execute if cancelled
     * @returns {string|null} - Transition ID or null if cancelled
     */
    scheduleTransition(delay, callback, cancelCallback = null) {
        if (this.skipRequested) {
            logger.scene('Transition scheduled but skip requested - cancelling');
            return null;
        }
        
        const transitionId = `transition_${Date.now()}_${Math.random()}`;
        
        const timeoutId = setTimeout(() => {
            if (this.skipRequested) {
                logger.scene('Transition executed but skip requested - cancelling');
                return;
            }
            
            if (this.pendingTransitions.has(transitionId)) {
                this.pendingTransitions.delete(transitionId);
                this.transitionCallbacks.delete(transitionId);
                callback();
            }
        }, delay);
        
        this.pendingTransitions.add(transitionId);
        this.transitionCallbacks.set(transitionId, {
            cancel: () => {
                clearTimeout(timeoutId);
                if (cancelCallback) cancelCallback();
            }
        });
        
        return transitionId;
    }
    
    /**
     * Run the complete scene sequence with optimized timing
     */
    run() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        logger.scene('Starting scene sequence...');
        
        // Defer scene start to next frame for better performance
        requestAnimationFrame(() => {
            if (APP_CONFIG.FEATURE_FLAGS?.SKIP_HANGING_TEXT_SCENES) {
                this.runTunnelSceneDirectly();
            } else {
                this.runHelloScene();
            }
        });
    }

    /**
     * Show skip text overlay
     */
    showSkipTextOverlay() {
        this.skipTextOverlay.visible = true;
        this.skipTextOverlay.startTime = performance.now();
        logger.scene('Skip text overlay started');
    }
    
    /**
     * Update skip text overlay (called during render)
     */
    updateSkipTextOverlay() {
        if (!this.skipTextOverlay.visible || !this.skipTextOverlay.startTime) {
            return;
        }
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.skipTextOverlay.startTime;
        
        // Check if overlay should be hidden
        if (elapsed >= this.skipTextOverlay.totalDuration) {
            this.skipTextOverlay.visible = false;
            this.skipTextOverlay.startTime = null;
            return;
        }
        
        // Calculate alpha based on current phase
        let alpha = 0;
        if (elapsed < this.skipTextOverlay.fadeInDuration) {
            alpha = elapsed / this.skipTextOverlay.fadeInDuration;
        } else if (elapsed < this.skipTextOverlay.fadeInDuration + this.skipTextOverlay.displayDuration) {
            alpha = 1;
        } else {
            const fadeOutElapsed = elapsed - (this.skipTextOverlay.fadeInDuration + this.skipTextOverlay.displayDuration);
            alpha = 1 - (fadeOutElapsed / this.skipTextOverlay.fadeOutDuration);
        }
        
        this.skipTextOverlay.alpha = Math.max(0, Math.min(1, alpha));
    }
    
    /**
     * Draw skip text overlay
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawSkipTextOverlay(ctx) {
        if (!this.skipTextOverlay.visible || this.skipTextOverlay.alpha === undefined) {
            return;
        }
        
        // Don't show skip text overlay on mobile devices
        if (window.mobileCheck && window.mobileCheck()) {
            return;
        }
        
        ctx.save();
        
        ctx.font = '14px "Courier New", "Courier", monospace';
        ctx.fillStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = this.skipTextOverlay.alpha;
        
        const x = 20;
        const y = 20;
        const text = "press s to skip";
        
        ctx.shadowColor = APP_CONFIG.COLORS.DEFAULT_GOLD;
        ctx.shadowBlur = 5;
        
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }

    /**
     * Skip hanging text scenes and start directly with the tunnel effect
     */
    runTunnelSceneDirectly() {
        logger.scene('Skipping hanging text scenes - starting tunnel effect immediately');

        this.showSkipTextOverlay();

        if (!this.beginTransition()) {
            logger.scene('Transition blocked - tunnel sequence already in progress');
            return;
        }

        this.startTunnelEffect();
    }

    /**
     * Scene 1: Hello text appears and waits to be clicked
     */
    runHelloScene() {
        if (APP_CONFIG.FEATURE_FLAGS?.SKIP_HANGING_TEXT_SCENES) {
            logger.scene('Feature flag active - bypassing hello scene for tunnel start');
            this.runTunnelSceneDirectly();
            return;
        }

        logger.scene('Scene 1: Hello');
        this.currentScene = 'hello';
        this.emitSceneChange('hello');
        
        this.showSkipTextOverlay();
        
        const helloText = new HangingText({
            text: "Hello!",
            fontFamily: "Times New Roman",
            physicsScaleX: 1.0,
            physicsScaleY: 1.0,
        });
        
        helloText.onFall(() => {
            if (this.skipRequested) {
                logger.scene('Hello text fell but skip requested - ignoring transition');
                return;
            }
            
            logger.scene('Hello text fell, transitioning to next scene...');
            
            if (!this.beginTransition()) {
                logger.scene('Transition blocked - skipping to brain scene');
                return;
            }
            
            this.scheduleTransition(
                APP_CONFIG.ANIMATION.SCENE_TRANSITION_DELAY,
                () => {
                    if (this.skipRequested) {
                        logger.scene('Julian scene transition cancelled due to skip');
                        this.endTransition();
                        return;
                    }
                    this.runJulianScene();
                    this.endTransition();
                },
                () => {
                    logger.scene('Julian scene transition cancelled');
                    this.endTransition();
                }
            );
        });
        
        helloText.create();
        this.hangingTexts.push(helloText);
    }
    
    /**
     * Scene 2: "I'm" and "Julian" texts appear mirrored from center
     */
    runJulianScene() {
        logger.scene('Scene 2: I\'m Julian');
        this.currentScene = 'julian';
        this.emitSceneChange('julian');

        const shiftPercentX = 7;
        
        const imText = new HangingText({
            text: "I'm",
            x: () => Responsive.centerX() - Responsive.percentX(shiftPercentX),
            y: () => Responsive.centerY(),
            fontFamily: "Times New Roman",
            fontSize: () => Responsive.fontSize(0.8),
            physicsScaleX: 0.8,
            physicsScaleY: 0.5
        });
        
        const julianText = new HangingText({
            text: "Julian",
            x: () => Responsive.centerX() + Responsive.percentX(shiftPercentX),
            y: () => Responsive.centerY(),
            fontFamily: "Times New Roman",
            fontSize: () => Responsive.fontSize(0.8),
            physicsScaleX: 0.9,
            physicsScaleY: 0.5
        });
        
        let fallCount = 0;
        const onBothFallen = () => {
            if (this.skipRequested) {
                logger.scene('Julian texts fell but skip requested - ignoring transition');
                return;
            }
            
            fallCount++;
            if (fallCount === 2) {
                logger.scene('Both texts fell, transitioning to next scene...');
                
                if (!this.beginTransition()) {
                    logger.scene('Transition blocked - skipping to brain scene');
                    return;
                }
                
                this.scheduleTransition(
                    APP_CONFIG.ANIMATION.SCENE_TRANSITION_DELAY,
                    () => {
                        if (this.skipRequested) {
                            logger.scene('Ready scene transition cancelled due to skip');
                            this.endTransition();
                            return;
                        }
                        this.runReadyScene();
                        this.endTransition();
                    },
                    () => {
                        logger.scene('Ready scene transition cancelled');
                        this.endTransition();
                    }
                );
            }
        };
        
        imText.onFall(onBothFallen);
        julianText.onFall(onBothFallen);
        
        imText.create();
        julianText.create();
        
        this.hangingTexts.push(imText, julianText);
    }
    
    /**
     * Scene 3: "Ready?" text appears in the center
     */
    runReadyScene() {
        logger.scene('Scene 3: Ready?');
        this.currentScene = 'ready';
        this.emitSceneChange('ready');
        
        if (this.groundManager.getGroundBodies().length === 0) {
            this.groundManager.create();
        }
        
        const readyText = new HangingText({
            text: "Enter?",
            x: () => Responsive.centerX(),
            y: () => Responsive.centerY(),
            fontFamily: "Times New Roman",
            fontSize: () => Responsive.fontSize(0.9),
            physicsScaleX: 1.0,
            physicsScaleY: 1.0
        });
        
        readyText.onFall(() => {
            if (this.skipRequested) {
                logger.scene('Ready text fell but skip requested - ignoring transition');
                return;
            }
            
            logger.scene('Ready? text fell, sequence complete!');
            
            if (this.readyTextFell) {
                logger.scene('Ready text already fell, ignoring duplicate trigger');
                return;
            }
            
            this.readyTextFell = true;
            this.isTransitioning = true;
            
            this.groundManager.enableCollision();
            
            if (!this.beginTransition()) {
                logger.scene('Transition blocked - skipping to brain scene');
                return;
            }
            
            logger.scene('Starting 2-second color change timer...');
            this.scheduleTransition(
                APP_CONFIG.ANIMATION.COLOR_CHANGE_DELAY,
                () => {
                    if (this.skipRequested) {
                        logger.scene('Color change transition cancelled due to skip');
                        this.endTransition();
                        return;
                    }
                    this.triggerColorChange();
                },
                () => {
                    logger.scene('Color change transition cancelled');
                    this.endTransition();
                }
            );
            
            this.currentScene = 'complete';
            this.emitSceneChange('complete');
        });
        
        readyText.create();
        this.hangingTexts.push(readyText);
    }
    
    /**
     * Clean up collision handler
     */
    cleanupCollisionHandler() {
        if (this.collisionHandler) {
            window.Matter.Events.off(getWorld(), 'collisionStart', this.collisionHandler);
            this.collisionHandler = null;
        }
    }
    
    /**
     * Clean up color change timeout
     */
    cleanupColorChangeTimeout() {
        if (this.colorChangeTimeout) {
            clearTimeout(this.colorChangeTimeout);
            this.colorChangeTimeout = null;
        }
    }
    
    /**
     * Trigger color change to black text/strings and white background
     */
    triggerColorChange() {
        logger.scene('Triggering color change!');
        logger.scene('COLOR DEBUG: Before change:');
        this.debugColors();
        
        try {
            document.body.style.backgroundColor = 'white';
        getRender().options.background = 'white';
            
            this.hangingTexts.forEach(hangingText => {
                if (hangingText && hangingText.setColors) {
                    hangingText.setColors({
                        color: 'black',
                        strokeColor: 'black',
                        glowColor: 'black',
                        stringColor: 'black',
                        sparkColor: 'black'
                    });
                }
            });
            
            if (this.backgroundParticles) {
                this.backgroundParticles.setColors([
                    'black',
                    'black',
                    'black',
                    'black',
                    'black'
                ]);
            }
            
            const sparkCount = getWorld().bodies.filter(body => body.label === 'spark').length;
            let changedSparks = 0;
            getWorld().bodies.forEach(body => {
                if (body.label === 'spark' && body.render) {
                    body.render.fillStyle = 'black';
                    body.render.strokeStyle = 'black';
                    changedSparks++;
                }
            });
            
            logger.scene('Color change completed successfully');
            logger.scene('COLOR DEBUG: After change:');
            this.debugColors();
            logger.scene(`Changed ${changedSparks}/${sparkCount} sparks to black`);
        } catch (error) {
            logger.error('Error during color change:', error);
        }
        
        this.isTransitioning = false;
        this.colorChangeTimeout = null;
        
        logger.scene('Starting tunnel effect timer...');
        this.scheduleTransition(
            APP_CONFIG.ANIMATION.TUNNEL_EFFECT_DELAY,
            () => {
                if (this.skipRequested) {
                    logger.scene('Tunnel effect transition cancelled due to skip');
                    this.endTransition();
                    return;
                }
                this.startTunnelEffect();
            },
            () => {
                logger.scene('Tunnel effect transition cancelled');
                this.endTransition();
            }
        );
    }
    
    /**
     * Start the tunnel effect
     */
    startTunnelEffect() {
        if (this.skipRequested) {
            logger.scene('Tunnel effect start cancelled due to skip');
            return;
        }
        
        logger.scene('Starting tunnel effect');
        
        try {
            if (!this.tunnelEffect) {
                this.tunnelEffect = new TunnelEffect();
            }
            
            this.tunnelEffect.init();
            
            this.currentScene = 'tunnel';
            this.emitSceneChange('tunnel');
            
        } catch (error) {
            logger.error('Error starting tunnel effect:', error);
        }
        
        this.tunnelTimeout = null;
    }
    
    /**
     * Clean up tunnel effect timeout
     */
    cleanupTunnelTimeout() {
        if (this.tunnelTimeout) {
            clearTimeout(this.tunnelTimeout);
            this.tunnelTimeout = null;
            logger.scene('Tunnel effect timeout cleared');
        }
    }
    
    /**
     * Force cleanup tunnel effect
     * @returns {boolean} - True if tunnel effect was cleaned up
     */
    forceCleanupTunnelEffect() {
        if (this.tunnelEffect) {
            logger.scene('Force cleaning up tunnel effect...');
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
            return true;
        }
        return false;
    }

    /**
     * Start fluid simulation during tunnel fade-out phase with optimized timing
     */
    async startFluidSimulation() {
        if (this.skipRequested) {
            logger.scene('Fluid simulation start cancelled due to skip');
            return;
        }
        
        logger.scene('Starting fluid simulation transition with optimized timing...');
        
        // Defer heavy operations to next frame for better performance
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        try {
            if (!this.fluidIntegration) {
                this.fluidIntegration = new FluidIntegration();
            }
            
            if (!this.brainManager) {
                this.brainManager = new BrainManager();
                await this.brainManager.init();
            }
            
            await this.fluidIntegration.start();
            
            if (this.brainManager) {
                this.brainManager.fadeIn(2.0);
            }
            
            this.currentScene = 'fluid';
            this.emitSceneChange('fluid');
            
        } catch (error) {
            logger.error('Error starting fluid simulation:', error);
        }
    }

    /**
     * Clean up fluid simulation
     */
    cleanupFluidSimulation() {
        if (this.fluidIntegration) {
            this.fluidIntegration.destroy();
            this.fluidIntegration = null;
            logger.scene('Fluid simulation cleaned up');
        }
        
        if (this.brainManager) {
            this.brainManager.destroy();
            this.brainManager = null;
            logger.scene('Brain manager cleaned up');
        }
    }
    
    /**
     * Skip directly to brain scene
     */
    async skipToBrainScene() {
        logger.scene('Skipping to brain scene...');
        
        this.skipRequested = true;
        this.cancelAllPendingTransitions();
        
        if (this.tunnelEffect) {
            logger.scene('Cleaning up tunnel effect before skip...');
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
        }
        
        this.cleanupAll();
        
        document.body.style.backgroundColor = 'black';
        getRender().options.background = 'black';
        
        if (!this.fluidIntegration) {
            this.fluidIntegration = new FluidIntegration();
        }
        
        if (!this.brainManager) {
            this.brainManager = new BrainManager();
            await this.brainManager.init();
        }
        
        await this.fluidIntegration.start();
        
        if (this.brainManager) {
            this.brainManager.enableControls(false);
            this.brainManager.setAutoRotate(true);
            this.brainManager.fadeIn(2.0);
        }
        
        this.currentScene = 'fluid';
        this.emitSceneChange('fluid');
        
        this.endTransition();
        this.skipRequested = false;
        
        logger.scene('Successfully skipped to brain scene with fluid simulation and interactivity enabled');
    }
    
    /**
     * Debug color states
     */
    debugColors() {
        logger.scene('=== COLOR DEBUG INFO ===');
        logger.scene('Body background:', document.body.style.backgroundColor || 'default');
        logger.scene('Render background:', getRender().options.background || 'default');
        
        if (this.backgroundParticles) {
            logger.scene('Background particles colors:', this.backgroundParticles.colors);
            logger.scene('Background particles count:', this.backgroundParticles.particles.length);
        } else {
            logger.scene('Background particles: destroyed/removed');
        }
        
        logger.scene('Hanging texts:');
        this.hangingTexts.forEach((text, index) => {
            logger.scene(`  ${index}: "${text.options.text}" - color: ${text.options.color}, string: ${text.options.stringColor}, spark: ${text.options.sparkColor}`);
        });
        
        const sparks = getWorld().bodies.filter(body => body.label === 'spark');
        const sparkColors = {};
        sparks.forEach(spark => {
            const color = spark.render?.fillStyle || 'unknown';
            sparkColors[color] = (sparkColors[color] || 0) + 1;
        });
        logger.scene('Spark colors:', sparkColors);
        logger.scene('=======================');
    }
    
    /**
     * Add a new hanging text to the scene
     * @param {HangingText} hangingText - The hanging text to add
     */
    addHangingText(hangingText) {
        this.hangingTexts.push(hangingText);
    }
    
    /**
     * Remove a hanging text from the scene
     * @param {HangingText} hangingText - The hanging text to remove
     */
    removeHangingText(hangingText) {
        const index = this.hangingTexts.indexOf(hangingText);
        if (index > -1) {
            hangingText.destroy();
            this.hangingTexts.splice(index, 1);
        }
    }
    
    /**
     * Remove all hanging texts
     */
    clearAllHangingTexts() {
        this.hangingTexts.forEach(ht => ht.destroy());
        this.hangingTexts.length = 0;
    }
    
    /**
     * Clean up all physics objects (texts, sparks, strings) and reset colors
     */
    cleanupAll() {
        logger.scene('Cleaning up all physics objects and resetting colors...');
        
        this.clearAllHangingTexts();
        
        const sparks = getWorld().bodies.filter(body => body.label === 'spark');
        sparks.forEach(spark => {
            try {
                Composite.remove(getWorld(), spark);
            } catch (error) {
                logger.warn('Error removing spark:', error);
            }
        });
        logger.scene(`Removed ${sparks.length} sparks from world`);
        
        document.body.style.backgroundColor = '';
        getRender().options.background = 'rgba(0, 0, 0, 1)';
        
        if (this.backgroundParticles) {
            this.backgroundParticles.destroy();
            logger.scene('Background particles cleared');
        }
        
        this.hangingTexts.forEach(hangingText => {
            if (hangingText && hangingText.setColors) {
                hangingText.setColors({
                    color: APP_CONFIG.COLORS.DEFAULT_GOLD,
                    strokeColor: APP_CONFIG.COLORS.DEFAULT_STROKE,
                    glowColor: APP_CONFIG.COLORS.DEFAULT_GOLD,
                    stringColor: APP_CONFIG.COLORS.DEFAULT_STRING,
                    sparkColor: APP_CONFIG.COLORS.DEFAULT_GOLD
                });
            }
        });
        
        getWorld().bodies.forEach(body => {
            if (body.label === 'spark' && body.render) {
                body.render.fillStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
                body.render.strokeStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
            }
        });
        
        this.cleanupFluidSimulation();
        
        if (this.tunnelEffect && !this.isInTransition()) {
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
            logger.scene('Tunnel effect cleaned up');
        }
        
        logger.scene('Cleanup completed - all physics objects removed and colors reset');
    }
    
    /**
     * Get all hanging texts
     * @returns {HangingText[]} - Array of hanging texts
     */
    getHangingTexts() {
        return this.hangingTexts;
    }
    
    /**
     * Update for window resize
     * @param {Object} oldDimensions - Previous dimensions
     * @param {Object} newDimensions - New dimensions
     */
    updateForResize(oldDimensions, newDimensions) {
        logger.scene(`Resize during transition state: ${this.transitionState}, skip requested: ${this.skipRequested}`);
        
        if (this.isInTransition()) {
            logger.scene('Resize during transition - performing minimal cleanup');
            this.cleanupColorChangeTimeout();
            this.cleanupTunnelTimeout();
        } else {
            this.cleanupCollisionHandler();
            this.cleanupColorChangeTimeout();
            this.cleanupTunnelTimeout();
        }
        
        this.hangingTexts.forEach(hangingText => {
            hangingText.updateForResize(oldDimensions, newDimensions);
        });
        
        if (this.groundManager.getGroundBodies().length > 0) {
            this.groundManager.updateForResize();
        }
        
        if (this.tunnelEffect) {
            logger.scene('Tunnel effect active during resize - preserving');
        }
        
        if (this.fluidIntegration) {
            this.fluidIntegration.updateForResize();
        }
        
        if (this.brainManager) {
            this.brainManager.updateForResize();
        }
    }
    
    /**
     * Clean up off-screen hanging texts
     */
    cleanupOffScreenTexts() {
        for (let i = this.hangingTexts.length - 1; i >= 0; i--) {
            const hangingText = this.hangingTexts[i];
            if (hangingText.isOffScreen()) {
                this.hangingTexts.splice(i, 1);
                hangingText.destroy();
            }
        }
    }
    
    /**
     * Dynamically set physics scaling for text by index
     * @param {number} textIndex - Index of the text
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    setPhysicsScaling(textIndex, scaleX, scaleY) {
        if (textIndex >= 0 && textIndex < this.hangingTexts.length) {
            const hangingText = this.hangingTexts[textIndex];
            hangingText.setPhysicsScaling(scaleX, scaleY);
            logger.scene(`Set physics scaling for text ${textIndex} to ${scaleX}x${scaleY}`);
        } else {
            logger.warn(`Invalid text index: ${textIndex}`);
        }
    }
    
    /**
     * Dynamically set physics scaling for text by content
     * @param {string} textContent - Text content to find
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    setPhysicsScalingByText(textContent, scaleX, scaleY) {
        const hangingText = this.hangingTexts.find(ht => ht.options.text === textContent);
        if (hangingText) {
            hangingText.setPhysicsScaling(scaleX, scaleY);
            logger.scene(`Set physics scaling for "${textContent}" to ${scaleX}x${scaleY}`);
        } else {
            logger.warn(`Text "${textContent}" not found`);
        }
    }
    
    /**
     * Dynamically set physics scaling for all texts
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     */
    setPhysicsScalingForAll(scaleX, scaleY) {
        this.hangingTexts.forEach((hangingText, index) => {
            hangingText.setPhysicsScaling(scaleX, scaleY);
        });
        logger.scene(`Set physics scaling for all texts to ${scaleX}x${scaleY}`);
    }
    
    /**
     * Reset the scene manager
     */
    reset() {
        logger.scene('Resetting scene manager...');
        this.clearAllHangingTexts();
        this.currentScene = 'hello';
        this.isRunning = false;
        this.emitSceneChange('reset');
    }
    
    /**
     * Get current scene
     * @returns {string} - Current scene name
     */
    getCurrentScene() {
        return this.currentScene;
    }
    
    /**
     * Check if a specific scene is active
     * @param {string} sceneName - Scene name to check
     * @returns {boolean} - True if scene is active
     */
    isScene(sceneName) {
        return this.currentScene === sceneName;
    }
    
    /**
     * Check if we're in a critical transition (tunnel or brain scene)
     * @returns {boolean} - True if in critical transition
     */
    isInCriticalTransition() {
        return this.currentScene === 'tunnel' || this.currentScene === 'fluid';
    }
    
    /**
     * Draw all hanging texts
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawAllTexts(ctx) {
        this.hangingTexts.forEach(hangingText => {
            hangingText.drawStrings(ctx);
            hangingText.drawText(ctx);
        });
    }
    
    /**
     * Cleanup resources and destroy the scene manager
     */
    destroy() {
        logger.scene('Destroying scene manager...');
        
        this.cancelAllPendingTransitions();
        this.cleanupCollisionHandler();
        this.cleanupColorChangeTimeout();
        this.cleanupTunnelTimeout();
        
        if (this.tunnelEffect) {
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
        }
        
        this.cleanupFluidSimulation();
        this.clearAllHangingTexts();
        this.groundManager.destroy();
        
        this.eventListeners.forEach(({ element, event, handler, isMatterEvent }) => {
            if (isMatterEvent) {
                window.Matter.Events.off(element, event, handler);
            } else {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
        this.onSceneChangeCallback = null;
        
        this.endTransition();
        this.skipRequested = false;
    }
} 
