import { APP_CONFIG } from './constants.js';

/**
 * Centralized logging utility with categorized logging methods
 * @class Logger
 */
class Logger {
    /**
     * Create a new Logger instance
     */
    constructor() {
        this.isEnabled = APP_CONFIG.DEBUG.ENABLED;
        this.showSceneChanges = APP_CONFIG.DEBUG.LOG_SCENE_CHANGES;
        this.showPhysicsInfo = APP_CONFIG.DEBUG.SHOW_PHYSICS_INFO;
        this.showColorInfo = APP_CONFIG.DEBUG.SHOW_COLOR_INFO;
        
        // Memory logging interval
        this.memoryLogInterval = null;
        this.memoryLogEnabled = false;
        
        // Start automatic memory logging if enabled
        this.startMemoryLogging();
    }

    /**
     * Log application lifecycle messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    app(message, ...args) {
        if (this.isEnabled) {
            console.log(`🚀 ${message}`, ...args);
        }
    }
    
    /**
     * Log scene management messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    scene(message, ...args) {
        if (this.isEnabled && this.showSceneChanges) {
            console.log(`🎬 ${message}`, ...args);
        }
    }
    
    /**
     * Log physics and interaction messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    physics(message, ...args) {
        if (this.isEnabled && this.showPhysicsInfo) {
            console.log(`📏 ${message}`, ...args);
        }
    }
    
    /**
     * Log ground and collision messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    ground(message, ...args) {
        if (this.isEnabled) {
            console.log(`🌍 ${message}`, ...args);
        }
    }
    
    /**
     * Log color changes and visual effects messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    color(message, ...args) {
        if (this.isEnabled && this.showColorInfo) {
            console.log(`🎨 ${message}`, ...args);
        }
    }
    
    /**
     * Log cleanup and memory management messages
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    cleanup(message, ...args) {
        if (this.isEnabled) {
            console.log(`🧹 ${message}`, ...args);
        }
    }
    
    /**
     * Log error messages (always shown regardless of debug settings)
     * @param {string} message - The error message to log
     * @param {...any} args - Additional arguments to log
     */
    error(message, ...args) {
        console.error(`❌ ${message}`, ...args);
    }
    
    /**
     * Log warning messages (always shown regardless of debug settings)
     * @param {string} message - The warning message to log
     * @param {...any} args - Additional arguments to log
     */
    warn(message, ...args) {
        console.warn(`⚠️  ${message}`, ...args);
    }
    
    /**
     * Log success messages
     * @param {string} message - The success message to log
     * @param {...any} args - Additional arguments to log
     */
    success(message, ...args) {
        if (this.isEnabled) {
            console.log(`✅ ${message}`, ...args);
        }
    }
    
    /**
     * Log debug information in a formatted block
     * @param {string} title - The title for the debug block
     * @param {Object|any} data - The data to display in the block
     */
    debugBlock(title, data) {
        if (this.isEnabled) {
            console.log(`=== ${title} ===`);
            
            if (typeof data === 'object' && data !== null) {
                Object.entries(data).forEach(([key, value]) => {
                    console.log(`  ${key}:`, value);
                });
            } else {
                console.log(data);
            }
            
            console.log('='.repeat(title.length + 8));
        }
    }

    /**
     * Log performance timing information
     * @param {string} label - The label for the timing measurement
     * @param {number} startTime - The start time from performance.now()
     */
    timing(label, startTime) {
        if (this.isEnabled) {
            const duration = performance.now() - startTime;
            console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Log memory usage information
     * @param {string} context - The context for the memory log
     */
    memory(context = '') {
        if (this.isEnabled && performance.memory) {
            const memory = performance.memory;
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
            const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
            const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
            
            console.log(`💾 ${context} Memory: ${usedMB}MB / ${totalMB}MB (Limit: ${limitMB}MB)`);
        }
    }

    /**
     * Log grouped information with a collapsible group
     * @param {string} groupName - The name of the group
     * @param {Function} callback - Function containing the grouped logs
     */
    group(groupName, callback) {
        if (this.isEnabled) {
            console.group(`📦 ${groupName}`);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Log a table of data
     * @param {string} title - The title for the table
     * @param {Array|Object} data - The data to display in table format
     */
    table(title, data) {
        if (this.isEnabled) {
            console.log(`📊 ${title}`);
            console.table(data);
        }
    }

    /**
     * Update logger settings based on current APP_CONFIG
     */
    updateSettings() {
        this.isEnabled = APP_CONFIG.DEBUG.ENABLED;
        this.showSceneChanges = APP_CONFIG.DEBUG.LOG_SCENE_CHANGES;
        this.showPhysicsInfo = APP_CONFIG.DEBUG.SHOW_PHYSICS_INFO;
        this.showColorInfo = APP_CONFIG.DEBUG.SHOW_COLOR_INFO;
    }

    /**
     * Enable or disable logging
     * @param {boolean} enabled - Whether to enable logging
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Check if logging is currently enabled
     * @returns {boolean} - True if logging is enabled, false otherwise
     */
    isLoggingEnabled() {
        return this.isEnabled;
    }

    /**
     * Start automatic memory logging every 5 seconds
     */
    startMemoryLogging() {
        if (this.isEnabled && performance.memory) {
            this.memoryLogEnabled = true;
            this.memoryLogInterval = setInterval(() => {
                this.memory('Auto');
            }, 5000); // 5 seconds
            
            this.app('Automatic memory logging started');
        }
    }

    /**
     * Stop automatic memory logging
     */
    stopMemoryLogging() {
        if (this.memoryLogInterval) {
            clearInterval(this.memoryLogInterval);
            this.memoryLogInterval = null;
            this.memoryLogEnabled = false;
            this.app('Automatic memory logging stopped');
        }
    }

    /**
     * Check if automatic memory logging is enabled
     * @returns {boolean} - True if memory logging is active, false otherwise
     */
    isMemoryLoggingEnabled() {
        return this.memoryLogEnabled;
    }

    /**
     * Set the memory logging interval
     * @param {number} intervalMs - Interval in milliseconds (default: 5000)
     */
    setMemoryLogInterval(intervalMs = 5000) {
        if (this.memoryLogInterval) {
            this.stopMemoryLogging();
        }
        
        if (this.isEnabled && performance.memory) {
            this.memoryLogEnabled = true;
            this.memoryLogInterval = setInterval(() => {
                this.memory('Auto');
            }, intervalMs);
            
            this.app(`Memory logging interval set to ${intervalMs}ms`);
        }
    }

    /**
     * Get current logger settings
     * @returns {Object} - Current logger configuration
     */
    getSettings() {
        return {
            enabled: this.isEnabled,
            showSceneChanges: this.showSceneChanges,
            showPhysicsInfo: this.showPhysicsInfo,
            showColorInfo: this.showColorInfo,
            memoryLogging: this.memoryLogEnabled
        };
    }

    /**
     * Clean up logger resources
     */
    destroy() {
        this.stopMemoryLogging();
    }
}

// Create and export the logger instance
export const logger = new Logger(); 