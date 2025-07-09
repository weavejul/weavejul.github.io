import { logger } from './logger.js';

export class FluidIntegration {
    constructor() {
        this.isActive = false;
        this.canvas = null;
        this.scriptLoaded = false;
        this.fadeInDuration = 2.0;
        this.fadeOutDuration = 2.0;
        this.startTime = null;
        this.currentOpacity = 0;
        this.targetOpacity = 1;
        this.onCompleteCallback = null;
    }

    // Initialize the fluid simulation
    init() {
        logger.scene('Initializing fluid simulation integration...');
        
        // Create canvas for fluid simulation
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fluid-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1001';
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.opacity = '0';
        document.body.appendChild(this.canvas);

        // Load the fluid simulation script
        this.loadFluidScript();
        
        this.isActive = true;
        this.startTime = performance.now();
        
        logger.scene('Fluid simulation integration initialized');
    }

    // Load the fluid simulation script
    loadFluidScript() {
        if (this.scriptLoaded) return Promise.resolve();
        
        // Check if script is already loaded
        if (window.fluidSimulationScriptLoaded) {
            this.scriptLoaded = true;
            logger.scene('Fluid simulation script already loaded');
            return Promise.resolve();
        }
        
        // Check if script tag already exists
        const existingScript = document.querySelector('script[src="fluid-simulation.js"]');
        if (existingScript) {
            this.scriptLoaded = true;
            window.fluidSimulationScriptLoaded = true;
            logger.scene('Fluid simulation script already exists in DOM');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'fluid-simulation.js';
            script.onload = () => {
                this.scriptLoaded = true;
                window.fluidSimulationScriptLoaded = true;
                logger.scene('Fluid simulation script loaded');
                
                // Initialize the fluid simulation after a short delay
                setTimeout(() => {
                    if (window.initializeFluidSimulation) {
                        try {
                            window.initializeFluidSimulation();
                            logger.scene('Fluid simulation initialized');
                        } catch (error) {
                            logger.error('Failed to initialize fluid simulation:', error);
                            reject(error);
                        }
                    } else {
                        logger.error('initializeFluidSimulation function not found');
                        reject(new Error('initializeFluidSimulation function not found'));
                    }
                }, 100);
                
                resolve();
            };
            script.onerror = () => {
                logger.error('Failed to load fluid simulation script');
                reject(new Error('Failed to load fluid simulation script'));
            };
            document.head.appendChild(script);
        });
    }

    // Start the fluid simulation with fade in
    async start() {
        logger.scene('Starting fluid simulation with fade in...');
        this.init();
        
        // Wait for the script to load and initialize
        await this.loadFluidScript();
        
        this.fadeIn();
    }

    // Fade in the fluid simulation
    fadeIn() {
        this.targetOpacity = 1;
        this.animateOpacity();
    }

    // Fade out the fluid simulation
    fadeOut() {
        logger.scene('Fading out fluid simulation...');
        this.targetOpacity = 0;
        this.animateOpacity();
    }

    // Animate opacity changes
    animateOpacity() {
        const animate = () => {
            if (!this.isActive) return;
            
            const currentTime = performance.now();
            const elapsed = this.startTime ? (currentTime - this.startTime) / 1000 : 0;
            
            if (this.targetOpacity > this.currentOpacity) {
                // Fading in
                const fadeProgress = elapsed / this.fadeInDuration;
                this.currentOpacity = Math.min(this.targetOpacity, fadeProgress);
                
                if (this.canvas) {
                    this.canvas.style.opacity = this.currentOpacity;
                }
                
                if (this.currentOpacity >= this.targetOpacity) {
                    logger.scene('Fluid simulation fade in complete');
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback();
                    }
                } else {
                    requestAnimationFrame(animate);
                }
            } else {
                // Fading out
                const fadeProgress = elapsed / this.fadeOutDuration;
                this.currentOpacity = Math.max(this.targetOpacity, 1 - fadeProgress);
                
                if (this.canvas) {
                    this.canvas.style.opacity = this.currentOpacity;
                }
                
                if (this.currentOpacity <= this.targetOpacity) {
                    logger.scene('Fluid simulation fade out complete');
                    this.destroy();
                } else {
                    requestAnimationFrame(animate);
                }
            }
        };
        
        animate();
    }

    // Set callback for when fade in is complete
    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    // Clean up and destroy the fluid simulation
    destroy() {
        logger.scene('Destroying fluid simulation...');
        
        this.isActive = false;
        
        // Remove the canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Clear references
        this.canvas = null;
        this.startTime = null;
        this.currentOpacity = 0;
        this.targetOpacity = 1;
        
        logger.scene('Fluid simulation destroyed');
    }

    // Get the current state
    isRunning() {
        return this.isActive;
    }
    
    // Update for window resize
    updateForResize() {
        if (this.canvas) {
            // The fluid simulation canvas should automatically resize with the container
            // since it uses 100% width and height
            logger.scene('Fluid integration updated for resize');
        }
    }
} 