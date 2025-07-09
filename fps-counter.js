import { logger } from './logger.js';

export class FPSCounter {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = performance.now();
        this.element = null;
        this.isActive = false;
    }

    // Initialize the FPS counter
    init() {
        logger.scene('Initializing FPS counter...');
        
        // Create FPS display element
        this.element = document.createElement('div');
        this.element.id = 'fps-counter';
        this.element.style.position = 'fixed';
        this.element.style.top = '10px';
        this.element.style.right = '10px';
        this.element.style.zIndex = '9999'; // Above everything else
        this.element.style.fontFamily = 'monospace';
        this.element.style.fontSize = '14px';
        this.element.style.fontWeight = 'bold';
        this.element.style.color = 'rgba(255, 215, 0, 1)'; // Gold color
        this.element.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        this.element.style.pointerEvents = 'none'; // Don't block mouse events
        this.element.style.userSelect = 'none'; // Prevent text selection
        this.element.textContent = 'FPS: 0';
        
        document.body.appendChild(this.element);
        
        this.isActive = true;
        logger.scene('FPS counter initialized');
    }

    // Update FPS calculation
    update() {
        if (!this.isActive) return;
        
        const currentTime = performance.now();
        this.frameCount++;
        
        // Update FPS every 500ms
        if (currentTime - this.lastFpsUpdate >= 500) {
            const deltaTime = currentTime - this.lastFpsUpdate;
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            // Update display
            if (this.element) {
                this.element.textContent = `FPS: ${this.fps}`;
            }
        }
        
        this.lastTime = currentTime;
    }

    // Get current FPS value
    getFPS() {
        return this.fps;
    }

    // Destroy the FPS counter
    destroy() {
        logger.scene('Destroying FPS counter...');
        
        this.isActive = false;
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = 0;
        this.lastFpsUpdate = 0;
        
        logger.scene('FPS counter destroyed');
    }

    // Check if FPS counter is running
    isRunning() {
        return this.isActive;
    }
} 