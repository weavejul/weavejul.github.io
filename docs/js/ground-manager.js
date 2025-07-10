import { Bodies, Composite, getWorld } from './config.js';
import { COLLISION_CATEGORIES } from './utils.js';
import { APP_CONFIG } from './constants.js';
import { logger } from './logger.js';

/**
 * GroundManager class for managing ground bodies and collision detection
 * @class GroundManager
 */
export class GroundManager {
    /**
     * Create a new GroundManager instance
     */
    constructor() {
        this.groundBodies = [];
        this.collisionEnabled = false;
    }
    
    /**
     * Create ground bodies at the bottom and sides of the screen
     */
    create() {
        // Clean up any existing ground bodies first
        this.destroy();
        
        this.createGroundBody();
        this.createSideWalls();
        
        // Add to world but disable collision initially
        Composite.add(getWorld(), this.groundBodies);
        this.disableCollision();
        
        logger.ground('Ground bodies created');
    }
    
    /**
     * Create the main ground body at the bottom of the screen
     */
    createGroundBody() {
        const groundThickness = 50;
        const groundY = window.innerHeight + groundThickness / 2 - 10;
        
        const ground = Bodies.rectangle(
            window.innerWidth / 2,
            groundY,
            window.innerWidth,
            groundThickness,
            this.createGroundBodyOptions()
        );
        
        this.groundBodies.push(ground);
    }
    
    /**
     * Create side walls to contain objects
     */
    createSideWalls() {
        const wallThickness = 50;
        const wallHeight = window.innerHeight;
        
        const leftWall = Bodies.rectangle(
            -wallThickness / 2,
            wallHeight / 2,
            wallThickness,
            wallHeight,
            this.createWallBodyOptions()
        );
        
        const rightWall = Bodies.rectangle(
            window.innerWidth + wallThickness / 2,
            wallHeight / 2,
            wallThickness,
            wallHeight,
            this.createWallBodyOptions()
        );
        
        this.groundBodies.push(leftWall, rightWall);
    }
    
    /**
     * Create options for ground body
     * @returns {Object} - Matter.js body options for ground
     */
    createGroundBodyOptions() {
        return {
            isStatic: true,
            render: { fillStyle: 'transparent' },
            collisionFilter: {
                category: COLLISION_CATEGORIES.GROUND,
                mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
            },
            label: 'ground'
        };
    }
    
    /**
     * Create options for wall bodies
     * @returns {Object} - Matter.js body options for walls
     */
    createWallBodyOptions() {
        return {
            isStatic: true,
            render: { fillStyle: 'transparent' },
            collisionFilter: {
                category: COLLISION_CATEGORIES.GROUND,
                mask: COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK
            },
            label: 'wall'
        };
    }
    
    /**
     * Enable collision with ground bodies
     */
    enableCollision() {
        this.collisionEnabled = true;
        this.updateCollisionMasks(COLLISION_CATEGORIES.TEXT | COLLISION_CATEGORIES.SPARK);
        logger.ground('Ground collision enabled');
    }
    
    /**
     * Disable collision with ground bodies
     */
    disableCollision() {
        this.collisionEnabled = false;
        this.updateCollisionMasks(0);
        logger.ground('Ground collision disabled');
    }
    
    /**
     * Update collision masks for all ground bodies
     * @param {number} mask - The collision mask to apply
     */
    updateCollisionMasks(mask) {
        this.groundBodies.forEach(body => {
            body.collisionFilter.mask = mask;
        });
    }
    
    /**
     * Check if collision is enabled
     * @returns {boolean} - True if collision is enabled, false otherwise
     */
    isCollisionEnabled() {
        return this.collisionEnabled;
    }
    
    /**
     * Get all ground bodies
     * @returns {Array} - Array of ground body objects
     */
    getGroundBodies() {
        return this.groundBodies;
    }
    
    /**
     * Update ground bodies for window resize
     */
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
    
    /**
     * Remove all ground bodies from the world
     */
    destroy() {
        if (this.groundBodies.length > 0) {
            Composite.remove(getWorld(), this.groundBodies);
            this.groundBodies = [];
            this.collisionEnabled = false;
            logger.ground('Ground bodies destroyed');
        }
    }
    
    /**
     * Check if ground bodies exist
     * @returns {boolean} - True if ground bodies exist, false otherwise
     */
    hasGroundBodies() {
        return this.groundBodies.length > 0;
    }
    
    /**
     * Get the number of ground bodies
     * @returns {number} - Number of ground bodies
     */
    getGroundBodyCount() {
        return this.groundBodies.length;
    }
} 