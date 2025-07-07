// Matter.js module aliases
import { APP_CONFIG } from './constants.js';

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

// Get viewport dimensions (will be updated on resize)
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

// Create engine
const engine = Engine.create();
const world = engine.world;

// Configure physics engine using constants
engine.world.gravity.y = APP_CONFIG.PHYSICS.GRAVITY;
engine.enableSleeping = true;
engine.constraintIterations = APP_CONFIG.PHYSICS.CONSTRAINT_ITERATIONS;
engine.positionIterations = APP_CONFIG.PHYSICS.POSITION_ITERATIONS;
engine.velocityIterations = APP_CONFIG.PHYSICS.VELOCITY_ITERATIONS;

// Create renderer
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

// Set initial camera view
Render.lookAt(render, {
    min: { x: 0, y: 0 },
    max: { x: viewportWidth, y: viewportHeight }
});

// Create runner
const runner = Runner.create();

// Add mouse control with constants
const mouse = Mouse.create(render.canvas);
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

Composite.add(world, mouseConstraint);

// Keep the mouse in sync with rendering
render.mouse = mouse;

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

// Export function to update viewport dimensions
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

// Export function to get current viewport dimensions
export function getViewportDimensions() {
    return { width: viewportWidth, height: viewportHeight };
} 