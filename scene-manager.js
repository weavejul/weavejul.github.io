import { HangingText } from './hanging-text.js';
import { Responsive } from './responsive.js';
import { world, render, Composite } from './config.js';
import { GroundManager } from './ground-manager.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';
import { TunnelEffect } from './tunnel-effect.js';

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
        this.backgroundParticles = backgroundParticles;
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
    
    // Run the complete sequence
    run() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        logger.scene('Starting scene sequence...');
        this.runHelloScene();
    }
    
    // Scene 1: Hello text appears and waits to be clicked
    runHelloScene() {
        logger.scene('Scene 1: Hello');
        this.currentScene = 'hello';
        this.emitSceneChange('hello');
        
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
            logger.scene('Hello text fell, transitioning to Julian scene...');
            // Add delay before next scene for dramatic effect
            setTimeout(() => {
                this.runJulianScene();
            }, APP_CONFIG.ANIMATION.SCENE_TRANSITION_DELAY);
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
            fallCount++;
            if (fallCount === 2) {
                logger.scene('Both Julian texts fell, transitioning to Ready scene...');
                // Add delay before next scene for dramatic effect
                setTimeout(() => {
                    this.runReadyScene();
                }, APP_CONFIG.ANIMATION.SCENE_TRANSITION_DELAY);
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
            
            // Start 2-second timer for color change immediately (not after collision)
            logger.scene('Starting 2-second color change timer...');
            this.colorChangeTimeout = setTimeout(() => {
                this.triggerColorChange();
            }, APP_CONFIG.ANIMATION.COLOR_CHANGE_DELAY);
            
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
        this.tunnelTimeout = setTimeout(() => {
            this.startTunnelEffect();
        }, APP_CONFIG.ANIMATION.TUNNEL_EFFECT_DELAY);
    }
    
    // Start the tunnel effect
    startTunnelEffect() {
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
    
    // Debug color states
    debugColors() {
        logger.scene('=== COLOR DEBUG INFO ===');
        logger.scene('Body background:', document.body.style.backgroundColor || 'default');
        logger.scene('Render background:', render.options.background || 'default');
        
        if (this.backgroundParticles) {
            logger.scene('Background particles colors:', this.backgroundParticles.colors);
            logger.scene('Background particles count:', this.backgroundParticles.particles.length);
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
        
        // Reset background particles to original colors
        if (this.backgroundParticles) {
            this.backgroundParticles.setColors(APP_CONFIG.COLORS.PARTICLE_COLORS);
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
        
        logger.scene('Cleanup completed - all physics objects removed and colors reset');
    }
    
    // Get all hanging texts
    getHangingTexts() {
        return this.hangingTexts;
    }
    
    // Update for window resize
    updateForResize(oldDimensions, newDimensions) {
        // Clean up collision handler during resize
        this.cleanupCollisionHandler();
        
        // Clean up color change timeout during resize
        this.cleanupColorChangeTimeout();
        
        // Clean up tunnel effect timeout during resize
        this.cleanupTunnelTimeout();
        
        this.hangingTexts.forEach(hangingText => {
            hangingText.updateForResize(oldDimensions, newDimensions);
        });
        
        // Update ground bodies for new screen size
        if (this.groundManager.getGroundBodies().length > 0) {
            this.groundManager.updateForResize();
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
    }
} 