import { Bodies, Body, Composite, Constraint, world, getViewportDimensions } from './config.js';
import { Responsive } from './responsive.js';
import { measureText, createRigidString, COLLISION_CATEGORIES } from './utils.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';

// HangingText class for creating modular hanging text elements
export class HangingText {
    constructor(options = {}) {
        // Store user options for resize handling
        this.userOptions = { ...options };
        
        // Calculate responsive defaults
        const responsiveDefaults = {
            text: "Hello!",
            x: Responsive.centerX(),
            y: Responsive.centerY(),
            startY: Responsive.startY(),
            fontSize: Responsive.fontSize(),
            fontFamily: 'Arial',
            color: APP_CONFIG.COLORS.DEFAULT_GOLD,
            strokeColor: APP_CONFIG.COLORS.DEFAULT_STROKE,
            glowColor: APP_CONFIG.COLORS.DEFAULT_GOLD,
            stringColor: APP_CONFIG.COLORS.DEFAULT_STRING,
            sparkColor: APP_CONFIG.COLORS.DEFAULT_GOLD,
            ceilingY: 0,
            density: APP_CONFIG.TEXT.DEFAULT_DENSITY,
            frictionAir: APP_CONFIG.TEXT.DEFAULT_FRICTION_AIR,
            sleepThreshold: APP_CONFIG.TEXT.DEFAULT_SLEEP_THRESHOLD,
            damping: APP_CONFIG.TEXT.DEFAULT_DAMPING,
            physicsScaleX: 1.0,  // Physics body X scaling factor
            physicsScaleY: 1.0,  // Physics body Y scaling factor
            physicsOffsetX: 0,   // Physics body X offset
            physicsOffsetY: 0,   // Physics body Y offset
            restitution: 0.3,
            friction: 0.1,
            sleepingEnabled: false,
            collisionFilter: {
                category: COLLISION_CATEGORIES.TEXT,
                mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK | COLLISION_CATEGORIES.GROUND
            }
        };
        
        // Merge user options with defaults, but evaluate responsive functions first
        const mergedOptions = { ...responsiveDefaults, ...options };
        
        // Evaluate all responsive functions to get actual values
        this.options = {
            text: mergedOptions.text,
            x: Responsive.evaluate(mergedOptions.x, responsiveDefaults.x),
            y: Responsive.evaluate(mergedOptions.y, responsiveDefaults.y),
            startY: Responsive.evaluate(mergedOptions.startY, responsiveDefaults.startY),
            fontSize: Responsive.evaluate(mergedOptions.fontSize, responsiveDefaults.fontSize),
            fontFamily: mergedOptions.fontFamily,
            color: mergedOptions.color,
            strokeColor: mergedOptions.strokeColor,
            glowColor: mergedOptions.glowColor,
            stringColor: mergedOptions.stringColor,
            sparkColor: mergedOptions.sparkColor,
            ceilingY: Responsive.evaluate(mergedOptions.ceilingY, responsiveDefaults.ceilingY),
            density: mergedOptions.density,
            frictionAir: mergedOptions.frictionAir,
            sleepThreshold: mergedOptions.sleepThreshold,
            damping: mergedOptions.damping,
            physicsScaleX: Responsive.evaluate(mergedOptions.physicsScaleX, responsiveDefaults.physicsScaleX),
            physicsScaleY: Responsive.evaluate(mergedOptions.physicsScaleY, responsiveDefaults.physicsScaleY),
            physicsOffsetX: Responsive.evaluate(mergedOptions.physicsOffsetX, responsiveDefaults.physicsOffsetX),
            physicsOffsetY: Responsive.evaluate(mergedOptions.physicsOffsetY, responsiveDefaults.physicsOffsetY),
            restitution: mergedOptions.restitution,
            friction: mergedOptions.friction,
            sleepingEnabled: mergedOptions.sleepingEnabled,
            collisionFilter: mergedOptions.collisionFilter,
            uniqueId: mergedOptions.uniqueId || Math.random().toString(36).substr(2, 9)
        };
        
        // Calculate text dimensions first
        this.textDimensions = measureText(this.options.text, this.options.fontSize, this.options.fontFamily);
        
        // Set responsive string offsets based on text size if not provided
        if (!options.leftStringOffsetX) {
            this.options.leftStringOffsetX = -Responsive.stringOffset(this.textDimensions.width, 0.6);
        } else {
            this.options.leftStringOffsetX = Responsive.evaluate(mergedOptions.leftStringOffsetX, this.options.leftStringOffsetX);
        }
        
        if (!options.rightStringOffsetX) {
            this.options.rightStringOffsetX = Responsive.stringOffset(this.textDimensions.width, 0.6);
        } else {
            this.options.rightStringOffsetX = Responsive.evaluate(mergedOptions.rightStringOffsetX, this.options.rightStringOffsetX);
        }
        
        if (!options.stringLength) {
            this.options.stringLength = Responsive.stringLength(this.options.startY, this.options.y);
        } else {
            this.options.stringLength = Responsive.evaluate(mergedOptions.stringLength, this.options.stringLength);
        }
        
        // Initialize state
        this.textBody = null;
        this.strings = [];
        this.anchors = [];
        this.constraints = [];
        this.isFalling = false;
        this.fallStartTime = null;
        this.onFallCallback = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.physicsWidth = 0;
        this.physicsHeight = 0;
        this.scaledPosition = null;
        this.isDetached = false;
        this.detachedPosition = null;
        this.wasDetached = false;
        this.wasFalling = false;
        this.sparkConstraints = [];
        this.anchorBodies = [];
        this.sparkBodies = [];
        this.createdTime = null;
    }
    
    // Create the hanging text physics bodies
    create() {
        // Calculate scaled physics body dimensions
        const physicsWidth = this.textDimensions.width * this.options.physicsScaleX;
        const physicsHeight = this.textDimensions.height * this.options.physicsScaleY;
        
        // Create the text physics body with scaled dimensions
        this.textBody = Bodies.rectangle(
            this.options.x, 
            this.options.startY, 
            physicsWidth, 
            physicsHeight, 
            {
                render: { visible: false },
                density: this.options.density,
                frictionAir: this.options.frictionAir,
                sleepThreshold: this.options.sleepThreshold,
                slop: 0.5,
                label: `hangingText_${this.options.uniqueId}`,
                collisionFilter: {
                    category: COLLISION_CATEGORIES.TEXT,
                    mask: COLLISION_CATEGORIES.STRING | COLLISION_CATEGORIES.GROUND | COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
                }
            }
        );
        
        // Store both original and scaled dimensions
        this.physicsWidth = physicsWidth;
        this.physicsHeight = physicsHeight;
        this.originalWidth = this.textDimensions.width;
        this.originalHeight = this.textDimensions.height;
        
        // Calculate attachment points using scaled physics dimensions
        const halfPhysicsWidth = this.physicsWidth / 2 * 1.1;
        const halfPhysicsHeight = this.physicsHeight / 2 * 1.1;
        
        // Create left string
        const leftStringX = this.options.x + this.options.leftStringOffsetX;
        const leftString = createRigidString(
            leftStringX, 
            this.options.ceilingY, 
            this.options.x - halfPhysicsWidth, 
            this.options.startY - halfPhysicsHeight, 
            this.options.stringLength,
            3,
            this.options.stringColor
        );
        
        // Create right string  
        const rightStringX = this.options.x + this.options.rightStringOffsetX;
        const rightString = createRigidString(
            rightStringX, 
            this.options.ceilingY, 
            this.options.x + halfPhysicsWidth, 
            this.options.startY - halfPhysicsHeight, 
            this.options.stringLength,
            3,
            this.options.stringColor
        );
        
        this.strings = [leftString, rightString];
        
        // Create ceiling anchors
        const leftAnchor = Bodies.circle(leftStringX, this.options.ceilingY, 5, {
            isStatic: true,
            render: { visible: false },
            collisionFilter: {
                category: COLLISION_CATEGORIES.GROUND,
                mask: COLLISION_CATEGORIES.STRING | COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
            }
        });
        
        const rightAnchor = Bodies.circle(rightStringX, this.options.ceilingY, 5, {
            isStatic: true,
            render: { visible: false },
            collisionFilter: {
                category: COLLISION_CATEGORIES.GROUND,
                mask: COLLISION_CATEGORIES.STRING | COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
            }
        });
        
        this.anchors = [leftAnchor, rightAnchor];
        
        // Create constraints
        const leftAnchorConstraint = Constraint.create({
            bodyA: leftAnchor,
            bodyB: leftString.bodies[0],
            stiffness: 1,
            length: 0,
            damping: 0.1,
            sleepThreshold: 30,
            render: { visible: false }
        });
        
        const rightAnchorConstraint = Constraint.create({
            bodyA: rightAnchor,
            bodyB: rightString.bodies[0],
            stiffness: 1,
            length: 0,
            damping: 0.1,
            sleepThreshold: 30,
            render: { visible: false }
        });
        
        const leftTextConstraint = Constraint.create({
            bodyA: leftString.bodies[leftString.bodies.length - 1],
            bodyB: this.textBody,
            pointB: { x: -halfPhysicsWidth, y: -halfPhysicsHeight },
            stiffness: 1,
            length: 0,
            damping: this.options.damping,
            render: { visible: false }
        });
        
        const rightTextConstraint = Constraint.create({
            bodyA: rightString.bodies[rightString.bodies.length - 1],
            bodyB: this.textBody,
            pointB: { x: halfPhysicsWidth, y: -halfPhysicsHeight },
            stiffness: 1,
            length: 0,
            damping: this.options.damping,
            render: { visible: false }
        });
        
        this.constraints = [leftAnchorConstraint, rightAnchorConstraint, leftTextConstraint, rightTextConstraint];
        
        // Add everything to world
        Composite.add(world, [
            ...this.anchors,
            ...this.strings.map(s => s.composite),
            this.textBody,
            ...this.constraints
        ]);
        
        // Give the text a random initial horizontal velocity for natural swing
        const randomVelocity = (Math.random() - 0.5) * 150;
        Body.setVelocity(this.textBody, { x: randomVelocity, y: 0 });
        
        return this;
    }
    
    // Set callback function to be called when text falls
    onFall(callback) {
        this.onFallCallback = callback;
        return this;
    }
    
    // Make the text fall off screen
    fall(fallMode = 'normal') {
        if (this.isFalling) {
            logger.scene(`Text "${this.options.text}" already falling, ignoring duplicate fall request`);
            return;
        }
        this.isFalling = true;
        this.fallStartTime = performance.now();
        
        if (fallMode === 'detach') {
            // Ready text: Create sparks at text attachment points
            this.createTextAnchorSparks();
            
            // Mark as detached
            this.isDetached = true;
            
            // Remove text-to-string constraints (text falls, strings stay hanging)
            this.constraints.slice(2).forEach(constraint => {
                Composite.remove(world, constraint);
            });
            
            // Make the detached text fall faster and more dramatically
            Body.setMass(this.textBody, this.textBody.mass * 3); // Triple the mass
            this.textBody.frictionAir = 0.02; // Reduce air resistance significantly
            
            // Add more dramatic falling velocity for detached text
            Body.setVelocity(this.textBody, { 
                x: (Math.random() - 0.5) * 5,
                y: Math.random() * 3 + 5
            });
        } else {
            // Normal fall: Create sparks at ceiling anchor positions
            this.createAnchorSparks();
            
            // Remove the ceiling anchor constraints (strings fall with text)
            this.constraints.slice(0, 2).forEach(constraint => {
                Composite.remove(world, constraint);
            });
            
            // Add some dramatic falling velocity
            Body.setVelocity(this.textBody, { 
                x: (Math.random() - 0.5) * 20,
                y: Math.random() * 5 + 2
            });
        }
        
        // Call the callback if provided
        if (this.onFallCallback) {
            this.onFallCallback();
        }
    }
    
    // Create sparks from anchor points
    createAnchorSparks() {
        if (!this.anchors || this.anchors.length === 0) return;
        
        this.anchors.forEach(anchor => {
            const sparkCount = 30;
            
            for (let i = 0; i < sparkCount; i++) {
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;
                
                const spark = Bodies.circle(
                    anchor.position.x + offsetX,
                    anchor.position.y + offsetY,
                    0.3,
                    {
                        render: {
                            fillStyle: this.options.sparkColor,
                            strokeStyle: this.options.sparkColor,
                            lineWidth: 1
                        },
                        density: 0.0005,
                        frictionAir: 0.02,
                        restitution: 0.6,
                        friction: 0.1,
                        label: 'spark',
                        collisionFilter: {
                            category: COLLISION_CATEGORIES.SPARK,
                            mask: COLLISION_CATEGORIES.GROUND | COLLISION_CATEGORIES.TEXT  // Don't collide with strings
                        }
                    }
                );
                
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 2;
                const velX = Math.cos(angle) * speed / 2;
                const velY = Math.abs(Math.sin(angle) * speed);
                
                Body.setVelocity(spark, { x: velX, y: velY });
                
                spark.creationTime = performance.now();
                spark.lifetime = 1000 + Math.random() * 2000;
                
                Composite.add(world, spark);
            }
        });
    }
    
    // Create sparks from text attachment points (for detach mode)
    createTextAnchorSparks() {
        if (!this.textBody) return;
        
        // Calculate attachment points on the text body
        const halfPhysicsWidth = this.physicsWidth / 2 * 1.1;
        const halfPhysicsHeight = this.physicsHeight / 2 * 1.1;
        
        // Left and right attachment points
        const attachmentPoints = [
            {
                x: this.textBody.position.x - halfPhysicsWidth,
                y: this.textBody.position.y - halfPhysicsHeight
            },
            {
                x: this.textBody.position.x + halfPhysicsWidth,
                y: this.textBody.position.y - halfPhysicsHeight
            }
        ];
        
        attachmentPoints.forEach(point => {
            const sparkCount = 30;
            
            for (let i = 0; i < sparkCount; i++) {
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;
                
                const spark = Bodies.circle(
                    point.x + offsetX,
                    point.y + offsetY,
                    0.3,
                    {
                        render: {
                            fillStyle: this.options.sparkColor,
                            strokeStyle: this.options.sparkColor,
                            lineWidth: 1
                        },
                        density: 0.0005,
                        frictionAir: 0.02,
                        restitution: 0.6,
                        friction: 0.1,
                        label: 'spark',
                        collisionFilter: {
                            category: COLLISION_CATEGORIES.SPARK,
                            mask: COLLISION_CATEGORIES.GROUND | COLLISION_CATEGORIES.TEXT  // Don't collide with strings
                        }
                    }
                );
                
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 2;
                const velX = Math.cos(angle) * speed / 2;
                const velY = Math.abs(Math.sin(angle) * speed);
                
                Body.setVelocity(spark, { x: velX, y: velY });
                
                spark.creationTime = performance.now();
                spark.lifetime = 1000 + Math.random() * 2000;
                
                Composite.add(world, spark);
            }
        });
    }
    
    // Check if fallen off screen
    isOffScreen() {
        if (!this.textBody) return false;
        return this.textBody.position.y > window.innerHeight + 200;
    }
    
    // Check if a point is within the clickable area (uses original unscaled dimensions)
    isPointInClickArea(mouseX, mouseY) {
        if (!this.textBody) return false;
        
        // Use original unscaled dimensions for click detection
        const halfWidth = this.originalWidth / 2;
        const halfHeight = this.originalHeight / 2;
        
        // Get text body position
        const bodyX = this.textBody.position.x;
        const bodyY = this.textBody.position.y;
        
        // Check if mouse is within the original text bounds
        return (mouseX >= bodyX - halfWidth && mouseX <= bodyX + halfWidth &&
                mouseY >= bodyY - halfHeight && mouseY <= bodyY + halfHeight);
    }
    
    // Dynamically set physics scaling (requires recreation of physics bodies)
    setPhysicsScaling(scaleX, scaleY) {
        if (!this.textBody) return;
        
        // Store current position and velocity
        const currentPosition = { x: this.textBody.position.x, y: this.textBody.position.y };
        const currentVelocity = { x: this.textBody.velocity.x, y: this.textBody.velocity.y };
        const wasAsleep = this.textBody.isSleeping;
        
        // Update physics scaling options
        this.options.physicsScaleX = scaleX;
        this.options.physicsScaleY = scaleY;
        
        // Update user options for future resize operations
        this.userOptions.physicsScaleX = scaleX;
        this.userOptions.physicsScaleY = scaleY;
        
        // Destroy current physics bodies
        this.destroy();
        
        // Recreate with new scaling
        this.create();
        
        // Restore position and velocity
        if (this.textBody) {
            Matter.Body.setPosition(this.textBody, currentPosition);
            Matter.Body.setVelocity(this.textBody, currentVelocity);
            
            // Restore sleep state
            if (wasAsleep) {
                Matter.Sleeping.set(this.textBody, true);
            }
        }
        
        logger.info(`📏 Physics scaling updated to ${scaleX}x${scaleY} for "${this.options.text}"`);
        logger.info(`📏 Click area remains ${this.originalWidth}x${this.originalHeight} (original size)`);
    }
    
    // Set new colors dynamically
    setColors(colors) {
        if (colors.color) {
            this.options.color = colors.color;
            this.userOptions.color = colors.color;
        }
        if (colors.strokeColor) {
            this.options.strokeColor = colors.strokeColor;
            this.userOptions.strokeColor = colors.strokeColor;
        }
        if (colors.glowColor) {
            this.options.glowColor = colors.glowColor;
            this.userOptions.glowColor = colors.glowColor;
        }
        if (colors.stringColor) {
            this.options.stringColor = colors.stringColor;
            this.userOptions.stringColor = colors.stringColor;
        }
        if (colors.sparkColor) {
            this.options.sparkColor = colors.sparkColor;
            this.userOptions.sparkColor = colors.sparkColor;
        }
        
        //logger.info(`🎨 Colors updated for "${this.options.text}"`);
    }
    
    // Draw the text with effects
    drawText(ctx) {
        if (!this.textBody) return;
        
        ctx.save();
        
        // Apply rotation and position
        ctx.translate(this.textBody.position.x, this.textBody.position.y);
        ctx.rotate(this.textBody.angle);
        
        // Add pulsing scale effect when falling
        let pulseScale = 1;
        if (this.isFalling && this.fallStartTime) {
            const timeSinceFall = (performance.now() - this.fallStartTime) * 0.001;
            const pulseDuration = 3;
            
            if (timeSinceFall < pulseDuration) {
                const pulseIntensity = Math.exp(-timeSinceFall * 0.8);
                const pulseFrequency = 8;
                pulseScale = 1 + (Math.sin(timeSinceFall * pulseFrequency) * 0.15 * pulseIntensity);
            }
        }
        
        ctx.scale(pulseScale, pulseScale);
        
        ctx.font = `bold ${this.options.fontSize}px ${this.options.fontFamily}, sans-serif`;
        ctx.strokeStyle = this.options.strokeColor;
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Time-based animation
        const time = performance.now() * 0.001;
        const pulseSpeed = 2;
        const shimmerSpeed = 3;
        
        // Determine black mode first
        const isBlackMode = this.options.color === 'black';
        
        // Pulsating glow effect
        const baseShadowBlur = isBlackMode ? 5 : 20; // Reduce blur in black mode
        const pulseIntensity = isBlackMode ? 3 : 15; // Reduce pulse in black mode
        const pulsatingBlur = baseShadowBlur + Math.sin(time * pulseSpeed) * pulseIntensity;
        
        // Shimmer effect
        const baseAlpha = 1;
        const shimmerAlpha = isBlackMode ? 0.1 : 0.3; // Reduce shimmer in black mode
        const glowAlpha = baseAlpha + Math.sin(time * shimmerSpeed) * shimmerAlpha;
        
        // Color shimmer
        const hueShift = Math.sin(time * shimmerSpeed * 0.7) * 15;
        // Use actual colors if set to black, otherwise use shimmer effect
        const shimmerColor = isBlackMode ? 'black' : `hsl(${51 + hueShift}, 100%, 65%)`;
        const glowColor = isBlackMode ? 'black' : shimmerColor;
        
        // Enhanced glow for falling text
        const glowMultiplier = this.isFalling ? 1.5 : 1;
        
        // Create multiple glow layers
        for (let i = 0; i < 3; i++) {
            ctx.save();
            
            const layerTime = time + (i * 0.5);
            const layerBlur = (pulsatingBlur + Math.sin(layerTime * pulseSpeed * 1.2) * (5 + i * 3)) * glowMultiplier;
            const layerAlpha = (glowAlpha * (1 - i * 0.2)) * (0.8 + Math.sin(layerTime * shimmerSpeed * 0.8) * 0.3) * 0.5;
            
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = layerBlur;
            ctx.globalAlpha = layerAlpha;
            ctx.fillStyle = this.options.color;
            
            ctx.fillText(this.options.text, 0, 0);
            ctx.restore();
        }
        
        // Draw the main text
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = glowAlpha;
        ctx.fillStyle = isBlackMode ? this.options.color : shimmerColor;
        ctx.fillText(this.options.text, 0, 0);
        ctx.strokeText(this.options.text, 0, 0);
        ctx.restore();
        
        ctx.restore();
    }
    
    // Draw the strings with effects
    drawStrings(ctx) {
        if (!this.strings || this.strings.length === 0) return;
        
        ctx.save();
        
        const time = performance.now() * 0.001;
        const shimmerSpeed = 2.5;
        const pulseSpeed = 1.8;
        
        this.strings.forEach((string, stringIndex) => {
            if (!string.bodies || string.bodies.length < 2) return;
            
            const stringTimeOffset = stringIndex * 0.8;
            const stringTime = time + stringTimeOffset;
            
            // Determine black mode first
            const isStringBlackMode = this.options.stringColor === 'black';
            
            // Pulsating glow parameters
            const baseGlow = isStringBlackMode ? 2 : 8; // Reduce glow in black mode
            const pulseIntensity = isStringBlackMode ? 1 : 6; // Reduce pulse in black mode
            const pulsatingGlow = baseGlow + Math.sin(stringTime * pulseSpeed) * pulseIntensity;
            
            // Shimmer color variation
            const hueShift = Math.sin(stringTime * shimmerSpeed * 0.6) * 20;
            // Use actual string color if set to black, otherwise use shimmer effect
            const shimmerColor = isStringBlackMode ? 'black' : `hsl(${51 + hueShift}, 100%, 65%)`;
            const stringGlowColor = isStringBlackMode ? 'black' : shimmerColor;
            
            // Alpha variation
            const baseAlpha = 0.9;
            const shimmerAlpha = isStringBlackMode ? 0.1 : 0.4; // Reduce shimmer in black mode
            const glowAlpha = baseAlpha + Math.sin(stringTime * shimmerSpeed) * shimmerAlpha;
            
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Draw multiple glow layers
            for (let glowPass = 0; glowPass < 4; glowPass++) {
                ctx.save();
                
                const layerTime = stringTime + (glowPass * 0.3);
                const layerBlur = pulsatingGlow + Math.sin(layerTime * pulseSpeed * 1.1) * (2 + glowPass);
                const layerAlpha = (glowAlpha * (1 - glowPass * 0.15)) * (0.7 + Math.sin(layerTime * shimmerSpeed * 0.9) * 0.4);
                
                ctx.strokeStyle = stringGlowColor;
                ctx.lineWidth = 1 + glowPass * 0.3;
                ctx.shadowColor = stringGlowColor;
                ctx.shadowBlur = layerBlur;
                ctx.globalAlpha = layerAlpha;
                
                ctx.beginPath();
                ctx.moveTo(string.bodies[0].position.x, string.bodies[0].position.y);
                
                for (let i = 1; i < string.bodies.length; i++) {
                    ctx.lineTo(string.bodies[i].position.x, string.bodies[i].position.y);
                }
                
                ctx.stroke();
                ctx.restore();
            }
            
            // Draw the main string line
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.globalAlpha = glowAlpha;
            ctx.strokeStyle = stringGlowColor;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(string.bodies[0].position.x, string.bodies[0].position.y);
            
            for (let i = 1; i < string.bodies.length; i++) {
                ctx.lineTo(string.bodies[i].position.x, string.bodies[i].position.y);
            }
            
            ctx.stroke();
            ctx.restore();
        });
        
        ctx.restore();
    }
    
    // Update for window resize
    updateForResize(oldDimensions, newDimensions) {
        const userOptions = { ...this.userOptions };
        
        // Fallback for backward compatibility if dimensions not provided
        if (!oldDimensions || !newDimensions) {
            logger.warn(`📏 No dimensions provided to updateForResize for "${this.options?.text}", falling back to current dimensions`);
            const currentDims = getViewportDimensions();
            oldDimensions = currentDims;
            newDimensions = currentDims;
        }
        
        // Store state before destroy
        const wasFalling = this.isFalling;
        const fallStartTime = this.fallStartTime;
        const currentPosition = this.textBody ? { x: this.textBody.position.x, y: this.textBody.position.y } : null;
        const currentVelocity = this.textBody ? { x: this.textBody.velocity.x, y: this.textBody.velocity.y } : null;
        
        // Check if text was detached using the stored flag
        const wasDetached = this.isDetached;
        
        // For fallen text, calculate relative position to maintain position relative to screen
        let scaledPosition = null;
        if (wasFalling && currentPosition) {
            // Calculate relative position (as percentage of screen)
            const relativeX = currentPosition.x / oldDimensions.width;
            const relativeY = currentPosition.y / oldDimensions.height;
                        
            // Store relative position for later use
            scaledPosition = { relativeX, relativeY };
        }
        
        this.destroy();
        
        // Recalculate with new dimensions
        this.options = {
            text: userOptions.text || "Hello!",
            x: Responsive.evaluate(userOptions.x, Responsive.centerX),
            y: Responsive.evaluate(userOptions.y, Responsive.centerY),
            startY: Responsive.evaluate(userOptions.startY, Responsive.startY),
            fontSize: Responsive.evaluate(userOptions.fontSize, Responsive.fontSize),
            fontFamily: userOptions.fontFamily || 'Arial',
            color: userOptions.color || APP_CONFIG.COLORS.DEFAULT_GOLD,
            strokeColor: userOptions.strokeColor || APP_CONFIG.COLORS.DEFAULT_STROKE,
            glowColor: userOptions.glowColor || APP_CONFIG.COLORS.DEFAULT_GOLD,
            stringColor: userOptions.stringColor || APP_CONFIG.COLORS.DEFAULT_STRING,
            sparkColor: userOptions.sparkColor || APP_CONFIG.COLORS.DEFAULT_GOLD,
            ceilingY: Responsive.evaluate(userOptions.ceilingY, 0),
            density: userOptions.density || APP_CONFIG.TEXT.DEFAULT_DENSITY,
            frictionAir: userOptions.frictionAir || APP_CONFIG.TEXT.DEFAULT_FRICTION_AIR,
            sleepThreshold: userOptions.sleepThreshold || APP_CONFIG.TEXT.DEFAULT_SLEEP_THRESHOLD,
            damping: userOptions.damping || APP_CONFIG.TEXT.DEFAULT_DAMPING,
            physicsScaleX: Responsive.evaluate(userOptions.physicsScaleX, 1.0),
            physicsScaleY: Responsive.evaluate(userOptions.physicsScaleY, 1.0),
            physicsOffsetX: Responsive.evaluate(userOptions.physicsOffsetX, 0),
            physicsOffsetY: Responsive.evaluate(userOptions.physicsOffsetY, 0),
            restitution: Responsive.evaluate(userOptions.restitution, 0.3),
            friction: Responsive.evaluate(userOptions.friction, 0.1),
            sleepingEnabled: userOptions.sleepingEnabled || false,
            collisionFilter: {
                category: COLLISION_CATEGORIES.TEXT,
                mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK | COLLISION_CATEGORIES.GROUND
            },
            uniqueId: this.options?.uniqueId || Math.random().toString(36).substr(2, 9)
        };
        
        this.textDimensions = measureText(this.options.text, this.options.fontSize, this.options.fontFamily);
        
        // Update original dimensions for consistent click area
        this.originalWidth = this.textDimensions.width;
        this.originalHeight = this.textDimensions.height;
        
        // Set responsive string offsets
        if (userOptions.leftStringOffsetX === undefined) {
            this.options.leftStringOffsetX = -Responsive.stringOffset(this.textDimensions.width, 0.6);
        } else {
            this.options.leftStringOffsetX = Responsive.evaluate(userOptions.leftStringOffsetX, userOptions.leftStringOffsetX);
        }
        if (userOptions.rightStringOffsetX === undefined) {
            this.options.rightStringOffsetX = Responsive.stringOffset(this.textDimensions.width, 0.6);
        } else {
            this.options.rightStringOffsetX = Responsive.evaluate(userOptions.rightStringOffsetX, userOptions.rightStringOffsetX);
        }
        if (userOptions.stringLength === undefined) {
            this.options.stringLength = Responsive.stringLength(this.options.startY, this.options.y);
        } else {
            this.options.stringLength = Responsive.evaluate(userOptions.stringLength, userOptions.stringLength);
        }
        
        // Restore state
        this.isFalling = wasFalling;
        this.fallStartTime = fallStartTime;
        this.isDetached = wasDetached;
        
        if (wasDetached) {
            // For detached text, only create the text body and hanging strings (no connections)
            this.createDetachedText(scaledPosition, currentVelocity, newDimensions);
        } else {
            // For normal hanging text, create the full system
            this.create();
            
            // Restore position and velocity if it was falling
            if (wasFalling && scaledPosition && currentVelocity && this.textBody) {
                // Convert relative position back to absolute using new dimensions
                const absolutePosition = {
                    x: scaledPosition.relativeX * newDimensions.width,
                    y: scaledPosition.relativeY * newDimensions.height
                };
                logger.info(`📏 Restoring position for "${this.options?.text}": (${(scaledPosition.relativeX * 100).toFixed(1)}%, ${(scaledPosition.relativeY * 100).toFixed(1)}%) → (${absolutePosition.x.toFixed(1)}, ${absolutePosition.y.toFixed(1)})`);
                Body.setPosition(this.textBody, absolutePosition);
                Body.setVelocity(this.textBody, currentVelocity);
            }
        }
    }
    
    // Create detached text (for ready text that has already fallen)
    createDetachedText(relativePosition, velocity, newDimensions) {
        // Fallback for backward compatibility if dimensions not provided
        if (!newDimensions) {
            logger.warn(`📏 No dimensions provided to createDetachedText for "${this.options?.text}", falling back to current dimensions`);
            newDimensions = getViewportDimensions();
        }
        
        // Calculate scaled physics body dimensions
        const physicsWidth = this.textDimensions.width * this.options.physicsScaleX;
        const physicsHeight = this.textDimensions.height * this.options.physicsScaleY;
        
        // Calculate absolute position from relative position
        let absolutePosition;
        if (relativePosition && relativePosition.relativeX !== undefined) {
            absolutePosition = {
                x: relativePosition.relativeX * newDimensions.width,
                y: relativePosition.relativeY * newDimensions.height
            };
        } else {
            // Fallback to near bottom of screen
            absolutePosition = {
                x: this.options.x,
                y: newDimensions.height - 100
            };
        }
        
        // Create only the text physics body
        this.textBody = Bodies.rectangle(
            absolutePosition.x,
            absolutePosition.y,
            physicsWidth,
            physicsHeight,
            {
                render: { visible: false },
                density: this.options.density * 3, // Keep the enhanced mass from detach fall
                frictionAir: 0.02, // Keep reduced air friction from detach fall
                sleepThreshold: this.options.sleepThreshold,
                slop: 0.5,
                label: `hangingText_${this.options.uniqueId}`,
                collisionFilter: {
                    category: COLLISION_CATEGORIES.TEXT,
                    mask: COLLISION_CATEGORIES.GROUND | COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
                }
            }
        );
        
        // Store dimensions
        this.physicsWidth = physicsWidth;
        this.physicsHeight = physicsHeight;
        
        // Create hanging strings (without text connection)
        const leftStringX = this.options.x + this.options.leftStringOffsetX;
        const leftString = createRigidString(
            leftStringX,
            this.options.ceilingY,
            leftStringX,
            this.options.y,
            this.options.stringLength,
            3,
            this.options.stringColor
        );
        
        const rightStringX = this.options.x + this.options.rightStringOffsetX;
        const rightString = createRigidString(
            rightStringX,
            this.options.ceilingY,
            rightStringX,
            this.options.y,
            this.options.stringLength,
            3,
            this.options.stringColor
        );
        
        this.strings = [leftString, rightString];
        
        // Create ceiling anchors
        const leftAnchor = Bodies.circle(leftStringX, this.options.ceilingY, 5, {
            isStatic: true,
            render: { visible: false },
            collisionFilter: {
                category: COLLISION_CATEGORIES.GROUND,
                mask: COLLISION_CATEGORIES.STRING | COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
            }
        });
        
        const rightAnchor = Bodies.circle(rightStringX, this.options.ceilingY, 5, {
            isStatic: true,
            render: { visible: false },
            collisionFilter: {
                category: COLLISION_CATEGORIES.GROUND,
                mask: COLLISION_CATEGORIES.STRING | COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
            }
        });
        
        this.anchors = [leftAnchor, rightAnchor];
        
        // Create only ceiling anchor constraints (no text constraints)
        const leftAnchorConstraint = Constraint.create({
            bodyA: leftAnchor,
            bodyB: leftString.bodies[0],
            stiffness: 1,
            length: 0,
            damping: 0.1,
            sleepThreshold: 30,
            render: { visible: false }
        });
        
        const rightAnchorConstraint = Constraint.create({
            bodyA: rightAnchor,
            bodyB: rightString.bodies[0],
            stiffness: 1,
            length: 0,
            damping: 0.1,
            sleepThreshold: 30,
            render: { visible: false }
        });
        
        this.constraints = [leftAnchorConstraint, rightAnchorConstraint];
        
        // Add everything to the world
        Composite.add(world, [
            this.textBody,
            ...this.anchors,
            ...this.strings.map(s => s.composite),
            ...this.constraints
        ]);
        
        // Restore velocity if provided
        if (velocity && this.textBody) {
            Body.setVelocity(this.textBody, velocity);
        }
    }
    
    // Clean up resources
    destroy() {
        try {
            this.constraints.forEach(c => {
                if (c && world.constraints.includes(c)) {
                    Composite.remove(world, c);
                }
            });
            
            this.strings.forEach(s => {
                if (s && s.composite) {
                    if (s.constraints) {
                        s.constraints.forEach(sc => {
                            if (sc && world.constraints.includes(sc)) {
                                Composite.remove(world, sc);
                            }
                        });
                    }
                    if (world.composites.includes(s.composite)) {
                        Composite.remove(world, s.composite);
                    }
                }
            });
            
            this.anchors.forEach(a => {
                if (a && world.bodies.includes(a)) {
                    Composite.remove(world, a);
                }
            });
            
            if (this.textBody && world.bodies.includes(this.textBody)) {
                Composite.remove(world, this.textBody);
            }
            
        } catch (error) {
            logger.warn('Error during cleanup:', error);
        }
        
        this.textBody = null;
        this.strings = [];
        this.anchors = [];
        this.constraints = [];
    }
} 