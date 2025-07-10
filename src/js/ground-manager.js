import { Bodies, Composite, world } from './config.js';
import { COLLISION_CATEGORIES } from './utils.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';

// GroundManager class for managing ground bodies and collision detection
export class GroundManager {
    constructor() {
        this.groundBodies = [];
        this.collisionEnabled = false;
    }
    
    // Create ground bodies at the bottom of the screen
    create() {
        // Clean up any existing ground bodies first
        this.destroy();
        
        const groundThickness = 50;
        const groundY = window.innerHeight + groundThickness / 2 - 10;
        
        // Create ground body
        const ground = Bodies.rectangle(
            window.innerWidth / 2,
            groundY,
            window.innerWidth,
            groundThickness,
            {
                isStatic: true,
                render: { fillStyle: 'transparent' },
                collisionFilter: {
                    category: COLLISION_CATEGORIES.GROUND,
                    mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
                },
                label: 'ground'
            }
        );
        
        // Create side walls
        const wallThickness = 50;
        const wallHeight = window.innerHeight;
        
        const leftWall = Bodies.rectangle(
            -wallThickness / 2,
            wallHeight / 2,
            wallThickness,
            wallHeight,
            {
                isStatic: true,
                render: { fillStyle: 'transparent' },
                collisionFilter: {
                    category: COLLISION_CATEGORIES.GROUND,
                    mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
                },
                label: 'wall'
            }
        );
        
        const rightWall = Bodies.rectangle(
            window.innerWidth + wallThickness / 2,
            wallHeight / 2,
            wallThickness,
            wallHeight,
            {
                isStatic: true,
                render: { fillStyle: 'transparent' },
                collisionFilter: {
                    category: COLLISION_CATEGORIES.GROUND,
                    mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
                },
                label: 'wall'
            }
        );
        
        this.groundBodies = [ground, leftWall, rightWall];
        
        // Add to world but disable collision initially
        Composite.add(world, this.groundBodies);
        this.disableCollision();
        
        logger.ground('Ground bodies created');
    }
    
    // Enable collision with ground
    enableCollision() {
        this.collisionEnabled = true;
        this.groundBodies.forEach(body => {
            body.collisionFilter.mask = COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK;
        });
        logger.ground('Ground collision enabled');
    }
    
    // Disable collision with ground
    disableCollision() {
        this.collisionEnabled = false;
        this.groundBodies.forEach(body => {
            body.collisionFilter.mask = 0; // No collision
        });
        logger.ground('Ground collision disabled');
    }
    
    // Check if collision is enabled
    isCollisionEnabled() {
        return this.collisionEnabled;
    }
    
    // Get ground bodies
    getGroundBodies() {
        return this.groundBodies;
    }
    
    // Update ground bodies for window resize
    updateForResize() {
        if (this.groundBodies.length > 0) {
            // Remove old ground bodies
            this.destroy();
            
            // Create new ground bodies with updated dimensions
            this.create();
            
            // Restore collision state
            if (this.collisionEnabled) {
                this.enableCollision();
            }
            
            logger.ground('Ground bodies updated for resize');
        }
    }
    
    // Remove ground bodies
    destroy() {
        if (this.groundBodies.length > 0) {
            Composite.remove(world, this.groundBodies);
            this.groundBodies = [];
            this.collisionEnabled = false;
            logger.ground('Ground bodies destroyed');
        }
    }
} 