import { logger } from './logger.js';

/**
 * FluidIntegration class for managing fluid simulation canvas and animations
 * @class FluidIntegration
 */
export class FluidIntegration {
    /**
     * Create a new FluidIntegration instance
     */
    constructor() {
        this.isActive = false;
        this.canvas = null;
        this.scriptLoaded = false;
        
        // Animation properties
        this.fadeInDuration = 2.0;
        this.fadeOutDuration = 2.0;
        this.startTime = null;
        this.currentOpacity = 0;
        this.targetOpacity = 1;
        this.onCompleteCallback = null;
    }

    /**
     * Initialize the fluid simulation integration with deferred loading
     */
    init() {
        logger.scene('Initializing fluid simulation integration...');
        
        // Defer initialization to next frame for better performance
        requestAnimationFrame(() => {
            this.createCanvas();
            this.loadFluidScript();
            
            this.isActive = true;
            this.startTime = performance.now();
            
            logger.scene('Fluid simulation integration initialized with deferred loading');
        });
    }

    /**
     * Create the fluid simulation canvas
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fluid-canvas';
        
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '1001',
            pointerEvents: 'auto',
            opacity: '0'
        });
        
        document.body.appendChild(this.canvas);
    }

    /**
     * Load the fluid simulation script dynamically
     * @returns {Promise<void>} - Promise that resolves when script is loaded
     */
    loadFluidScript() {
        if (this.scriptLoaded) return Promise.resolve();
        
        // Check if script is already loaded
        if (window.fluidSimulationScriptLoaded) {
            this.scriptLoaded = true;
            logger.scene('Fluid simulation script already loaded');
            return Promise.resolve();
        }
        
        // Check if script tag already exists
        const existingScript = document.querySelector('script[src="./js/fluid-simulation.js"]');
        if (existingScript) {
            this.scriptLoaded = true;
            window.fluidSimulationScriptLoaded = true;
            logger.scene('Fluid simulation script already exists in DOM');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = './js/fluid-simulation.js';
            
            script.onload = () => {
                this.scriptLoaded = true;
                window.fluidSimulationScriptLoaded = true;
                logger.scene('Fluid simulation script loaded');
                
                this.initializeFluidSimulation(resolve, reject);
            };
            
            script.onerror = () => {
                logger.error('Failed to load fluid simulation script');
                reject(new Error('Failed to load fluid simulation script'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize the fluid simulation after script loads
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    initializeFluidSimulation(resolve, reject) {
        // Initialize the fluid simulation after a short delay
        setTimeout(() => {
            if (window.initializeFluidSimulation) {
                try {
                    window.initializeFluidSimulation();
                    logger.scene('Fluid simulation initialized');
                    resolve();
                } catch (error) {
                    logger.error('Failed to initialize fluid simulation:', error);
                    reject(error);
                }
            } else {
                logger.error('initializeFluidSimulation function not found');
                reject(new Error('initializeFluidSimulation function not found'));
            }
        }, 100);
    }

    /**
     * Start the fluid simulation with fade in
     * @returns {Promise<void>} - Promise that resolves when simulation starts
     */
    async start() {
        logger.scene('Starting fluid simulation with fade in...');
        this.init();
        
        // Wait for the script to load and initialize
        await this.loadFluidScript();
        
        this.fadeIn();
    }

    /**
     * Fade in the fluid simulation
     */
    fadeIn() {
        this.targetOpacity = 1;
        this.animateOpacity();
    }

    /**
     * Fade out the fluid simulation
     */
    fadeOut() {
        logger.scene('Fading out fluid simulation...');
        this.targetOpacity = 0;
        this.animateOpacity();
    }

    /**
     * Animate opacity changes for fade in/out effects
     */
    animateOpacity() {
        const animate = () => {
            if (!this.isActive) return;
            
            const currentTime = performance.now();
            const elapsed = this.startTime ? (currentTime - this.startTime) / 1000 : 0;
            
            if (this.targetOpacity > this.currentOpacity) {
                this.handleFadeIn(elapsed, animate);
            } else {
                this.handleFadeOut(elapsed, animate);
            }
        };
        
        animate();
    }

    /**
     * Handle fade in animation
     * @param {number} elapsed - Elapsed time in seconds
     * @param {Function} animate - Animation function to continue
     */
    handleFadeIn(elapsed, animate) {
        const fadeProgress = elapsed / this.fadeInDuration;
        this.currentOpacity = Math.min(this.targetOpacity, fadeProgress);
        
        this.updateCanvasOpacity();
        
        if (this.currentOpacity >= this.targetOpacity) {
            logger.scene('Fluid simulation fade in complete');
            this.executeCompleteCallback();
        } else {
            requestAnimationFrame(animate);
        }
    }

    /**
     * Handle fade out animation
     * @param {number} elapsed - Elapsed time in seconds
     * @param {Function} animate - Animation function to continue
     */
    handleFadeOut(elapsed, animate) {
        const fadeProgress = elapsed / this.fadeOutDuration;
        this.currentOpacity = Math.max(this.targetOpacity, 1 - fadeProgress);
        
        this.updateCanvasOpacity();
        
        if (this.currentOpacity <= this.targetOpacity) {
            logger.scene('Fluid simulation fade out complete');
            this.destroy();
        } else {
            requestAnimationFrame(animate);
        }
    }

    /**
     * Update the canvas opacity
     */
    updateCanvasOpacity() {
        if (this.canvas) {
            this.canvas.style.opacity = this.currentOpacity;
        }
    }

    /**
     * Execute the completion callback if set
     */
    executeCompleteCallback() {
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    /**
     * Set callback for when fade in is complete
     * @param {Function} callback - Function to call when fade in completes
     */
    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    /**
     * Clean up and destroy the fluid simulation
     */
    destroy() {
        logger.scene('Destroying fluid simulation...');
        
        this.isActive = false;
        this.removeCanvas();
        this.clearReferences();
        
        logger.scene('Fluid simulation destroyed');
    }

    /**
     * Remove the canvas from the DOM
     */
    removeCanvas() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    /**
     * Clear all references
     */
    clearReferences() {
        this.canvas = null;
        this.startTime = null;
        this.currentOpacity = 0;
        this.targetOpacity = 1;
    }

    /**
     * Check if the fluid simulation is running
     * @returns {boolean} - True if active, false otherwise
     */
    isRunning() {
        return this.isActive;
    }
    
    /**
     * Update for window resize
     */
    updateForResize() {
        if (this.canvas) {
            // The fluid simulation canvas should automatically resize with the container
            // since it uses 100% width and height
            logger.scene('Fluid integration updated for resize');
        }
    }

    /**
     * Get the current canvas element
     * @returns {HTMLCanvasElement|null} - The fluid simulation canvas
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Get the current opacity value
     * @returns {number} - Current opacity (0-1)
     */
    getOpacity() {
        return this.currentOpacity;
    }

    /**
     * Check if the fluid script is loaded
     * @returns {boolean} - True if script is loaded
     */
    isScriptLoaded() {
        return this.scriptLoaded;
    }
} 