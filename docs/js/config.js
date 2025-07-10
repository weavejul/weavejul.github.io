import { APP_CONFIG } from './constants.js';

/**
 * Matter.js module aliases for cleaner imports
 */
const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Constraint = Matter.Constraint;
const MouseConstraint = Matter.MouseConstraint;
const Mouse = Matter.Mouse;

/**
 * Current viewport dimensions
 * @type {number}
 */
let viewportWidth = window.innerWidth;

/**
 * Current viewport height
 * @type {number}
 */
let viewportHeight = window.innerHeight;

/**
 * Matter.js physics engine instance
 * @type {Matter.Engine}
 */
const engine = Engine.create();

/**
 * Matter.js world instance
 * @type {Matter.World}
 */
const world = engine.world;

/**
 * Matter.js renderer instance
 * @type {Matter.Render}
 */
const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: {
        width: viewportWidth,
        height: viewportHeight,
        wireframes: false,
        background: 'rgba(0, 0, 0, 1)',
        showAngleIndicator: false,
        showVelocity: false,
        showCollisions: false
    }
});

/**
 * Matter.js runner instance
 * @type {Matter.Runner}
 */
const runner = Runner.create();

/**
 * Matter.js mouse instance
 * @type {Matter.Mouse}
 */
const mouse = Mouse.create(render.canvas);

/**
 * Matter.js mouse constraint instance
 * @type {Matter.MouseConstraint}
 */
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: APP_CONFIG.MOUSE.STIFFNESS,
        angularStiffness: APP_CONFIG.MOUSE.ANGULAR_STIFFNESS,
        damping: APP_CONFIG.MOUSE.DAMPING,
        render: {
            visible: false
        }
    }
});

/**
 * Initialize the physics engine with configuration
 */
function initializePhysicsEngine() {
    // Configure physics engine using constants
    engine.world.gravity.y = APP_CONFIG.PHYSICS.GRAVITY;
    engine.enableSleeping = true;
    engine.constraintIterations = APP_CONFIG.PHYSICS.CONSTRAINT_ITERATIONS;
    engine.positionIterations = APP_CONFIG.PHYSICS.POSITION_ITERATIONS;
    engine.velocityIterations = APP_CONFIG.PHYSICS.VELOCITY_ITERATIONS;
}

/**
 * Setup the renderer with initial camera view
 */
function setupRenderer() {
    // Set initial camera view
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: viewportWidth, y: viewportHeight }
    });
}

/**
 * Setup mouse controls
 */
function setupMouseControls() {
    // Add mouse constraint to world
Composite.add(world, mouseConstraint);

// Keep the mouse in sync with rendering
render.mouse = mouse;
}

// Initialize the physics system
initializePhysicsEngine();
setupRenderer();
setupMouseControls();

/**
 * Update viewport dimensions and renderer settings
 * Called when window is resized
 */
export function updateViewportDimensions() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    
    // Update render canvas and options
    render.canvas.width = viewportWidth;
    render.canvas.height = viewportHeight;
    render.options.width = viewportWidth;
    render.options.height = viewportHeight;
    
    // Update camera view
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: viewportWidth, y: viewportHeight }
    });
}

/**
 * Get current viewport dimensions
 * @returns {{width: number, height: number}} - Current viewport dimensions
 */
export function getViewportDimensions() {
    return { width: viewportWidth, height: viewportHeight };
}

/**
 * Get the Matter.js engine instance
 * @returns {Matter.Engine} - The physics engine
 */
export function getEngine() {
    return engine;
}

/**
 * Get the Matter.js world instance
 * @returns {Matter.World} - The physics world
 */
export function getWorld() {
    return world;
}

/**
 * Get the Matter.js renderer instance
 * @returns {Matter.Render} - The renderer
 */
export function getRender() {
    return render;
}

/**
 * Get the Matter.js runner instance
 * @returns {Matter.Runner} - The runner
 */
export function getRunner() {
    return runner;
}

/**
 * Get the Matter.js mouse instance
 * @returns {Matter.Mouse} - The mouse
 */
export function getMouse() {
    return mouse;
}

/**
 * Get the Matter.js mouse constraint instance
 * @returns {Matter.MouseConstraint} - The mouse constraint
 */
export function getMouseConstraint() {
    return mouseConstraint;
}

// Export all the Matter.js objects and configuration
export {
    Engine,
    Render,
    Runner,
    Bodies,
    Body,
    Composite,
    Composites,
    Constraint,
    MouseConstraint,
    Mouse,
    engine,
    world,
    render,
    runner,
    mouse,
    mouseConstraint
};