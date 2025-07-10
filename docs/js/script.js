// Main application entry point
import { 
    Engine, 
    Render, 
    Runner, 
    getMouseConstraint, 
    getRender, 
    getEngine, 
    getRunner, 
    getWorld,
    updateViewportDimensions,
    getViewportDimensions 
} from './config.js';
import { BackgroundParticles } from './background-particles.js';
import { SceneManager } from './scene-manager.js';
import { 
    cleanupExpiredSparks, 
    performPeriodicCleanup, 
    performanceMonitor, 
    drawSparks,
    cleanupMeasurementCanvas
} from './utils.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';

/**
 * Main application class for managing the physics-based interactive experience
 * @class PhysicsApp
 */
class PhysicsApp {
    /**
     * Create a new PhysicsApp instance
     */
    constructor() {
        this.backgroundParticles = null;
        this.sceneManager = null;
        this.canvasContext = null;
        this.isWindowVisible = true;
        this.cleanupCounter = 0;
        this.eventListeners = [];
        this.resizeTimeout = null;
    }

    /**
     * Initialize the application
     */
    initialize() {
        logger.app('Initializing modular physics app...');
        
        this.initializeBackgroundParticles();
        this.initializeSceneManager();
        this.initializeCanvasContext();
        this.setupEventListeners();
        this.startPhysicsEngine();
        this.startSceneSequence();
        
        // Expose sceneManager globally for tunnel effect access
        window.SceneManager = this.sceneManager;
        
        logger.success('Application initialized successfully!');
    }

    /**
     * Initialize background particles with configuration
     */
    initializeBackgroundParticles() {
        this.backgroundParticles = new BackgroundParticles({
            maxParticles: 100,
            spawnRate: 0.2,
            minSize: 0.3,
            maxSize: 0.8,
            minLifetime: APP_CONFIG.PARTICLES.DEFAULT_MIN_LIFETIME,
            maxLifetime: APP_CONFIG.PARTICLES.DEFAULT_MAX_LIFETIME
        });
    }

    /**
     * Initialize scene manager
     */
    initializeSceneManager() {
        this.sceneManager = new SceneManager(this.backgroundParticles);
        
        // Set up scene change logging
        this.sceneManager.onSceneChange((scene) => {
            logger.scene(`Scene changed to: ${scene}`);
        });
    }

    /**
     * Initialize canvas context for custom rendering
     */
    initializeCanvasContext() {
        if (!this.canvasContext) {
            this.canvasContext = getRender().canvas.getContext('2d');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupMouseClickHandler();
        this.setupBeforeUpdateHandler();
        this.setupAfterRenderHandler();
        this.setupWindowResizeHandler();
        this.setupVisibilityHandler();
        this.setupKeyboardHandler();
    }

    /**
     * Setup mouse click handler for hanging text interaction
     */
    setupMouseClickHandler() {
        const mouseDownHandler = (event) => {
            try {
                const mousePosition = event.mouse.position;
                
                if (!this.sceneManager || !this.sceneManager.getHangingTexts) {
                    logger.warn('Scene manager not available for click handling');
                    return;
                }
                
                this.handleTextClick(mousePosition);
            } catch (error) {
                logger.error('Error in click handler:', error);
            }
        };
        
        Matter.Events.on(getMouseConstraint(), 'mousedown', mouseDownHandler);
        this.eventListeners.push({ 
            element: getMouseConstraint(), 
            event: 'mousedown', 
            handler: mouseDownHandler, 
            isMatterEvent: true 
        });
    }

    /**
     * Handle text click events
     * @param {Object} mousePosition - Mouse position object with x and y coordinates
     */
    handleTextClick(mousePosition) {
        this.sceneManager.getHangingTexts().forEach(hangingText => {
            if (hangingText && hangingText.textBody && !hangingText.isFalling && !hangingText.isDetached) {
                if (hangingText.isPointInClickArea(mousePosition.x, mousePosition.y)) {
                    this.processTextClick(hangingText);
                }
            } else if (hangingText && hangingText.isDetached) {
                logger.scene(`Detached text "${hangingText.options.text}" clicked, but detached text is not clickable`);
            }
        });
    }

    /**
     * Process individual text click
     * @param {Object} hangingText - The hanging text object that was clicked
     */
    processTextClick(hangingText) {
        const isReadyText = hangingText.options.text === 'Enter?';
        
        if (isReadyText) {
            if (this.sceneManager.getCurrentScene() === 'ready' && !this.sceneManager.readyTextFell) {
                logger.scene('Ready text clicked, falling with detach mode');
                hangingText.fall('detach');
            } else {
                logger.scene('Ready text already fell or sequence complete, ignoring click');
            }
        } else {
            logger.scene(`Text "${hangingText.options.text}" clicked, falling normally`);
            hangingText.fall();
        }
    }

    /**
     * Setup before update handler for cleanup and updates
     */
    setupBeforeUpdateHandler() {
        const beforeUpdateHandler = () => {
            this.cleanupCounter++;
            
            // Update background particles
            if (this.backgroundParticles) {
                this.backgroundParticles.update();
            }
            
            // Clean up off-screen hanging texts
            this.sceneManager.cleanupOffScreenTexts();
            
            // Clean up expired sparks
            cleanupExpiredSparks(getWorld());
            
            // Periodic thorough cleanup
            if (this.cleanupCounter >= APP_CONFIG.CLEANUP_INTERVAL) {
                this.cleanupCounter = 0;
                performPeriodicCleanup(getWorld());
            }
        };
        
        Matter.Events.on(getEngine(), 'beforeUpdate', beforeUpdateHandler);
        this.eventListeners.push({ 
            element: getEngine(), 
            event: 'beforeUpdate', 
            handler: beforeUpdateHandler, 
            isMatterEvent: true 
        });
    }

    /**
     * Setup after render handler for custom rendering
     */
    setupAfterRenderHandler() {
        const afterRenderHandler = () => {
            this.customRender();
        };
        
        Matter.Events.on(getRender(), 'afterRender', afterRenderHandler);
        this.eventListeners.push({ 
            element: getRender(), 
            event: 'afterRender', 
            handler: afterRenderHandler, 
            isMatterEvent: true 
        });
    }

    /**
     * Setup window resize handler
     */
    setupWindowResizeHandler() {
        const resizeHandler = () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.handleResize(), 100);
        };
        
        window.addEventListener('resize', resizeHandler);
        this.eventListeners.push({ 
            element: window, 
            event: 'resize', 
            handler: resizeHandler 
        });
    }

    /**
     * Setup window visibility handler
     */
    setupVisibilityHandler() {
        const visibilityHandler = () => {
            this.isWindowVisible = !document.hidden;
        };
        
        document.addEventListener('visibilitychange', visibilityHandler);
        this.eventListeners.push({ 
            element: document, 
            event: 'visibilitychange', 
            handler: visibilityHandler 
        });
    }

    /**
     * Setup keyboard handler for scene skipping
     */
    setupKeyboardHandler() {
        const keyboardHandler = (event) => {
            if (event.key.toLowerCase() === 's') {
                this.handleSceneSkip();
            }
        };
        
        document.addEventListener('keydown', keyboardHandler);
        this.eventListeners.push({ 
            element: document, 
            event: 'keydown', 
            handler: keyboardHandler 
        });
    }

    /**
     * Handle scene skip functionality
     */
    handleSceneSkip() {
        // Don't skip if already in brain scene
        if (this.sceneManager && this.sceneManager.getCurrentScene() === 'fluid') {
            logger.scene('S key pressed but already in brain scene - ignoring');
            return;
        }
        
        logger.scene('S key pressed - skipping to brain scene');
        if (this.sceneManager) {
            // Force cleanup of tunnel effect if it exists
            this.sceneManager.forceCleanupTunnelEffect();
            this.sceneManager.skipToBrainScene();
        }
    }

    /**
     * Start the physics engine
     */
    startPhysicsEngine() {
        Matter.Runner.run(getEngine());
        Render.run(getRender());
        Runner.run(getRunner(), getEngine());
    }

    /**
     * Start the scene sequence
     */
    startSceneSequence() {
        this.sceneManager.run();
    }

    /**
     * Custom render function for additional visual effects
     */
    customRender() {
        // Skip rendering if window is not visible (performance optimization)
        if (!this.isWindowVisible) {
            return;
        }
        
        if (!this.canvasContext) {
            this.initializeCanvasContext();
        }
        
        // Draw background particles first (behind everything else)
        if (this.backgroundParticles) {
            this.backgroundParticles.draw(this.canvasContext);
        }
        
        // Draw all hanging texts
        this.sceneManager.drawAllTexts(this.canvasContext);
        
        // Draw sparks
        drawSparks(this.canvasContext, getWorld());
        
        // Update and draw skip text overlay (on top of everything)
        if (this.sceneManager) {
            this.sceneManager.updateSkipTextOverlay();
            this.sceneManager.drawSkipTextOverlay(this.canvasContext);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const oldDimensions = getViewportDimensions();
        updateViewportDimensions();
        const newDimensions = getViewportDimensions();
        
        logger.physics(`Resize: ${oldDimensions.width}x${oldDimensions.height} → ${newDimensions.width}x${newDimensions.height}`);
        
        // Update scene manager for new dimensions
        this.sceneManager.updateForResize(oldDimensions, newDimensions);
        
        // Update background particles for new dimensions
        if (this.backgroundParticles) {
            this.backgroundParticles.updateForResize();
        }
        
        // Clean up and reinitialize canvas context
        cleanupMeasurementCanvas();
        this.canvasContext = null;
        this.initializeCanvasContext();
    }

    /**
     * Clean up application resources
     */
    cleanup() {
        logger.cleanup('Cleaning up application...');
        
        this.cleanupEventListeners();
        this.cleanupSceneManager();
        this.cleanupBackgroundParticles();
        this.cleanupCanvasContext();
        
        logger.success('Application cleanup completed');
    }

    /**
     * Clean up event listeners
     */
    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, event, handler, isMatterEvent }) => {
            try {
                if (isMatterEvent) {
                    Matter.Events.off(element, event, handler);
                } else {
                    element.removeEventListener(event, handler);
                }
            } catch (error) {
                logger.error('Error removing event listener:', error);
            }
        });
        
        this.eventListeners = [];
    }

    /**
     * Clean up scene manager
     */
    cleanupSceneManager() {
        if (this.sceneManager) {
            this.sceneManager.destroy();
            this.sceneManager = null;
        }
    }

    /**
     * Clean up background particles
     */
    cleanupBackgroundParticles() {
        if (this.backgroundParticles) {
            this.backgroundParticles.destroy();
            this.backgroundParticles = null;
        }
    }

    /**
     * Clean up canvas context
     */
    cleanupCanvasContext() {
        this.canvasContext = null;
        cleanupMeasurementCanvas();
    }

    /**
     * Log welcome message with app information
     */
    logWelcomeMessage() {
        if (APP_CONFIG.DEBUG.ENABLED) {
            logger.app('Modular Physics App loaded!');
            logger.app('Features: Scene management, responsive design, memory leak prevention, dynamic physics scaling');
            logger.app('Collision system: Strings no longer interact with each other, only with text bodies');
            logger.app('Click system: Click area stays original size, physics body scales independently');
            logger.app('Three-stage sequence: Hello → I\'m Julian → Ready?');
            logger.app('  1️⃣ Click "Hello!" to make it fall');
            logger.app('  2️⃣ "I\'m" and "Julian" appear - click both to make them fall');
            logger.app('  3️⃣ "Ready?" appears in center - click to complete sequence');
        }
    }
}

// Global app instance
let app = null;

/**
 * Initialize the application when DOM is ready with optimized loading
 */
function initializeApp() {
    try {
        // Defer initialization to next frame for better performance
        requestAnimationFrame(() => {
            app = new PhysicsApp();
            app.initialize();
            app.logWelcomeMessage();
        });
    } catch (error) {
        logger.error('Failed to initialize application:', error);
    }
}

/**
 * Clean up on page unload
 */
function cleanup() {
    if (app) {
        app.cleanup();
        app = null;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Clean up on page unload
window.addEventListener('beforeunload', cleanup); 