import { APP_CONFIG } from './constants.js';

// Centralized logging utility
export const logger = {
    // Application lifecycle
    app: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED) console.log(`🚀 ${message}`, ...args);
    },
    
    // Scene management
    scene: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED && APP_CONFIG.DEBUG.LOG_SCENE_CHANGES) {
            console.log(`🎬 ${message}`, ...args);
        }
    },
    
    // Physics and interactions
    physics: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED && APP_CONFIG.DEBUG.SHOW_PHYSICS_INFO) {
            console.log(`📏 ${message}`, ...args);
        }
    },
    
    // Ground and collision
    ground: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED) console.log(`🌍 ${message}`, ...args);
    },
    
    // Color changes and visual effects
    color: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED && APP_CONFIG.DEBUG.SHOW_COLOR_INFO) {
            console.log(`🎨 ${message}`, ...args);
        }
    },
    
    // Cleanup and memory
    cleanup: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED) console.log(`🧹 ${message}`, ...args);
    },
    
    // Errors (always shown)
    error: (message, ...args) => {
        console.error(`❌ ${message}`, ...args);
    },
    
    // Warnings (always shown)
    warn: (message, ...args) => {
        console.warn(`⚠️  ${message}`, ...args);
    },
    
    // Success messages
    success: (message, ...args) => {
        if (APP_CONFIG.DEBUG.ENABLED) console.log(`✅ ${message}`, ...args);
    },
    
    // Debug info blocks
    debugBlock: (title, data) => {
        if (APP_CONFIG.DEBUG.ENABLED) {
            console.log(`=== ${title} ===`);
            if (typeof data === 'object') {
                Object.entries(data).forEach(([key, value]) => {
                    console.log(`  ${key}:`, value);
                });
            } else {
                console.log(data);
            }
            console.log('='.repeat(title.length + 8));
        }
    }
}; 