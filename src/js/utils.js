import { Bodies, Body, Composite, Constraint } from './config.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';

/**
 * Collision categories for collision filtering
 * @enum {number}
 */
export const COLLISION_CATEGORIES = {
    STRING: 0x0001,    // String segments
    TEXT: 0x0002,      // Text bodies
    GROUND: 0x0004,    // Ground/walls
    SPARK: 0x0008      // Spark effects
};

/**
 * Performance monitoring system for tracking world statistics
 * @type {Object}
 */
export let performanceMonitor = {
    lastBodyCount: 0,
    lastConstraintCount: 0,
    maxBodies: 0,
    maxConstraints: 0,
    
    /**
     * Check performance metrics and log warnings for significant increases
     * @param {Matter.World} world - The physics world to monitor
     */
    checkPerformance: function(world) {
        const currentBodies = world.bodies.length;
        const currentConstraints = world.constraints.length;
        
        // Track maximums
        this.maxBodies = Math.max(this.maxBodies, currentBodies);
        this.maxConstraints = Math.max(this.maxConstraints, currentConstraints);
        
        // Detect significant increases
        if (currentBodies > this.lastBodyCount + 50) {
            logger.warn(`Body count increased significantly: ${this.lastBodyCount} → ${currentBodies}`);
        }
        if (currentConstraints > this.lastConstraintCount + 50) {
            logger.warn(`Constraint count increased significantly: ${this.lastConstraintCount} → ${currentConstraints}`);
        }
        
        this.lastBodyCount = currentBodies;
        this.lastConstraintCount = currentConstraints;
    }
};

// MEMORY LEAK FIX: Create a single reusable canvas for text measurement
let measurementCanvas = null;
let measurementCtx = null;

/**
 * Initialize the measurement canvas for text dimension calculations
 */
export function initializeMeasurementCanvas() {
    if (!measurementCanvas) {
        measurementCanvas = document.createElement('canvas');
        measurementCtx = measurementCanvas.getContext('2d');
        // Set canvas size to prevent memory issues
        measurementCanvas.width = 1000;
        measurementCanvas.height = 200;
    }
}

/**
 * Clean up the measurement canvas to prevent memory leaks
 */
export function cleanupMeasurementCanvas() {
    if (measurementCanvas) {
        measurementCanvas.width = 1;
        measurementCanvas.height = 1;
        measurementCanvas = null;
        measurementCtx = null;
    }
}

/**
 * Measure text dimensions using a reusable canvas
 * @param {string} text - The text to measure
 * @param {number} [fontSize=48] - Font size in pixels
 * @param {string} [fontFamily='Arial'] - Font family
 * @returns {{width: number, height: number}} - Text dimensions
 */
export function measureText(text, fontSize = 48, fontFamily = 'Arial') {
    // Initialize canvas if not already done
    initializeMeasurementCanvas();
    
    measurementCtx.font = `bold ${fontSize}px ${fontFamily}, sans-serif`;
    const metrics = measurementCtx.measureText(text);
    
    // Calculate actual text bounds using font metrics
    const actualWidth = metrics.width;
    const actualHeight = (metrics.actualBoundingBoxAscent || fontSize * 0.8) + 
                        (metrics.actualBoundingBoxDescent || fontSize * 0.2);
    
    // Make bounding box slightly smaller than text for perfect string attachment
    const resizeFactor = 0.8;
    const width = actualWidth * resizeFactor;
    const height = actualHeight * resizeFactor;
    
    return { width, height };
}

/**
 * Create a rigid string made of multiple segments
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} endX - Ending X position
 * @param {number} endY - Ending Y position
 * @param {number} segments - Number of segments in the string
 * @param {number} [segmentRadius=3] - Radius of each segment
 * @param {string} [color='rgba(255, 215, 0, 1)'] - Color of the string
 * @returns {{composite: Matter.Composite, bodies: Matter.Body[], constraints: Matter.Constraint[]}} - String components
 */
export function createRigidString(startX, startY, endX, endY, segments, segmentRadius = 3, color = 'rgba(255, 215, 0, 1)') {
    const stringData = calculateStringGeometry(startX, startY, endX, endY, segments);
    const stringBodies = createStringBodies(stringData, segmentRadius);
    const stringConstraints = createStringConstraints(stringBodies, stringData.segmentSpacing);
    
    // Create composite and add all components
    const stringComposite = Composite.create();
    Composite.add(stringComposite, stringBodies);
    Composite.add(stringComposite, stringConstraints);
    
    return { 
        composite: stringComposite, 
        bodies: stringBodies, 
        constraints: stringConstraints 
    };
}

/**
 * Calculate string geometry and segment positions
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} endX - Ending X position
 * @param {number} endY - Ending Y position
 * @param {number} segments - Number of segments
 * @returns {{stringLength: number, segmentSpacing: number, dirX: number, dirY: number, positions: Array<{x: number, y: number}>}} - String geometry data
 */
function calculateStringGeometry(startX, startY, endX, endY, segments) {
    // Calculate string length and segment spacing
    const stringLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const segmentSpacing = stringLength / segments;
    
    // Calculate direction vector
    const dirX = (endX - startX) / stringLength;
    const dirY = (endY - startY) / stringLength;
    
    // Calculate segment positions
    const positions = [];
    for (let i = 0; i < segments; i++) {
        const x = startX + dirX * segmentSpacing * i;
        const y = startY + dirY * segmentSpacing * i;
        positions.push({ x, y });
    }
    
    return { stringLength, segmentSpacing, dirX, dirY, positions };
}

/**
 * Create string body segments
 * @param {{positions: Array<{x: number, y: number}>}} stringData - String geometry data
 * @param {number} segmentRadius - Radius of each segment
 * @returns {Matter.Body[]} - Array of string body segments
 */
function createStringBodies(stringData, segmentRadius) {
    const stringBodies = [];
    
    for (let i = 0; i < stringData.positions.length; i++) {
        const pos = stringData.positions[i];
        
        const segment = Bodies.circle(pos.x, pos.y, segmentRadius, {
            collisionFilter: {
                category: COLLISION_CATEGORIES.STRING,
                mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.GROUND
            },
            render: {
                visible: false  // Hide the circular segments, show only the lines
            },
            density: 0.2,
            frictionAir: 0.01,
            sleepThreshold: 30,
            slop: 0.01
        });
        
        stringBodies.push(segment);
    }
    
    return stringBodies;
}

/**
 * Create constraints between string segments
 * @param {Matter.Body[]} stringBodies - Array of string body segments
 * @param {number} segmentSpacing - Distance between segments
 * @returns {Matter.Constraint[]} - Array of string constraints
 */
function createStringConstraints(stringBodies, segmentSpacing) {
    const stringConstraints = [];
    
    for (let i = 0; i < stringBodies.length - 1; i++) {
        const constraint = Constraint.create({
            bodyA: stringBodies[i],
            bodyB: stringBodies[i + 1],
            stiffness: 1,        // Completely rigid
            length: segmentSpacing,  // Fixed length - no stretching
            damping: 0.01,       // Slightly higher damping to reduce vibrations
            render: {
                visible: false   // Hide built-in rendering, we'll use custom glow rendering
            }
        });
        stringConstraints.push(constraint);
    }
    
    return stringConstraints;
}

/**
 * Clean up expired sparks and off-screen sparks
 * @param {Matter.World} world - The physics world containing sparks
 * @returns {number} - Number of sparks removed
 */
export function cleanupExpiredSparks(world) {
    const sparks = world.bodies.filter(body => body.label === 'spark');
    let removedCount = 0;
    
    sparks.forEach(spark => {
        if (shouldRemoveSpark(spark)) {
            try {
                Composite.remove(world, spark);
                removedCount++;
            } catch (error) {
                logger.warn('Error removing expired spark:', error);
            }
        }
    });
    
    // Log cleanup stats occasionally
    if (removedCount > 0 && Math.random() < 0.1) {
        logger.cleanup(`Cleaned up ${removedCount} expired sparks`);
    }
    
    return removedCount;
}

/**
 * Check if a spark should be removed
 * @param {Matter.Body} spark - The spark to check
 * @returns {boolean} - True if spark should be removed
 */
function shouldRemoveSpark(spark) {
    if (!spark.createdTime) {
        spark.createdTime = performance.now();
    }
    
    const age = performance.now() - spark.createdTime;
    const normalizedAge = age / 5000; // 5 second lifespan
    
    // Remove expired sparks or those that fell off screen
    return normalizedAge > 1 || spark.position.y > window.innerHeight + APP_CONFIG.MAX_OFFSCREEN_DISTANCE;
}

/**
 * Perform periodic cleanup to prevent memory leaks
 * @param {Matter.World} world - The physics world to clean
 */
export function performPeriodicCleanup(world) {
    const worldBodies = world.bodies;
    const worldConstraints = world.constraints;
    
    // Count elements for debugging
    const beforeBodies = worldBodies.length;
    const beforeConstraints = worldConstraints.length;
    
    cleanupOrphanedBodies(world, worldBodies);
    cleanupOrphanedConstraints(world, worldConstraints);
    
    const afterBodies = world.bodies.length;
    const afterConstraints = world.constraints.length;
    
    if (beforeBodies !== afterBodies || beforeConstraints !== afterConstraints) {
        logger.cleanup(`Periodic cleanup: Bodies ${beforeBodies} → ${afterBodies}, Constraints ${beforeConstraints} → ${afterConstraints}`);
    }
}

/**
 * Clean up orphaned bodies
 * @param {Matter.World} world - The physics world
 * @param {Matter.Body[]} worldBodies - Array of world bodies
 */
function cleanupOrphanedBodies(world, worldBodies) {
    for (let i = worldBodies.length - 1; i >= 0; i--) {
        if (!worldBodies[i] || worldBodies[i].position.y > window.innerHeight + APP_CONFIG.MAX_OFFSCREEN_DISTANCE) {
            try {
                Composite.remove(world, worldBodies[i]);
            } catch (error) {
                logger.warn('Error removing orphaned body:', error);
            }
        }
    }
}

/**
 * Clean up orphaned constraints
 * @param {Matter.World} world - The physics world
 * @param {Matter.Constraint[]} worldConstraints - Array of world constraints
 */
function cleanupOrphanedConstraints(world, worldConstraints) {
    for (let i = worldConstraints.length - 1; i >= 0; i--) {
        if (!worldConstraints[i] || 
            (!worldConstraints[i].bodyA && !worldConstraints[i].bodyB)) {
            try {
                Composite.remove(world, worldConstraints[i]);
            } catch (error) {
                logger.warn('Error removing orphaned constraint:', error);
            }
        }
    }
}

/**
 * Draw sparks with custom glow effects
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Matter.World} world - The physics world containing sparks
 */
export function drawSparks(ctx, world) {
    const now = performance.now();
    const time = now * 0.001;
    
    // Get all spark bodies
    const sparks = world.bodies.filter(body => body.label === 'spark');
    
    ctx.save();
    
    sparks.forEach(spark => {
        drawSpark(ctx, spark, now, time);
    });
    
    ctx.restore();
}

/**
 * Draw a single spark with glow effects
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Matter.Body} spark - The spark to draw
 * @param {number} now - Current timestamp
 * @param {number} time - Current time in seconds
 */
function drawSpark(ctx, spark, now, time) {
    if (!spark.creationTime || !spark.lifetime) return;
    
    const age = now - spark.creationTime;
    const normalizedAge = age / spark.lifetime;
    
    // Skip if expired (will be cleaned up later)
    if (normalizedAge > 1) return;
    
    // Fade out over lifetime
    let alpha = 1 - normalizedAge;
    
    // Sparkle effect with random twinkle
    const sparkleTime = time * 10 + spark.id * 0.1;
    const sparkleIntensity = 0.5 + 0.5 * Math.sin(sparkleTime);
    alpha *= sparkleIntensity;
    
    if (alpha < 0.01) return;
    
    const pos = spark.position;
    const radius = spark.circleRadius;
    
    drawSparkGlow(ctx, pos, radius, alpha, spark);
    drawSparkCore(ctx, pos, radius, alpha);
}

/**
 * Draw spark glow layers
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Matter.Vector} pos - Spark position
 * @param {number} radius - Spark radius
 * @param {number} alpha - Spark alpha value
 * @param {Matter.Body} spark - The spark object
 */
function drawSparkGlow(ctx, pos, radius, alpha, spark) {
    // Draw multiple glow layers for sparkle effect
    for (let layer = 0; layer < 3; layer++) {
        ctx.save();
        
        const layerAlpha = alpha * (1 - layer * 0.3);
        const layerRadius = radius * (1 + layer * 0.8);
        const layerBlur = 2 + layer * 4;
        
        // Use spark's render color instead of hardcoded gold
        const sparkColor = spark.render?.fillStyle || 'rgba(255, 215, 0, 1)';
        
        ctx.globalAlpha = layerAlpha;
        ctx.fillStyle = sparkColor;
        ctx.shadowColor = sparkColor;
        ctx.shadowBlur = layerBlur;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, layerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

/**
 * Draw spark core
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Matter.Vector} pos - Spark position
 * @param {number} radius - Spark radius
 * @param {number} alpha - Spark alpha value
 */
function drawSparkCore(ctx, pos, radius, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.shadowColor = 'transparent';
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
} 