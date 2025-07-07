import { logger } from './logger.js';
import { APP_CONFIG } from './constants.js';

// Consolidated debug utilities
export class DebugUtils {
    static init(sceneManager, backgroundParticles, world, render) {
        this.sceneManager = sceneManager;
        this.backgroundParticles = backgroundParticles;
        this.world = world;
        this.render = render;
        
        // Add debug functions to window for console access
        this.addToWindow();
    }
    
    static addToWindow() {
        // Only add debug functions if debugging is enabled
        if (!APP_CONFIG.DEBUG.ENABLED) return;
        
        window.debugPhysicsApp = () => this.logPhysicsInfo();
        window.debugColors = () => this.logColorInfo();
        window.testColorChange = () => this.testColorChange();
        window.resetColors = () => this.resetColors();
        window.testMemoryLeaks = () => this.testMemoryLeaks();
        window.checkMemoryUsage = () => this.checkMemoryUsage();
        
        // Log available debug functions
        logger.app('Debug functions available:', Object.keys(window).filter(key => key.startsWith('debug') || key.startsWith('test') || key.startsWith('check')));
    }
    
    static logPhysicsInfo() {
        if (!this.sceneManager || !this.world) return;
        
        const info = {
            'Scene Manager': this.sceneManager ? 'Active' : 'Inactive',
            'Current Scene': this.sceneManager?.getCurrentScene() || 'None',
            'Hanging Texts': this.sceneManager?.getHangingTexts().length || 0,
            'Physics Bodies': this.world.bodies.length,
            'Physics Constraints': this.world.constraints.length,
            'Physics Composites': this.world.composites.length,
            'Ground Bodies': this.sceneManager?.groundManager?.getGroundBodies().length || 0,
            'Collision Enabled': this.sceneManager?.groundManager?.isCollisionEnabled() || false,
            'Background Particles': this.backgroundParticles?.particles.length || 0
        };
        
        logger.debugBlock('Physics App Debug Info', info);
        
        // Log collision categories
        this.logCollisionCategories();
    }
    
    static logColorInfo() {
        if (!this.sceneManager) return;
        
        const colorInfo = {
            'Body Background': document.body.style.backgroundColor || 'default',
            'Render Background': this.render?.options.background || 'default',
            'Particle Colors': this.backgroundParticles?.colors || 'none',
            'Particle Count': this.backgroundParticles?.particles.length || 0
        };
        
        logger.debugBlock('Color Debug Info', colorInfo);
        
        // Log text colors
        this.sceneManager.getHangingTexts().forEach((text, index) => {
            logger.color(`Text ${index}: "${text.options.text}" - color: ${text.options.color}, string: ${text.options.stringColor}`);
        });
    }
    
    static logCollisionCategories() {
        if (!this.world) return;
        
        const categories = {};
        this.world.bodies.forEach(body => {
            const category = body.collisionFilter.category;
            if (!categories[category]) {
                categories[category] = { count: 0, examples: [] };
            }
            categories[category].count++;
            if (categories[category].examples.length < 3) {
                categories[category].examples.push(body.label || 'unlabeled');
            }
        });
        
        logger.debugBlock('Collision Categories', categories);
    }
    
    static testColorChange() {
        if (!this.sceneManager) {
            logger.warn('Scene manager not available');
            return;
        }
        
        logger.color('TESTING: Manual color change trigger');
        this.sceneManager.triggerColorChange();
    }
    
    static resetColors() {
        if (!this.sceneManager) {
            logger.warn('Scene manager not available');
            return;
        }
        
        logger.color('TESTING: Resetting colors to default');
        
        try {
            // Reset background
            document.body.style.backgroundColor = '';
            this.render.options.background = 'rgba(0, 0, 0, 1)';
            
            // Reset background particles
            if (this.backgroundParticles) {
                this.backgroundParticles.setColors(APP_CONFIG.COLORS.PARTICLE_COLORS);
            }
            
            // Reset text colors
            this.sceneManager.getHangingTexts().forEach(hangingText => {
                hangingText.setColors({
                    color: APP_CONFIG.COLORS.DEFAULT_GOLD,
                    strokeColor: APP_CONFIG.COLORS.DEFAULT_STROKE,
                    glowColor: APP_CONFIG.COLORS.DEFAULT_GOLD,
                    stringColor: APP_CONFIG.COLORS.DEFAULT_STRING,
                    sparkColor: APP_CONFIG.COLORS.DEFAULT_GOLD
                });
            });
            
            // Reset existing sparks
            this.world.bodies.forEach(body => {
                if (body.label === 'spark' && body.render) {
                    body.render.fillStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
                    body.render.strokeStyle = APP_CONFIG.COLORS.DEFAULT_GOLD;
                }
            });
            
            logger.success('Colors reset to default');
        } catch (error) {
            logger.error('Error resetting colors:', error);
        }
    }
    
    static testMemoryLeaks() {
        if (!this.sceneManager || !this.world) return;
        
        logger.debugBlock('Memory Leak Test', 'Starting test...');
        
        const initialBodies = this.world.bodies.length;
        const initialConstraints = this.world.constraints.length;
        const initialParticles = this.backgroundParticles?.particles.length || 0;
        
        logger.app(`Initial counts - Bodies: ${initialBodies}, Constraints: ${initialConstraints}, Particles: ${initialParticles}`);
        
        // Test multiple resets
        for (let i = 0; i < 3; i++) {
            this.sceneManager.reset();
            logger.app(`After reset ${i + 1} - Bodies: ${this.world.bodies.length}, Constraints: ${this.world.constraints.length}`);
        }
        
        const finalBodies = this.world.bodies.length;
        const finalConstraints = this.world.constraints.length;
        const leakDetected = finalBodies > initialBodies || finalConstraints > initialConstraints;
        
        logger.debugBlock('Memory Leak Test Complete', {
            'Initial Bodies': initialBodies,
            'Final Bodies': finalBodies,
            'Initial Constraints': initialConstraints,
            'Final Constraints': finalConstraints,
            'Leak Detected': leakDetected
        });
    }
    
    static checkMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            logger.debugBlock('Memory Usage', {
                'Used JS Heap': (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
                'Total JS Heap': (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
                'JS Heap Limit': (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
            });
        } else {
            logger.warn('Memory monitoring not available in this browser');
        }
    }
} 