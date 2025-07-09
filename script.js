// Main application entry point
import { 
    Engine, 
    Render, 
    Runner, 
    mouseConstraint, 
    render, 
    engine, 
    runner, 
    world,
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
import { FPSCounter } from './fps-counter.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';
import { DebugUtils } from './debug-utils.js';

// Application state
let backgroundParticles = null;
let sceneManager = null;
let canvasContext = null;
let isWindowVisible = true;
let cleanupCounter = 0;
let eventListeners = [];
let resizeTimeout = null;
let fpsCounter = null;

// Initialize the application
function initializeApp() {
    logger.app('Initializing modular physics app...');
    
    // Initialize background particles with constants
    backgroundParticles = new BackgroundParticles({
        maxParticles: 100,
        spawnRate: 0.2,
        minSize: 0.3,
        maxSize: 0.8,
        minLifetime: APP_CONFIG.PARTICLES.DEFAULT_MIN_LIFETIME,
        maxLifetime: APP_CONFIG.PARTICLES.DEFAULT_MAX_LIFETIME
    });
    
    // Initialize scene manager
    sceneManager = new SceneManager(backgroundParticles);
    
    // Set up scene change logging
    sceneManager.onSceneChange((scene) => {
        logger.scene(`Scene changed to: ${scene}`);
    });
    
    // Initialize canvas context
    initializeCanvasContext();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start the engines
    startPhysicsEngine();
    
    // Initialize debug utilities
    DebugUtils.init(sceneManager, backgroundParticles, world, render);
    
    // Initialize FPS counter
    fpsCounter = new FPSCounter();
    fpsCounter.init();
    
    // Start the scene sequence
    sceneManager.run();
    
    // Expose sceneManager globally for tunnel effect access
    window.SceneManager = sceneManager;
    
    // Expose fpsCounter globally for debug access
    window.fpsCounter = fpsCounter;
    
    logger.success('Application initialized successfully!');
}

// Initialize canvas context
function initializeCanvasContext() {
    if (!canvasContext) {
        canvasContext = render.canvas.getContext('2d');
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Mouse click handler for hanging text
    const mouseDownHandler = function(event) {
        try {
            const mousePosition = event.mouse.position;
            
            // Validate scene manager exists and has hanging texts
            if (!sceneManager || !sceneManager.getHangingTexts) {
                logger.warn('Scene manager not available for click handling');
                return;
            }
            
            // Check if click is on any hanging text using original text dimensions
            sceneManager.getHangingTexts().forEach(hangingText => {
                if (hangingText && hangingText.textBody && !hangingText.isFalling && !hangingText.isDetached) {
                    // Use the unscaled click area instead of physics body bounds
                    if (hangingText.isPointInClickArea(mousePosition.x, mousePosition.y)) {
                        // Check if this is the ready text for special detach behavior
                        const isReadyText = hangingText.options.text === 'Enter?';
                        
                        if (isReadyText) {
                            // Prevent multiple clicks on ready text
                            if (sceneManager.getCurrentScene() === 'ready' && !sceneManager.readyTextFell) {
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
                } else if (hangingText && hangingText.isDetached) {
                    logger.scene(`Detached text "${hangingText.options.text}" clicked, but detached text is not clickable`);
                }
            });
        } catch (error) {
            logger.error('Error in click handler:', error);
        }
    };
    
    Matter.Events.on(mouseConstraint, 'mousedown', mouseDownHandler);
    eventListeners.push({ element: mouseConstraint, event: 'mousedown', handler: mouseDownHandler, isMatterEvent: true });
    
    // Before update handler for cleanup and updates
    const beforeUpdateHandler = function() {
        cleanupCounter++;
        
        // Update FPS counter
        if (fpsCounter) {
            fpsCounter.update();
        }
        
        // Update background particles
        if (backgroundParticles) {
            backgroundParticles.update();
        }
        
        // Clean up off-screen hanging texts
        sceneManager.cleanupOffScreenTexts();
        
        // Clean up expired sparks
        cleanupExpiredSparks(world);
        
        // Periodic thorough cleanup
        if (cleanupCounter >= APP_CONFIG.CLEANUP_INTERVAL) {
            cleanupCounter = 0;
            performPeriodicCleanup(world);
        }
    };
    
    Matter.Events.on(engine, 'beforeUpdate', beforeUpdateHandler);
    eventListeners.push({ element: engine, event: 'beforeUpdate', handler: beforeUpdateHandler, isMatterEvent: true });
    
    // After render handler for custom rendering
    const afterRenderHandler = function() {
        customRender();
    };
    
    Matter.Events.on(render, 'afterRender', afterRenderHandler);
    eventListeners.push({ element: render, event: 'afterRender', handler: afterRenderHandler, isMatterEvent: true });
    
    // Window resize handler
    const resizeHandler = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', resizeHandler);
    eventListeners.push({ element: window, event: 'resize', handler: resizeHandler });
    
    // Window visibility handler
    const visibilityHandler = function() {
        isWindowVisible = !document.hidden;
    };
    
    document.addEventListener('visibilitychange', visibilityHandler);
    eventListeners.push({ element: document, event: 'visibilitychange', handler: visibilityHandler });
    
    // Keyboard handler for scene skipping
    const keyboardHandler = function(event) {
        if (event.key.toLowerCase() === 's') {
            logger.scene('S key pressed - skipping to brain scene');
            if (sceneManager) {
                sceneManager.skipToBrainScene();
            }
        }
    };
    
    document.addEventListener('keydown', keyboardHandler);
    eventListeners.push({ element: document, event: 'keydown', handler: keyboardHandler });
}

// Start the physics engine
function startPhysicsEngine() {
    Engine.run(engine);
    Render.run(render);
    Runner.run(runner, engine);
}

// Custom render function
function customRender() {
    // Skip rendering if window is not visible (performance optimization)
    if (!isWindowVisible) {
        return;
    }
    
    if (!canvasContext) {
        initializeCanvasContext();
    }
    
    // Draw background particles first (behind everything else)
    if (backgroundParticles) {
        backgroundParticles.draw(canvasContext);
    }
    
    // Draw all hanging texts
    sceneManager.drawAllTexts(canvasContext);
    
    // Draw sparks
    drawSparks(canvasContext, world);
}

// Handle window resize
function handleResize() {
    const oldDimensions = getViewportDimensions();
    updateViewportDimensions();
    const newDimensions = getViewportDimensions();
    
    logger.physics(`Resize: ${oldDimensions.width}x${oldDimensions.height} → ${newDimensions.width}x${newDimensions.height}`);
    
    // Update scene manager for new dimensions
    sceneManager.updateForResize(oldDimensions, newDimensions);
    
    // Update background particles for new dimensions
    if (backgroundParticles) {
        backgroundParticles.updateForResize();
    }
    
    // Clean up and reinitialize canvas context
    cleanupMeasurementCanvas();
    canvasContext = null;
    initializeCanvasContext();
}

// Clean up application resources
function cleanup() {
    logger.cleanup('Cleaning up application...');
    
    // Clean up event listeners
    eventListeners.forEach(({ element, event, handler, isMatterEvent }) => {
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
    
    eventListeners = [];
    
    // Clean up scene manager
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
    
    // Clean up background particles
    if (backgroundParticles) {
        backgroundParticles.destroy();
        backgroundParticles = null;
    }
    
    // Clean up FPS counter
    if (fpsCounter) {
        fpsCounter.destroy();
        fpsCounter = null;
    }
    
    // Clean up canvas context
    canvasContext = null;
    
    // Clean up measurement canvas
    cleanupMeasurementCanvas();
    
    logger.success('Application cleanup completed');
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeApp();
        
        // Log welcome message
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
    } catch (error) {
        logger.error('Failed to initialize application:', error);
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', cleanup); 