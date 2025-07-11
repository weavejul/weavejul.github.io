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
 * Mobile detection function
 */
window.mobileCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

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
        this.isMobile = window.mobileCheck();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchMoveX = 0;
        this.touchMoveY = 0;
        this.isDragging = false;
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
        
        // Setup mobile-specific handlers
        if (this.isMobile) {
            this.setupMobileTouchHandlers();
        }
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
        
        // Create mobile skip button if on mobile
        if (this.isMobile) {
            logger.app('Mobile device detected - creating mobile skip button');
            this.createMobileSkipButton();
        } else {
            logger.app('Desktop device detected - no mobile skip button needed');
        }
    }

    /**
     * Setup mobile touch handlers for tunnel navigation and text interaction
     */
    setupMobileTouchHandlers() {
        // Touch start handler
        const touchStartHandler = (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.isDragging = false;
        };
        
        // Touch move handler for tunnel navigation
        const touchMoveHandler = (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            this.touchMoveX = touch.clientX;
            this.touchMoveY = touch.clientY;
            
            if (!this.isDragging) {
                const deltaX = Math.abs(this.touchMoveX - this.touchStartX);
                const deltaY = Math.abs(this.touchMoveY - this.touchStartY);
                
                if (deltaX > 10 || deltaY > 10) {
                    this.isDragging = true;
                }
            }
            
            // Handle tunnel navigation
            if (this.isDragging && this.sceneManager) {
                this.handleTunnelNavigation();
            }
        };
        
        // Touch end handler for text clicks
        const touchEndHandler = (event) => {
            event.preventDefault();
            
            if (!this.isDragging) {
                // Handle text click
                const touch = event.changedTouches[0];
                const mousePosition = { x: touch.clientX, y: touch.clientY };
                this.handleTextClick(mousePosition);
            }
            
            this.isDragging = false;
        };
        
        // Add touch event listeners
        document.addEventListener('touchstart', touchStartHandler, { passive: false });
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler, { passive: false });
        
        this.eventListeners.push(
            { element: document, event: 'touchstart', handler: touchStartHandler },
            { element: document, event: 'touchmove', handler: touchMoveHandler },
            { element: document, event: 'touchend', handler: touchEndHandler }
        );
    }

    /**
     * Handle tunnel navigation with touch gestures
     */
    handleTunnelNavigation() {
        if (!this.sceneManager || this.sceneManager.getCurrentScene() !== 'tunnel') {
            return;
        }
        
        const deltaX = this.touchMoveX - this.touchStartX;
        const deltaY = this.touchMoveY - this.touchStartY;
        
        // Calculate movement sensitivity
        const sensitivity = 0.5;
        const moveX = deltaX * sensitivity;
        const moveY = deltaY * sensitivity;
        
        // Update tunnel camera position
        if (window.tunnelEffect) {
            window.tunnelEffect.handleTouchNavigation(moveX, moveY);
        }
    }

    /**
     * Create mobile skip button
     */
    createMobileSkipButton() {
        const skipButton = document.createElement('div');
        skipButton.id = 'mobile-skip-button';
        skipButton.textContent = 'press here to skip';
        skipButton.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            color: #ffd700;
            font-family: 'Courier New', 'Courier', monospace;
            font-size: 14px;
            cursor: pointer;
            text-shadow: 0 0 5px #ffd700;
            opacity: 0.8;
            transition: opacity 0.3s ease;
            user-select: none;
            pointer-events: auto;
        `;
        
        skipButton.addEventListener('mouseenter', () => {
            skipButton.style.opacity = '1';
        });
        
        skipButton.addEventListener('mouseleave', () => {
            skipButton.style.opacity = '0.8';
        });
        
        skipButton.addEventListener('click', () => {
            logger.scene('Mobile skip button clicked');
            this.handleSceneSkip();
        });
        
        // Add touch support for mobile
        skipButton.addEventListener('touchstart', (event) => {
            event.preventDefault();
            logger.scene('Mobile skip button touched');
            this.handleSceneSkip();
        }, { passive: false });
        
        document.body.appendChild(skipButton);
        
        // Store reference for cleanup
        this.mobileSkipButton = skipButton;
        
        logger.scene('Mobile skip button created');
        
        // Set up observer to sync with skip text overlay visibility
        this.setupSkipButtonSync();
    }

    /**
     * Set up synchronization between mobile skip button and skip text overlay
     */
    setupSkipButtonSync() {
        if (!this.mobileSkipButton || !this.sceneManager) return;
        
        // Mobile skip button should always be visible on mobile devices
        // Don't hide it based on the overlay visibility
        this.mobileSkipButton.style.display = 'block';
        
        logger.scene('Mobile skip button sync disabled - button always visible on mobile');
    }

    /**
     * Handle scene skip functionality
     */
    handleSceneSkip() {
        logger.scene('Scene skip requested');
        
        // Don't skip if already in brain scene
        if (this.sceneManager && this.sceneManager.getCurrentScene() === 'fluid') {
            logger.scene('Skip requested but already in brain scene - ignoring');
            return;
        }
        
        logger.scene('Skipping to brain scene');
        if (this.sceneManager) {
            // Force cleanup of tunnel effect if it exists
            this.sceneManager.forceCleanupTunnelEffect();
            this.sceneManager.skipToBrainScene();
        } else {
            logger.error('Scene manager not available for skip');
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
        this.cleanupMobileElements();
        
        logger.success('Application cleanup completed');
    }

    /**
     * Clean up mobile-specific elements
     */
    cleanupMobileElements() {
        if (this.mobileSkipButton) {
            this.mobileSkipButton.remove();
            this.mobileSkipButton = null;
        }
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