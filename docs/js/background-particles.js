import { getViewportDimensions } from './config.js';
import { APP_CONFIG } from './constants.js';

/**
 * Individual particle class for background effects
 * @class Particle
 */
class Particle {
    /**
     * Create a new particle
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {Object} options - Particle configuration options
     * @param {number} [options.size=2] - Particle size in pixels
     * @param {string} [options.color] - Particle color (defaults to first color in APP_CONFIG.COLORS.PARTICLE_COLORS)
     * @param {number} [options.lifetime=5000] - Particle lifetime in milliseconds
     */
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.size = options.size || 2;
        this.color = options.color || APP_CONFIG.COLORS.PARTICLE_COLORS[0];
        this.birthTime = performance.now();
        this.lifetime = options.lifetime || 5000;
        
        // Animation properties
        this.shimmerOffset = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.8 + Math.random() * 1.4;
        this.maxAlpha = 0.3 + Math.random() * 0.4;
        this.twinkleSpeed = 0.5 + Math.random() * 1.5;
        
        // Movement properties
        this.driftX = (Math.random() - 0.5) * 0.2;
        this.driftY = (Math.random() - 0.5) * 0.1;
    }
    
    /**
     * Update particle position and check if it's still alive
     * @param {number} now - Current timestamp from performance.now()
     * @param {number} width - Screen width for boundary wrapping
     * @param {number} height - Screen height for boundary wrapping
     * @returns {boolean} - True if particle is still alive, false if expired
     */
    update(now, width, height) {
        const age = now - this.birthTime;
        
        // Update position (drift)
        this.x += this.driftX;
        this.y += this.driftY;
        
        // Wrap around screen edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
        
        return age <= this.lifetime;
    }
    
    /**
     * Calculate the current alpha value for the particle based on age and effects
     * @param {number} now - Current timestamp from performance.now()
     * @returns {number} - Alpha value between 0 and 1
     */
    getAlpha(now) {
        const age = now - this.birthTime;
        const normalizedAge = age / this.lifetime;
        
        // Fade in/out effect (peaks in middle of lifetime)
        let alpha = this.maxAlpha;
        if (normalizedAge < 0.2) {
            alpha *= normalizedAge / 0.2;
        } else if (normalizedAge > 0.8) {
            alpha *= (1 - normalizedAge) / 0.2;
        }
        
        // Shimmer effect
        const time = now * 0.001;
        const shimmerTime = time * this.pulseSpeed + this.shimmerOffset;
        const shimmerAlpha = alpha * (0.4 + 0.6 * Math.sin(shimmerTime));
        
        // Occasional brightness bursts (twinkle)
        const twinkleTime = time * this.twinkleSpeed + this.shimmerOffset;
        const twinkleMultiplier = 1 + 0.5 * Math.sin(twinkleTime * 0.7) * Math.sin(twinkleTime * 1.3);
        
        return Math.max(0, shimmerAlpha * twinkleMultiplier);
    }
    
    /**
     * Draw the particle on the canvas with glow effects
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} now - Current timestamp from performance.now()
     */
    draw(ctx, now) {
        const alpha = this.getAlpha(now);
        
        if (alpha <= 0.01) return;
        
        // Draw multiple glow layers
        for (let layer = 0; layer < 3; layer++) {
            ctx.save();
            
            const layerAlpha = alpha * (1 - layer * 0.3);
            const layerSize = this.size * (1 + layer * 0.5);
            const layerBlur = 2 + layer * 3;
            
            ctx.globalAlpha = layerAlpha;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = layerBlur;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, layerSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Draw particle
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = 'transparent';
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

/**
 * BackgroundParticles class for managing multiple particles with shimmer effects
 * @class BackgroundParticles
 */
export class BackgroundParticles {
    /**
     * Create a new BackgroundParticles instance
     * @param {Object} options - Configuration options
     * @param {number} [options.maxParticles] - Maximum number of particles (defaults to APP_CONFIG.PARTICLES.DEFAULT_MAX)
     * @param {number} [options.spawnRate] - Particle spawn rate (defaults to APP_CONFIG.PARTICLES.DEFAULT_SPAWN_RATE)
     * @param {number} [options.minSize] - Minimum particle size (defaults to APP_CONFIG.PARTICLES.DEFAULT_MIN_SIZE)
     * @param {number} [options.maxSize] - Maximum particle size (defaults to APP_CONFIG.PARTICLES.DEFAULT_MAX_SIZE)
     * @param {number} [options.minLifetime] - Minimum particle lifetime in ms (defaults to APP_CONFIG.PARTICLES.DEFAULT_MIN_LIFETIME)
     * @param {number} [options.maxLifetime] - Maximum particle lifetime in ms (defaults to APP_CONFIG.PARTICLES.DEFAULT_MAX_LIFETIME)
     * @param {string[]} [options.colors] - Array of particle colors (defaults to APP_CONFIG.COLORS.PARTICLE_COLORS)
     */
    constructor(options = {}) {
        this.particles = [];
        this.isActive = true;
        
        // Config
        this.config = {
            maxParticles: options.maxParticles || APP_CONFIG.PARTICLES.DEFAULT_MAX,
            spawnRate: options.spawnRate || APP_CONFIG.PARTICLES.DEFAULT_SPAWN_RATE,
            minSize: options.minSize || APP_CONFIG.PARTICLES.DEFAULT_MIN_SIZE,
            maxSize: options.maxSize || APP_CONFIG.PARTICLES.DEFAULT_MAX_SIZE,
            minLifetime: options.minLifetime || APP_CONFIG.PARTICLES.DEFAULT_MIN_LIFETIME,
            maxLifetime: options.maxLifetime || APP_CONFIG.PARTICLES.DEFAULT_MAX_LIFETIME,
            colors: options.colors || APP_CONFIG.COLORS.PARTICLE_COLORS
        };
        
        this.initializeParticles();
    }
    
    initializeParticles() {
        const { width, height } = getViewportDimensions();
        const initialCount = Math.floor(this.config.maxParticles * 0.3);
        
        for (let i = 0; i < initialCount; i++) {
            this.spawnParticle(width, height);
        }
    }
    
    /**
     * Spawn a new particle at a random position
     * @param {number} [width] - Screen width (if not provided, will be fetched from getViewportDimensions)
     * @param {number} [height] - Screen height (if not provided, will be fetched from getViewportDimensions)
     */
    spawnParticle(width = null, height = null) {
        if (this.particles.length >= this.config.maxParticles) return;
        
        const dimensions = width && height ? { width, height } : getViewportDimensions();
        
        const particleOptions = {
            size: this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize),
            color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
            lifetime: this.config.minLifetime + Math.random() * (this.config.maxLifetime - this.config.minLifetime)
        };
        
        const particle = new Particle(
            Math.random() * dimensions.width,
            Math.random() * dimensions.height,
            particleOptions
        );
        
        this.particles.push(particle);
    }
    
    /**
     * Update all particles and spawn new ones if needed
     */
    update() {
        if (!this.isActive) return;
        
        const now = performance.now();
        const { width, height } = getViewportDimensions();
        
        // Update and filter expired particles
        this.particles = this.particles.filter(particle => 
            particle.update(now, width, height)
        );
        
        // Create new particles
        if (Math.random() < this.config.spawnRate && this.particles.length < this.config.maxParticles) {
            this.spawnParticle(width, height);
        }
    }
    
    /**
     * Draw all particles on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     */
    draw(ctx) {
        const now = performance.now();
        
        ctx.save();
        this.particles.forEach(particle => particle.draw(ctx, now));
        ctx.restore();
    }
    
    /**
     * Handle window resize by removing off-screen particles and spawning new ones
     */
    updateForResize() {
        const { width, height } = getViewportDimensions();
        
        // Remove particles which are now off-screen
        this.particles = this.particles.filter(particle => 
            particle.x <= width && particle.y <= height
        );
        
        // Create new particles to fill the space
        const targetCount = Math.floor(this.config.maxParticles * 0.3);
        while (this.particles.length < targetCount) {
            this.spawnParticle(width, height);
        }
    }
    
    /**
     * Destroy all particles and stop the particle system
     */
    destroy() {
        this.particles = [];
        this.isActive = false;
    }
    
    /**
     * Update particle colors for all particles
     * @param {string[]} colors - Array of color strings to use for particles
     */
    setColors(colors) {
        if (colors && Array.isArray(colors)) {
            this.config.colors = colors;
            
            // Update existing particles
        this.particles.forEach(particle => {
                particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        });
        }
    }
    
    /**
     * Get the current number of active particles
     * @returns {number} - Number of particles currently active
     */
    getParticleCount() {
        return this.particles.length;
    }
    
    /**
     * Get the maximum number of particles allowed
     * @returns {number} - Maximum particle count
     */
    getMaxParticles() {
        return this.config.maxParticles;
    }
    
    /**
     * Check if the particle system has been destroyed
     * @returns {boolean} - True if destroyed, false if active
     */
    isDestroyed() {
        return !this.isActive;
    }
} 