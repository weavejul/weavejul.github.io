// Application constants and configuration values
export const APP_CONFIG = {
    // Cleanup and performance
    CLEANUP_INTERVAL: 300, // frames (~5 seconds at 60fps)
    MAX_OFFSCREEN_DISTANCE: 1000, // pixels
    
    // Physics configuration
    PHYSICS: {
        GRAVITY: 1,
        CONSTRAINT_ITERATIONS: 10,
        POSITION_ITERATIONS: 10,
        VELOCITY_ITERATIONS: 10,
        STRING_SEGMENTS: 15, // pixels per segment
    },
    
    // Mouse constraint settings
    MOUSE: {
        STIFFNESS: 0.01,
        ANGULAR_STIFFNESS: 0.01,
        DAMPING: 0.05,
    },
    
    // Text defaults
    TEXT: {
        MIN_FONT_SIZE: 24,
        MAX_FONT_SIZE: 72,
        FONT_SCALE_FACTOR: 0.06,
        DEFAULT_DENSITY: 0.001,
        DEFAULT_FRICTION_AIR: 0.08,
        DEFAULT_SLEEP_THRESHOLD: 30,
        DEFAULT_DAMPING: 0.3,
    },
    
    // Animation and effects
    ANIMATION: {
        SCENE_TRANSITION_DELAY: 1000, // ms
        JULIAN_SCENE_DELAY: 1500, // ms
        COLOR_CHANGE_DELAY: 2000, // ms
        TUNNEL_EFFECT_DELAY: 2000, // ms - delay before tunnel effect starts
        FALL_MASS_MULTIPLIER: 3,
        DETACH_FRICTION_AIR: 0.02,
    },
    
    // Background particles
    PARTICLES: {
        DEFAULT_MAX: 80,
        DEFAULT_SPAWN_RATE: 0.3,
        DEFAULT_MIN_SIZE: 1,
        DEFAULT_MAX_SIZE: 4,
        DEFAULT_MIN_LIFETIME: 3000, // ms
        DEFAULT_MAX_LIFETIME: 8000, // ms
    },
    
    // Responsive design
    RESPONSIVE: {
        STRING_OFFSET_MULTIPLIER: 1.2,
        START_Y_MULTIPLIER: 0.4,
        MIN_SPACING: 20,
        SPACING_SCALE_FACTOR: 0.02,
        SCREEN_WIDTH_SCALE_FACTOR: 0.08,
    },
    
    // Colors
    COLORS: {
        DEFAULT_GOLD: 'rgba(255, 215, 0, 1)',
        DEFAULT_STROKE: 'rgb(255, 238, 140)',
        DEFAULT_STRING: 'rgba(255, 215, 0, 1)',
        BLACK_MODE: 'black',
        BACKGROUND_WHITE: 'white',
        PARTICLE_COLORS: [
            'rgb(181, 153, 0)', // Gold
            'rgb(181, 117, 0)', // Orange
            'rgb(179, 179, 71)', // Light yellow
            'rgb(178, 159, 63)', // Warm gold
            'rgb(196, 181, 45)'  // Bright yellow
        ]
    },
    
    // Debug settings
    DEBUG: {
        ENABLED: true, // Set to false for production
        SHOW_PHYSICS_INFO: true,
        SHOW_COLOR_INFO: true,
        LOG_SCENE_CHANGES: true,
    }
}; 