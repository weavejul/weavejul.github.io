import { HangingText } from './hanging-text.js';
import { Responsive } from './responsive.js';
import { world, render, Composite } from './config.js';
import { GroundManager } from './ground-manager.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';
import { TunnelEffect } from './tunnel-effect.js';
import { FluidIntegration } from './fluid-integration.js';
import { BrainManager } from './brain-manager.js';

// SceneManager class to orchestrate the sequence of text appearances
export class SceneManager {
    constructor(backgroundParticles = null) {
        this.hangingTexts = [];
        this.currentScene = 'hello';
        this.isRunning = false;
        this.eventListeners = [];
        this.onSceneChangeCallback = null;
        this.groundManager = new GroundManager();
        this.readyTextFell = false;
        this.isTransitioning = false;
        this.collisionHandler = null;
        this.colorChangeTimeout = null;
        this.tunnelTimeout = null;
        this.tunnelEffect = null;
        this.fluidIntegration = null;
        this.brainManager = null;
        this.backgroundParticles = backgroundParticles;
        
        // Transition management
        this.transitionState = 'idle'; // 'idle', 'transitioning', 'skipping'
        this.pendingTransitions = new Set();
        this.transitionCallbacks = new Map();
        this.skipRequested = false;
        
        // Skip text overlay
        this.skipTextOverlay = {
            visible: false,
            startTime: null,
            fadeInDuration: 500, // 0.5 seconds
            displayDuration: 3000, // 3 seconds
            fadeOutDuration: 1000, // 1 second
            totalDuration: 4500, // 4.5 seconds total
            alpha: undefined // Added for rendering
        };
    }
    
    // Set callback for scene changes
    onSceneChange(callback) {
        this.onSceneChangeCallback = callback;
        return this;
    }
    
    // Emit scene change event
    emitSceneChange(scene) {
        if (this.onSceneChangeCallback) {
            this.onSceneChangeCallback(scene);
        }
    }
    
    // Transition management methods
    isInTransition() {
        return this.transitionState !== 'idle' || this.skipRequested;
    }
    
    canStartTransition() {
        return this.transitionState === 'idle' && !this.skipRequested;
    }
    
    beginTransition(type = 'normal') {
        if (this.skipRequested) {
            logger.scene(`Transition blocked - skip requested`);
            return false;
        }
        
        this.transitionState = type === 'skip' ? 'skipping' : 'transitioning';
        logger.scene(`Transition started: ${this.transitionState}`);
        return true;
    }
    
    endTransition() {
        this.transitionState = 'idle';
        this.pendingTransitions.clear();
        this.transitionCallbacks.clear();
        logger.scene('Transition ended');
    }
    
    cancelAllPendingTransitions() {
        logger.scene('Cancelling all pending transitions...');
        
        // Clear all timeouts
        this.cleanupColorChangeTimeout();
        this.cleanupTunnelTimeout();
        
        // Clear all pending transitions
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
    
    // Run the complete sequence
    run() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        logger.scene('Starting scene sequence...');
        this.runHelloScene();
    }
    
    // Show skip text overlay
    showSkipTextOverlay() {
        this.skipTextOverlay.visible = true;
        this.skipTextOverlay.startTime = performance.now();
        logger.scene('Skip text overlay started');
    }
    
    // Update skip text overlay (called during render)
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
            // Fade in phase
            alpha = elapsed / this.skipTextOverlay.fadeInDuration;
        } else if (elapsed < this.skipTextOverlay.fadeInDuration + this.skipTextOverlay.displayDuration) {
            // Display phase
            alpha = 1;
        } else {
            // Fade out phase
            const fadeOutElapsed = elapsed - (this.skipTextOverlay.fadeInDuration + this.skipTextOverlay.displayDuration);
            alpha = 1 - (fadeOutElapsed / this.skipTextOverlay.fadeOutDuration);
        }
        
        // Store alpha for rendering
        this.skipTextOverlay.alpha = Math.max(0, Math.min(1, alpha));
    }
    
    // Draw skip text overlay
    drawSkipTextOverlay(ctx) {
        if (!this.skipTextOverlay.visible || this.skipTextOverlay.alpha === undefined) {
            return;
        }
        
        ctx.save();
        
        // Set font to match panel-content
        ctx.font = '14px "Courier New", "Courier", monospace';
        ctx.fillStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = this.skipTextOverlay.alpha;
        
        // Position in top left with some padding
        const x = 20;
        const y = 20;
        const text = "press s to skip";
        
        // Add subtle glow effect
        ctx.shadowColor = APP_CONFIG.COLORS.DEFAULT_GOLD;
        ctx.shadowBlur = 5;
        
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }
    
    // Scene 1: Hello text appears and waits to be clicked
    runHelloScene() {
        logger.scene('Scene 1: Hello');
        this.currentScene = 'hello';
        this.emitSceneChange('hello');
        
        // Show skip text overlay
        this.showSkipTextOverlay();
        
        // Create "Hello!" text with enlarged physics body for easier clicking
        const helloText = new HangingText({
            text: "Hello!",
            fontFamily: "Times New Roman",
            physicsScaleX: 1.0,  // 20% wider physics body
            physicsScaleY: 1.0,  // 30% taller physics body
            // All other options use responsive defaults
        });
        
        // Set up fall callback to trigger next scene
        helloText.onFall(() => {
            if (this.skipRequested) {
                logger.scene('Hello text fell but skip requested - ignoring transition');
                return;
            }
            
            logger.scene('Hello text fell, transitioning to Julian scene...');
            
            if (!this.beginTransition()) {
                logger.scene('Transition blocked - skipping to brain scene');
                return;
            }
            
            // Schedule transition with proper cleanup
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
    
    // Scene 2: "I'm" and "Julian" texts appear mirrored from center
    runJulianScene() {
        logger.scene('Scene 2: I\'m Julian');
        this.currentScene = 'julian';
        this.emitSceneChange('julian');

        const shiftPercentX = 7;
        
        // Position "I'm" to the left of center with narrow physics body
        const imText = new HangingText({
            text: "I'm",
            x: () => Responsive.centerX() - Responsive.percentX(shiftPercentX), // 20% left of center
            y: () => Responsive.centerY(),
            fontFamily: "Times New Roman",
            fontSize: () => Responsive.fontSize(0.8), // Slightly smaller than Hello
            physicsScaleX: 0.8,  // 20% narrower physics body
            physicsScaleY: 0.5   // 50% taller physics body
        });
        
        // Position "Julian" to the right of center with wide physics body
        const julianText = new HangingText({
            text: "Julian",
            x: () => Responsive.centerX() + Responsive.percentX(shiftPercentX), // 20% right of center
            y: () => Responsive.centerY(),
            fontFamily: "Times New Roman",
            fontSize: () => Responsive.fontSize(0.8), // Slightly smaller than Hello
            physicsScaleX: 0.9,  // 40% wider physics body
            physicsScaleY: 0.5   // 10% shorter physics body
        });
        
        // Set up fall callbacks for transition to Ready scene
        let fallCount = 0;
        const onBothFallen = () => {
            if (this.skipRequested) {
                logger.scene('Julian texts fell but skip requested - ignoring transition');
                return;
            }
            
            fallCount++;
            if (fallCount === 2) {
                logger.scene('Both Julian texts fell, transitioning to Ready scene...');
                
                if (!this.beginTransition()) {
                    logger.scene('Transition blocked - skipping to brain scene');
                    return;
                }
                
                // Schedule transition with proper cleanup
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
        
        // Create both texts
        imText.create();
        julianText.create();
        
        this.hangingTexts.push(imText, julianText);
    }
    
    // Scene 3: "Ready?" text appears in the center
    runReadyScene() {
        logger.scene('Scene 3: Ready?');
        this.currentScene = 'ready';
        this.emitSceneChange('ready');
        
        // Create ground bodies if not already created
        if (this.groundManager.getGroundBodies().length === 0) {
            this.groundManager.create();
        }
        
        // Create "Ready?" text in the center
        const readyText = new HangingText({
            text: "Enter?",
            x: () => Responsive.centerX(), // Center position
            y: () => Responsive.centerY(),
            fontFamily: "Times New Roman",
            fontSize: () => Responsive.fontSize(0.9), // Slightly smaller than Hello but bigger than I'm/Julian
            physicsScaleX: 1.0,  // Slightly enlarged physics body
            physicsScaleY: 1.0
        });
        
        // Set up fall callback for final scene
        readyText.onFall(() => {
            if (this.skipRequested) {
                logger.scene('Ready text fell but skip requested - ignoring transition');
                return;
            }
            
            logger.scene('Ready? text fell, sequence complete!');
            
            // Prevent multiple triggers
            if (this.readyTextFell) {
                logger.scene('Ready text already fell, ignoring duplicate trigger');
                return;
            }
            
            this.readyTextFell = true;
            this.isTransitioning = true;
            
            // Enable ground collision so the text hits the bottom
            this.groundManager.enableCollision();
            
            if (!this.beginTransition()) {
                logger.scene('Transition blocked - skipping to brain scene');
                return;
            }
            
            // Start 2-second timer for color change immediately (not after collision)
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
    
    // Clean up collision handler
    cleanupCollisionHandler() {
        if (this.collisionHandler) {
            window.Matter.Events.off(world, 'collisionStart', this.collisionHandler);
            this.collisionHandler = null;
        }
    }
    
    // Clean up color change timeout
    cleanupColorChangeTimeout() {
        if (this.colorChangeTimeout) {
            clearTimeout(this.colorChangeTimeout);
            this.colorChangeTimeout = null;
        }
    }
    
    // Trigger color change to black text/strings and white background
    triggerColorChange() {
        logger.scene('Triggering color change!');
        logger.scene('COLOR DEBUG: Before change:');
        this.debugColors();
        
        try {
            // Change background to white
            document.body.style.backgroundColor = 'white';
            
            // Change render background to white
            render.options.background = 'white';
            
            // Change all hanging texts to black
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
            
            // Change background particles and sparks to black
            if (this.backgroundParticles) {
                this.backgroundParticles.setColors([
                    'black',
                    'black',
                    'black',
                    'black',
                    'black'
                ]);
            }
            
            // Change existing sparks in the world to black
            const sparkCount = world.bodies.filter(body => body.label === 'spark').length;
            let changedSparks = 0;
            world.bodies.forEach(body => {
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
        
        // Clean up the timeout reference
        this.colorChangeTimeout = null;
        
        // Start tunnel effect after a delay
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
    
    // Start the tunnel effect
    startTunnelEffect() {
        if (this.skipRequested) {
            logger.scene('Tunnel effect start cancelled due to skip');
            return;
        }
        
        logger.scene('Starting psychedelic tunnel effect!');
        
        try {
            // Initialize tunnel effect if not already created
            if (!this.tunnelEffect) {
                this.tunnelEffect = new TunnelEffect();
            }
            
            // Start the tunnel effect
            this.tunnelEffect.init();
            
            // Update scene state
            this.currentScene = 'tunnel';
            this.emitSceneChange('tunnel');
            
        } catch (error) {
            logger.error('Error starting tunnel effect:', error);
        }
        
        // Clean up the timeout reference
        this.tunnelTimeout = null;
    }
    
    // Clean up tunnel effect timeout
    cleanupTunnelTimeout() {
        if (this.tunnelTimeout) {
            clearTimeout(this.tunnelTimeout);
            this.tunnelTimeout = null;
            logger.scene('Tunnel effect timeout cleared');
        }
    }
    
    // Force cleanup tunnel effect
    forceCleanupTunnelEffect() {
        if (this.tunnelEffect) {
            logger.scene('Force cleaning up tunnel effect...');
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
            return true;
        }
        return false;
    }

    // Start fluid simulation during tunnel fade-out phase
    async startFluidSimulation() {
        if (this.skipRequested) {
            logger.scene('Fluid simulation start cancelled due to skip');
            return;
        }
        
        logger.scene('Starting fluid simulation transition...');
        
        try {
            // Initialize fluid integration if not already created
            if (!this.fluidIntegration) {
                this.fluidIntegration = new FluidIntegration();
            }
            
            // Initialize brain manager
            if (!this.brainManager) {
                this.brainManager = new BrainManager();
                await this.brainManager.init();
            }
            
            // Start the fluid simulation with fade in
            await this.fluidIntegration.start();
            
            // Fade in the brain at the same time as fluid simulation
            if (this.brainManager) {
                this.brainManager.fadeIn(2.0); // Match fluid simulation fade duration
            }
            
            // Update scene state
            this.currentScene = 'fluid';
            this.emitSceneChange('fluid');
            
        } catch (error) {
            logger.error('Error starting fluid simulation:', error);
        }
    }

    // Clean up fluid simulation
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
    
    // Skip directly to brain scene
    async skipToBrainScene() {
        logger.scene('Skipping to brain scene...');
        
        // Set skip flag to prevent new transitions
        this.skipRequested = true;
        
        // Cancel all pending transitions immediately
        this.cancelAllPendingTransitions();
        
        // Always clean up tunnel effect if it exists (regardless of current scene)
        if (this.tunnelEffect) {
            logger.scene('Cleaning up tunnel effect before skip...');
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
        }
        
        // Comprehensive cleanup of all physics objects
        this.cleanupAll();
        
        // Reset background to black
        document.body.style.backgroundColor = 'black';
        render.options.background = 'black';
        
        // Initialize fluid integration
        if (!this.fluidIntegration) {
            this.fluidIntegration = new FluidIntegration();
        }
        
        // Initialize brain manager
        if (!this.brainManager) {
            this.brainManager = new BrainManager();
            await this.brainManager.init();
        }
        
        // Start the fluid simulation
        await this.fluidIntegration.start();
        
        // Enable auto-rotation and fade in the brain (controls disabled to preserve fluid interaction)
        if (this.brainManager) {
            this.brainManager.enableControls(false); // Disable controls to preserve fluid interaction
            this.brainManager.setAutoRotate(true);
            this.brainManager.fadeIn(2.0); // Match fluid simulation fade duration
        }
        
        // Update scene state
        this.currentScene = 'fluid';
        this.emitSceneChange('fluid');
        
        // Reset transition state
        this.endTransition();
        this.skipRequested = false;
        
        logger.scene('Successfully skipped to brain scene with fluid simulation and interactivity enabled');
    }
    
    // Debug color states
    debugColors() {
        logger.scene('=== COLOR DEBUG INFO ===');
        logger.scene('Body background:', document.body.style.backgroundColor || 'default');
        logger.scene('Render background:', render.options.background || 'default');
        
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
        
        const sparks = world.bodies.filter(body => body.label === 'spark');
        const sparkColors = {};
        sparks.forEach(spark => {
            const color = spark.render?.fillStyle || 'unknown';
            sparkColors[color] = (sparkColors[color] || 0) + 1;
        });
        logger.scene('Spark colors:', sparkColors);
        logger.scene('=======================');
    }
    
    // Add a new hanging text to the scene
    addHangingText(hangingText) {
        this.hangingTexts.push(hangingText);
    }
    
    // Remove a hanging text from the scene
    removeHangingText(hangingText) {
        const index = this.hangingTexts.indexOf(hangingText);
        if (index > -1) {
            hangingText.destroy();
            this.hangingTexts.splice(index, 1);
        }
    }
    
    // Remove all hanging texts
    clearAllHangingTexts() {
        this.hangingTexts.forEach(ht => ht.destroy());
        this.hangingTexts.length = 0;
    }
    
    // Clean up all physics objects (texts, sparks, strings) and reset colors
    cleanupAll() {
        logger.scene('Cleaning up all physics objects and resetting colors...');
        
        // Clear all hanging texts
        this.clearAllHangingTexts();
        
        // Remove all sparks from the world
        const sparks = world.bodies.filter(body => body.label === 'spark');
        sparks.forEach(spark => {
            try {
                Composite.remove(world, spark);
            } catch (error) {
                logger.warn('Error removing spark:', error);
            }
        });
        logger.scene(`Removed ${sparks.length} sparks from world`);
        
        // Reset background to black
        document.body.style.backgroundColor = '';
        render.options.background = 'rgba(0, 0, 0, 1)';
        
        // Clear background particles
        if (this.backgroundParticles) {
            this.backgroundParticles.destroy();
            logger.scene('Background particles cleared');
        }
        
        // Reset any remaining hanging text colors to original palette
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
        
        // Reset any remaining sparks to original colors
        world.bodies.forEach(body => {
            if (body.label === 'spark' && body.render) {
                body.render.fillStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
                body.render.strokeStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
            }
        });
        
        // Clean up fluid simulation if active
        this.cleanupFluidSimulation();
        
        // Clean up tunnel effect if active (unless we're in a transition)
        if (this.tunnelEffect && !this.isInTransition()) {
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
            logger.scene('Tunnel effect cleaned up');
        }
        
        logger.scene('Cleanup completed - all physics objects removed and colors reset');
    }
    
    // Get all hanging texts
    getHangingTexts() {
        return this.hangingTexts;
    }
    
    // Update for window resize
    updateForResize(oldDimensions, newDimensions) {
        logger.scene(`Resize during transition state: ${this.transitionState}, skip requested: ${this.skipRequested}`);
        
        // If we're in a transition, be more careful about cleanup
        if (this.isInTransition()) {
            logger.scene('Resize during transition - performing minimal cleanup');
            
            // Only clean up timeouts, don't cancel transitions
            this.cleanupColorChangeTimeout();
            this.cleanupTunnelTimeout();
        } else {
            // Normal resize cleanup
            this.cleanupCollisionHandler();
            this.cleanupColorChangeTimeout();
            this.cleanupTunnelTimeout();
        }
        
        this.hangingTexts.forEach(hangingText => {
            hangingText.updateForResize(oldDimensions, newDimensions);
        });
        
        // Update ground bodies for new screen size
        if (this.groundManager.getGroundBodies().length > 0) {
            this.groundManager.updateForResize();
        }
        
        // Update tunnel effect if active
        if (this.tunnelEffect) {
            // Don't destroy tunnel effect during resize, just update it
            logger.scene('Tunnel effect active during resize - preserving');
        }
        
        // Update fluid integration if active
        if (this.fluidIntegration) {
            this.fluidIntegration.updateForResize();
        }
        
        // Update brain manager if active
        if (this.brainManager) {
            this.brainManager.updateForResize();
        }
    }
    
    // Clean up off-screen hanging texts
    cleanupOffScreenTexts() {
        for (let i = this.hangingTexts.length - 1; i >= 0; i--) {
            const hangingText = this.hangingTexts[i];
            if (hangingText.isOffScreen()) {
                this.hangingTexts.splice(i, 1);
                hangingText.destroy();
            }
        }
    }
    
    // Dynamically set physics scaling for text by index
    setPhysicsScaling(textIndex, scaleX, scaleY) {
        if (textIndex >= 0 && textIndex < this.hangingTexts.length) {
            const hangingText = this.hangingTexts[textIndex];
            hangingText.setPhysicsScaling(scaleX, scaleY);
            logger.scene(`Set physics scaling for text ${textIndex} to ${scaleX}x${scaleY}`);
        } else {
            logger.warn(`Invalid text index: ${textIndex}`);
        }
    }
    
    // Dynamically set physics scaling for text by content
    setPhysicsScalingByText(textContent, scaleX, scaleY) {
        const hangingText = this.hangingTexts.find(ht => ht.options.text === textContent);
        if (hangingText) {
            hangingText.setPhysicsScaling(scaleX, scaleY);
            logger.scene(`Set physics scaling for "${textContent}" to ${scaleX}x${scaleY}`);
        } else {
            logger.warn(`Text "${textContent}" not found`);
        }
    }
    
    // Dynamically set physics scaling for all texts
    setPhysicsScalingForAll(scaleX, scaleY) {
        this.hangingTexts.forEach((hangingText, index) => {
            hangingText.setPhysicsScaling(scaleX, scaleY);
        });
        logger.scene(`Set physics scaling for all texts to ${scaleX}x${scaleY}`);
    }
    
    // Reset the scene manager
    reset() {
        logger.scene('Resetting scene manager...');
        this.clearAllHangingTexts();
        this.currentScene = 'hello';
        this.isRunning = false;
        this.emitSceneChange('reset');
    }
    
    // Get current scene
    getCurrentScene() {
        return this.currentScene;
    }
    
    // Check if a specific scene is active
    isScene(sceneName) {
        return this.currentScene === sceneName;
    }
    
    // Check if we're in a critical transition (tunnel or brain scene)
    isInCriticalTransition() {
        return this.currentScene === 'tunnel' || this.currentScene === 'fluid';
    }
    
    // Draw all hanging texts
    drawAllTexts(ctx) {
        this.hangingTexts.forEach(hangingText => {
            hangingText.drawStrings(ctx);
            hangingText.drawText(ctx);
        });
    }
    
    // Cleanup resources
    destroy() {
        logger.scene('Destroying scene manager...');
        
        // Cancel all pending transitions
        this.cancelAllPendingTransitions();
        
        // Clean up collision handler
        this.cleanupCollisionHandler();
        
        // Clean up color change timeout
        this.cleanupColorChangeTimeout();
        
        // Clean up tunnel effect timeout
        this.cleanupTunnelTimeout();
        
        // Clean up tunnel effect
        if (this.tunnelEffect) {
            this.tunnelEffect.destroy();
            this.tunnelEffect = null;
        }
        
        // Clean up fluid simulation
        this.cleanupFluidSimulation();
        
        this.clearAllHangingTexts();
        
        // Destroy ground bodies
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
        
        // Reset transition state
        this.endTransition();
        this.skipRequested = false;
    }
} 