import { getViewportDimensions } from './config.js';
import { APP_CONFIG } from './constants.js';

// BackgroundParticles class for subtle gold shimmer effects
export class BackgroundParticles {
    constructor(options = {}) {
        this.particles = [];
        this.maxParticles = options.maxParticles || APP_CONFIG.PARTICLES.DEFAULT_MAX;
        this.spawnRate = options.spawnRate || APP_CONFIG.PARTICLES.DEFAULT_SPAWN_RATE;
        this.minSize = options.minSize || APP_CONFIG.PARTICLES.DEFAULT_MIN_SIZE;
        this.maxSize = options.maxSize || APP_CONFIG.PARTICLES.DEFAULT_MAX_SIZE;
        this.minLifetime = options.minLifetime || APP_CONFIG.PARTICLES.DEFAULT_MIN_LIFETIME;
        this.maxLifetime = options.maxLifetime || APP_CONFIG.PARTICLES.DEFAULT_MAX_LIFETIME;
        this.colors = options.colors || APP_CONFIG.COLORS.PARTICLE_COLORS;
        this.isActive = true;
        
        // Initialize some particles
        this.initializeParticles();
    }
    
    initializeParticles() {
        // Create initial particles spread across the screen
        for (let i = 0; i < this.maxParticles * 0.3; i++) {
            this.spawnParticle();
        }
    }
    
    spawnParticle() {
        if (this.particles.length >= this.maxParticles) return;
        
        const now = performance.now();
        const { width, height } = getViewportDimensions();
        
        const particle = {
            x: Math.random() * width,
            y: Math.random() * height,
            size: this.minSize + Math.random() * (this.maxSize - this.minSize),
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            birthTime: now,
            lifetime: this.minLifetime + Math.random() * (this.maxLifetime - this.minLifetime),
            shimmerOffset: Math.random() * Math.PI * 2, // Random starting phase
            pulseSpeed: 0.8 + Math.random() * 1.4, // Random pulse speed
            maxAlpha: 0.3 + Math.random() * 0.4, // Random max brightness
            twinkleSpeed: 0.5 + Math.random() * 1.5, // Random twinkle speed
            driftX: (Math.random() - 0.5) * 0.2, // Subtle horizontal drift
            driftY: (Math.random() - 0.5) * 0.1  // Subtle vertical drift
        };
        
        this.particles.push(particle);
    }
    
    update() {
        if (!this.isActive) return;
        
        const now = performance.now();
        const { width, height } = getViewportDimensions();
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const age = now - particle.birthTime;
            
            // Remove expired particles
            if (age > particle.lifetime) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update position with subtle drift
            particle.x += particle.driftX;
            particle.y += particle.driftY;
            
            // Wrap around screen edges
            if (particle.x < 0) particle.x = width;
            if (particle.x > width) particle.x = 0;
            if (particle.y < 0) particle.y = height;
            if (particle.y > height) particle.y = 0;
        }
        
        // Spawn new particles randomly
        if (Math.random() < this.spawnRate && this.particles.length < this.maxParticles) {
            this.spawnParticle();
        }
    }
    
    draw(ctx) {
        const now = performance.now();
        const time = now * 0.001; // Convert to seconds
        
        ctx.save();
        
        this.particles.forEach(particle => {
            const age = now - particle.birthTime;
            const normalizedAge = age / particle.lifetime;
            
            // Fade in/out effect - peaks in the middle of lifetime
            let alpha = particle.maxAlpha;
            if (normalizedAge < 0.2) {
                // Fade in during first 20% of lifetime
                alpha *= normalizedAge / 0.2;
            } else if (normalizedAge > 0.8) {
                // Fade out during last 20% of lifetime
                alpha *= (1 - normalizedAge) / 0.2;
            }
            
            // Shimmer effect using sine waves
            const shimmerTime = time * particle.pulseSpeed + particle.shimmerOffset;
            const shimmerAlpha = alpha * (0.4 + 0.6 * Math.sin(shimmerTime));
            
            // Twinkle effect - occasional brightness bursts
            const twinkleTime = time * particle.twinkleSpeed + particle.shimmerOffset;
            const twinkleMultiplier = 1 + 0.5 * Math.sin(twinkleTime * 0.7) * Math.sin(twinkleTime * 1.3);
            
            const finalAlpha = Math.max(0, shimmerAlpha * twinkleMultiplier);
            
            if (finalAlpha > 0.01) {
                // Draw multiple glow layers for richer effect
                for (let layer = 0; layer < 3; layer++) {
                    ctx.save();
                    
                    const layerAlpha = finalAlpha * (1 - layer * 0.3);
                    const layerSize = particle.size * (1 + layer * 0.5);
                    const layerBlur = 2 + layer * 3;
                    
                    ctx.globalAlpha = layerAlpha;
                    ctx.fillStyle = particle.color;
                    ctx.shadowColor = particle.color;
                    ctx.shadowBlur = layerBlur;
                    
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, layerSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.restore();
                }
                
                // Draw the core particle
                ctx.save();
                ctx.globalAlpha = finalAlpha;
                ctx.fillStyle = particle.color;
                ctx.shadowColor = 'transparent';
                
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        });
        
        ctx.restore();
    }
    
    // Update for window resize
    updateForResize() {
        const { width, height } = getViewportDimensions();
        
        // Remove particles that are now off-screen
        this.particles = this.particles.filter(particle => {
            return particle.x <= width && particle.y <= height;
        });
        
        // Spawn some new particles to fill the space
        const targetCount = Math.floor(this.maxParticles * 0.3);
        while (this.particles.length < targetCount) {
            this.spawnParticle();
        }
    }
    
    // Clean up all particles and stop spawning
    destroy() {
        this.particles = [];
        this.isActive = false;
    }
    
    // Change particle colors to black
    setColors(colors) {
        if (colors && Array.isArray(colors)) {
            this.colors = colors;
        }
        // Also update existing particles
        this.particles.forEach(particle => {
            particle.color = this.colors[Math.floor(Math.random() * this.colors.length)];
        });
    }
} 