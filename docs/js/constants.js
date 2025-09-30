/**
 * Application constants and configuration values
 * Centralized configuration for the entire application
 * @module APP_CONFIG
 */
export const APP_CONFIG = {
    /**
     * Cleanup and performance settings
     * @type {Object}
     */
    CLEANUP: {
        /** Interval for cleanup operations in frames (~5 seconds at 60fps) */
        INTERVAL: 300,
        /** Maximum distance for offscreen objects in pixels */
        MAX_OFFSCREEN_DISTANCE: 1000
    },
    
    /**
     * Physics engine configuration
     * @type {Object}
     */
    PHYSICS: {
        /** Gravity strength */
        GRAVITY: 1,
        /** Number of constraint iterations for physics simulation */
        CONSTRAINT_ITERATIONS: 3,
        /** Number of position iterations for physics simulation */
        POSITION_ITERATIONS: 3,
        /** Number of velocity iterations for physics simulation */
        VELOCITY_ITERATIONS: 3,
        /** Pixels per segment for string physics */
        STRING_SEGMENTS: 50
    },
    
    /**
     * Mouse interaction settings
     * @type {Object}
     */
    MOUSE: {
        /** Stiffness of mouse constraint */
        STIFFNESS: 0.01,
        /** Angular stiffness of mouse constraint */
        ANGULAR_STIFFNESS: 0.01,
        /** Damping factor for mouse constraint */
        DAMPING: 0.05
    },
    
    /**
     * Text rendering and physics settings
     * @type {Object}
     */
    TEXT: {
        /** Minimum font size in pixels */
        MIN_FONT_SIZE: 24,
        /** Maximum font size in pixels */
        MAX_FONT_SIZE: 72,
        /** Font scaling factor for responsive design */
        FONT_SCALE_FACTOR: 0.06,
        /** Default density for text physics bodies */
        DEFAULT_DENSITY: 0.001,
        /** Default air friction for text physics bodies */
        DEFAULT_FRICTION_AIR: 0.08,
        /** Default sleep threshold for text physics bodies */
        DEFAULT_SLEEP_THRESHOLD: 30,
        /** Default damping for text physics bodies */
        DEFAULT_DAMPING: 0.3
    },
    
    /**
     * Animation and visual effects settings
     * @type {Object}
     */
    ANIMATION: {
        /** Delay for scene transitions in milliseconds */
        SCENE_TRANSITION_DELAY: 1000,
        /** Delay for Julian scene in milliseconds */
        JULIAN_SCENE_DELAY: 1500,
        /** Delay for color changes in milliseconds */
        COLOR_CHANGE_DELAY: 2000,
        /** Delay before tunnel effect starts in milliseconds */
        TUNNEL_EFFECT_DELAY: 2000,
        /** Mass multiplier for falling objects */
        FALL_MASS_MULTIPLIER: 3,
        /** Air friction when objects detach */
        DETACH_FRICTION_AIR: 0.02
    },
    
    /**
     * Background particle system settings
     * @type {Object}
     */
    PARTICLES: {
        /** Default maximum number of particles */
        DEFAULT_MAX: 80,
        /** Default particle spawn rate */
        DEFAULT_SPAWN_RATE: 0.3,
        /** Default minimum particle size in pixels */
        DEFAULT_MIN_SIZE: 1,
        /** Default maximum particle size in pixels */
        DEFAULT_MAX_SIZE: 4,
        /** Default minimum particle lifetime in milliseconds */
        DEFAULT_MIN_LIFETIME: 3000,
        /** Default maximum particle lifetime in milliseconds */
        DEFAULT_MAX_LIFETIME: 8000
    },
    
    /**
     * Responsive design settings
     * @type {Object}
     */
    RESPONSIVE: {
        /** Multiplier for string offset calculations */
        STRING_OFFSET_MULTIPLIER: 1.2,
        /** Multiplier for starting Y position */
        START_Y_MULTIPLIER: 0.4,
        /** Minimum spacing between elements in pixels */
        MIN_SPACING: 20,
        /** Scale factor for spacing calculations */
        SPACING_SCALE_FACTOR: 0.02,
        /** Scale factor for screen width calculations */
        SCREEN_WIDTH_SCALE_FACTOR: 0.08
    },
    
    /**
     * Color definitions for the application
     * @type {Object}
     */
    COLORS: {
        /** Default gold color */
        DEFAULT_GOLD: 'rgba(255, 215, 0, 1)',
        /** Default stroke color */
        DEFAULT_STROKE: 'rgb(255, 238, 140)',
        /** Default string color */
        DEFAULT_STRING: 'rgba(255, 215, 0, 1)',
        /** Black mode color */
        BLACK_MODE: 'black',
        /** White background color */
        BACKGROUND_WHITE: 'white',
        /** Array of particle colors for shimmer effects */
        PARTICLE_COLORS: [
            'rgb(181, 153, 0)', // Gold
            'rgb(181, 117, 0)', // Orange
            'rgb(179, 179, 71)', // Light yellow
            'rgb(178, 159, 63)', // Warm gold
            'rgb(196, 181, 45)'  // Bright yellow
        ]
    },
    
    /**
     * Debug and development settings
     * @type {Object}
     */
    DEBUG: {
        /** Whether debug mode is enabled */
        ENABLED: true,
        /** Whether to show physics information */
        SHOW_PHYSICS_INFO: true,
        /** Whether to show color information */
        SHOW_COLOR_INFO: true,
        /** Whether to log scene changes */
        LOG_SCENE_CHANGES: true
    },

    /**
     * Feature flags for runtime experiments and fallbacks
     * @type {Object}
     */
    FEATURE_FLAGS: {
        /** Skip the hanging text intro and jump straight to the tunnel */
        SKIP_HANGING_TEXT_SCENES: true
    }
};

/**
 * Get a specific configuration value by path
 * @param {string} path - Dot-separated path to the configuration value (e.g., 'PHYSICS.GRAVITY')
 * @returns {*} - The configuration value
 * @example
 * getConfig('PHYSICS.GRAVITY') // Returns 1
 * getConfig('COLORS.DEFAULT_GOLD') // Returns 'rgba(255, 215, 0, 1)'
 */
export function getConfig(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], APP_CONFIG);
}

/**
 * Set a configuration value by path
 * @param {string} path - Dot-separated path to the configuration value
 * @param {*} value - The new value to set
 * @example
 * setConfig('PHYSICS.GRAVITY', 2)
 * setConfig('DEBUG.ENABLED', false)
 */
export function setConfig(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const obj = keys.reduce((current, key) => {
        if (!(key in current)) {
            current[key] = {};
        }
        return current[key];
    }, APP_CONFIG);
    
    obj[lastKey] = value;
}

/**
 * Get all physics-related configuration
 * @returns {Object} - Physics configuration object
 */
export function getPhysicsConfig() {
    return APP_CONFIG.PHYSICS;
}

/**
 * Get all color-related configuration
 * @returns {Object} - Colors configuration object
 */
export function getColorsConfig() {
    return APP_CONFIG.COLORS;
}

/**
 * Get all debug-related configuration
 * @returns {Object} - Debug configuration object
 */
export function getDebugConfig() {
    return APP_CONFIG.DEBUG;
}

/**
 * Get all particle-related configuration
 * @returns {Object} - Particles configuration object
 */
export function getParticlesConfig() {
    return APP_CONFIG.PARTICLES;
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} - True if debug mode is enabled
 */
export function isDebugEnabled() {
    return APP_CONFIG.DEBUG.ENABLED;
}

/**
 * Get the default particle colors array
 * @returns {string[]} - Array of particle color strings
 */
export function getParticleColors() {
    return APP_CONFIG.COLORS.PARTICLE_COLORS;
}

/**
 * Get viewport dimensions configuration
 * @returns {Object} - Object containing cleanup interval and max offscreen distance
 */
export function getCleanupConfig() {
    return APP_CONFIG.CLEANUP;
} 
