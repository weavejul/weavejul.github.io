import { Bodies, Body, Composite, Constraint } from './config.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';

// MEMORY LEAK FIX: Create a single reusable canvas for text measurement
let measurementCanvas = null;
let measurementCtx = null;

export function initializeMeasurementCanvas() {
    if (!measurementCanvas) {
        measurementCanvas = document.createElement('canvas');
        measurementCtx = measurementCanvas.getContext('2d');
        // Set canvas size to prevent memory issues
        measurementCanvas.width = 1000;
        measurementCanvas.height = 200;
    }
}

// MEMORY LEAK FIX: Clean up measurement canvas
export function cleanupMeasurementCanvas() {
    if (measurementCanvas) {
        measurementCanvas.width = 1;
        measurementCanvas.height = 1;
        measurementCanvas = null;
        measurementCtx = null;
    }
}

// MEMORY LEAK FIX: Utility function to measure text dimensions with reusable canvas
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

// Collision categories for collision filtering
export const COLLISION_CATEGORIES = {
    STRING: 0x0001,    // String segments
    TEXT: 0x0002,      // Text bodies
    GROUND: 0x0004,    // Ground/walls
    SPARK: 0x0008      // Spark effects
};

// Function to create a rigid string made of multiple segments
export function createRigidString(startX, startY, endX, endY, segments, segmentRadius = 3, color = 'rgba(255, 215, 0, 1)') {
    // Calculate string length and segment spacing
    const stringLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const segmentSpacing = stringLength / segments;
    
    // Calculate direction vector
    const dirX = (endX - startX) / stringLength;
    const dirY = (endY - startY) / stringLength;
    
    // Create string segments
    const stringBodies = [];
    for (let i = 0; i < segments; i++) {
        const x = startX + dirX * segmentSpacing * i;
        const y = startY + dirY * segmentSpacing * i;
        
        const segment = Bodies.circle(x, y, segmentRadius, {
            collisionFilter: {
                category: COLLISION_CATEGORIES.STRING,
                mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.GROUND  // Only collide with text and ground, not other strings
            },
            render: {
                visible: false  // Hide the circular segments, show only the lines
            },
            density: 0.2,
            frictionAir: 0.01,   // Increased air friction for stiffer behavior
            sleepThreshold: 30,  // Allow sleeping after 1 second of low motion
            slop: 0.01      // Reduce micro-collisions that cause vibration
        });
        
        stringBodies.push(segment);
    }
    
    // Create composite and add bodies
    const stringComposite = Composite.create();
    Composite.add(stringComposite, stringBodies);
    
    // Chain the segments together with RIGID constraints (no stretching)
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
        Composite.add(stringComposite, constraint);
    }
    
    return { 
        composite: stringComposite, 
        bodies: stringBodies, 
        constraints: stringConstraints 
    };
}

// Clean up expired sparks and off-screen sparks
export function cleanupExpiredSparks(world) {
    const sparks = world.bodies.filter(body => body.label === 'spark');
    let removedCount = 0;
    
    sparks.forEach(spark => {
        if (!spark.createdTime) {
            spark.createdTime = performance.now();
        }
        
        const age = performance.now() - spark.createdTime;
        const normalizedAge = age / 5000; // 5 second lifespan
        
        // Remove expired sparks or those that fell off screen
        if (normalizedAge > 1 || spark.position.y > window.innerHeight + APP_CONFIG.MAX_OFFSCREEN_DISTANCE) {
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
}

// Performance monitoring system
export let performanceMonitor = {
    lastBodyCount: 0,
    lastConstraintCount: 0,
    maxBodies: 0,
    maxConstraints: 0,
    
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

// Periodic cleanup for memory leak prevention
export function performPeriodicCleanup(world) {
    const worldBodies = world.bodies;
    const worldConstraints = world.constraints;
    
    // Count elements for debugging
    const beforeBodies = worldBodies.length;
    const beforeConstraints = worldConstraints.length;
    
    // Remove any null or undefined bodies/constraints
    for (let i = worldBodies.length - 1; i >= 0; i--) {
        if (!worldBodies[i] || worldBodies[i].position.y > window.innerHeight + APP_CONFIG.MAX_OFFSCREEN_DISTANCE) {
            // Remove bodies that are way off screen
            try {
                Composite.remove(world, worldBodies[i]);
            } catch (error) {
                logger.warn('Error removing orphaned body:', error);
            }
        }
    }
    
    for (let i = worldConstraints.length - 1; i >= 0; i--) {
        if (!worldConstraints[i] || 
            (!worldConstraints[i].bodyA && !worldConstraints[i].bodyB)) {
            // Remove constraints with null bodies
            try {
                Composite.remove(world, worldConstraints[i]);
            } catch (error) {
                logger.warn('Error removing orphaned constraint:', error);
            }
        }
    }
    
    const afterBodies = world.bodies.length;
    const afterConstraints = world.constraints.length;
    
    if (beforeBodies !== afterBodies || beforeConstraints !== afterConstraints) {
        logger.cleanup(`Periodic cleanup: Bodies ${beforeBodies} → ${afterBodies}, Constraints ${beforeConstraints} → ${afterConstraints}`);
    }
}



// Custom spark rendering with glow effects
export function drawSparks(ctx, world) {
    const now = performance.now();
    const time = now * 0.001;
    
    // Get all spark bodies
    const sparks = world.bodies.filter(body => body.label === 'spark');
    
    ctx.save();
    
    sparks.forEach(spark => {
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
        
        // Draw the core spark
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.shadowColor = 'transparent';
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    ctx.restore();
} 