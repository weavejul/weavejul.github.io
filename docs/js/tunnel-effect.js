import { logger } from './logger.js';

/**
 * TunnelEffect class for creating immersive 3D tunnel visualizations
 * @class TunnelEffect
 */
export class TunnelEffect {
    /**
     * Create a new TunnelEffect instance
     */
    constructor() {
        this.isActive = false;
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.tubeMesh = null;
        this.tubeGeometry = null;
        this.tubeGeometry_o = null;
        this.tubeMaterial = null;
        this.curve = null;
        this.splineMesh = null;
        this.canvas = null;
        this.noise = null;
        this.animationId = null;
        this.startTime = null;
        this.lastFrameTime = null;
        
        // Mouse tracking for interactive tunnel
        this.mouse = {
            position: new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
            ratio: new THREE.Vector2(0.5, 0.5),
            target: new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5)
        };
        
        // Animation parameters
        this.speed = 4;
        this.rotationSpeed = 0.001;
        this.colorTime = 0;
        this.geometryComplexity = 120;
        this.tubeRadius = 0.025;
        this.tubeRadialSegments = 8;
        this.shapeTransitionSpeed = 1.0;
        this.shapeWaveSpeed = 0.5;
        
        // Shape sequence configuration
        this.shapeSequence = [
            { sides: 6, name: 'hexagon' },
            { sides: 3, name: 'triangle' },
            { sides: 4, name: 'square' },
            { sides: 5, name: 'pentagon' },
            { sides: 8, name: 'octagon' },
            { sides: 7, name: 'heptagon' },
            { sides: 12, name: 'dodecagon' },
            { sides: 6, name: 'hexagon' }
        ];
        this.currentShapeIndex = 0;
        this.shapeTransitionTime = 0;
        
        // Color animation parameters
        this.colorWaveSpeed = 0.3;
        this.paletteShiftSpeed = 0.3;
        this.paletteTime = 0;
        
        // Tunnel lifecycle timing
        this.tunnelStartTime = 0;
        this.tunnelPhase = 'fade-in';
        this.fadeInDuration = 3.0;
        this.activeDuration = 5.0;
        this.fadeOutDuration = 2.0;
        this.originalTunnelLength = 3;
        this.currentTunnelLength = 3;
        
        // Color palettes
        this.colorPalettes = this.createColorPalettes();
        this.currentPaletteIndex = 0;
        
        // Initialize noise function
        this.initNoise();
    }

    /**
     * Create color palettes for tunnel effects
     * @returns {Array<Array<Object>>} - Array of color palette arrays
     */
    createColorPalettes() {
        return [
            // Electric neon palette
            [
                { h: 0.0, s: 0.0, l: 0.0 },    // Black
                { h: 0.83, s: 1.0, l: 0.5 },   // Electric blue
                { h: 0.75, s: 1.0, l: 0.6 },   // Purple
                { h: 0.92, s: 1.0, l: 0.7 },   // Magenta
                { h: 0.17, s: 1.0, l: 0.5 }    // Yellow
            ],
            // Fire palette
            [
                { h: 0.0, s: 0.0, l: 0.0 },    // Black
                { h: 0.0, s: 1.0, l: 0.5 },    // Red
                { h: 0.08, s: 1.0, l: 0.6 },   // Orange
                { h: 0.17, s: 1.0, l: 0.7 },   // Yellow
                { h: 0.92, s: 0.8, l: 0.8 }    // Pink
            ],
            // Ocean palette
            [
                { h: 0.0, s: 0.0, l: 0.0 },    // Black
                { h: 0.5, s: 1.0, l: 0.4 },    // Cyan
                { h: 0.67, s: 1.0, l: 0.5 },   // Blue
                { h: 0.42, s: 1.0, l: 0.6 },   // Teal
                { h: 0.33, s: 1.0, l: 0.7 }    // Green
            ],
            // Rainbow palette
            [
                { h: 0.0, s: 0.0, l: 0.0 },    // Black
                { h: 0.0, s: 1.0, l: 0.6 },    // Red
                { h: 0.33, s: 1.0, l: 0.6 },   // Green
                { h: 0.67, s: 1.0, l: 0.6 },   // Blue
                { h: 0.83, s: 1.0, l: 0.6 }    // Violet
            ]
        ];
    }
    
    /**
     * Initialize noise function for procedural effects
     */
    initNoise() {
        this.noise = {
            simplex3: (x, y, z) => {
                const hash = (x * 374761393 + y * 668265263 + z * 1274126177) % 2147483647;
                const normalized = (hash / 2147483647) * 2 - 1;
                return Math.sin(normalized * Math.PI) * 0.5 + 0.5;
            }
        };
    }
    
    /**
     * Initialize the tunnel effect
     */
    init() {
        logger.scene('Initializing tunnel effect...');
        
        this.createCanvas();
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();
        this.createTunnelMesh();
        this.setupEventListeners();
        
        // Start the animation
        this.startTime = performance.now();
        this.tunnelStartTime = this.startTime;
        this.lastFrameTime = this.startTime;
        this.isActive = true;
        
        logger.scene(`Tunnel phases: fade-in ${this.fadeInDuration}s, active ${this.activeDuration}s, fade-out ${this.fadeOutDuration}s`);
        
        this.animate();
        
        // Make tunnel effect globally accessible for mobile touch navigation
        window.tunnelEffect = this;
        
        logger.scene('Tunnel effect initialized successfully');
    }

    /**
     * Create the tunnel canvas element
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tunnel-canvas';
        
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '1005',
            pointerEvents: 'none'
        });
        
        document.body.appendChild(this.canvas);
    }

    /**
     * Setup the Three.js renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
    }

    /**
     * Setup the camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.01, 1000);
        this.camera.rotation.y = Math.PI;
        this.camera.position.z = 0.35;
    }

    /**
     * Setup the scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 1, 1.9);
    }
    
    /**
     * Create the tunnel mesh with complex geometry
     */
    createTunnelMesh() {
        this.createTunnelCurve();
        this.createSplineMesh();
        this.createTubeGeometry();
        this.createTubeMaterial();
        this.applyProceduralColors();
        this.storeOriginalGeometry();
        this.createTubeMesh();
        this.createAdditionalLayers();
    }

    /**
     * Create the tunnel curve
     */
    createTunnelCurve() {
        const points = [];
        for (let i = 0; i < 5; i++) {
            points.push(new THREE.Vector3(0, 0, this.currentTunnelLength * (i / 4)));
        }
        points[4].y = -0.06; // Slight downward bend at the end
        
        this.curve = new THREE.CatmullRomCurve3(points);
        this.curve.type = "catmullrom";
    }

    /**
     * Create spline mesh for curve visualization
     */
    createSplineMesh() {
        const splineGeometry = new THREE.BufferGeometry();
        const splinePoints = this.curve.getPoints(this.geometryComplexity);
        splineGeometry.setFromPoints(splinePoints);
        this.splineMesh = new THREE.Line(splineGeometry, new THREE.LineBasicMaterial({ color: 0x444444 }));
    }

    /**
     * Create the tube geometry
     */
    createTubeGeometry() {
        this.tubeGeometry = this.createMorphingTubeGeometry();
    }

    /**
     * Create the tube material
     */
    createTubeMaterial() {
        this.tubeMaterial = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            vertexColors: true,
            transparent: true,
            opacity: 0.0 // Start invisible for fade-in
        });
    }

    /**
     * Store original geometry for animations
     */
    storeOriginalGeometry() {
        this.tubeGeometry_o = this.tubeGeometry.clone();
    }

    /**
     * Create the tube mesh
     */
    createTubeMesh() {
        this.tubeMesh = new THREE.Mesh(this.tubeGeometry, this.tubeMaterial);
        this.scene.add(this.tubeMesh);
    }
    
    /**
     * Update tunnel curve based on current length
     */
    updateTunnelCurve() {
        if (!this.curve || !this.curve.points) return;
        
        // Update curve points based on current tunnel length
        for (let i = 0; i < this.curve.points.length; i++) {
            this.curve.points[i].z = this.currentTunnelLength * (i / (this.curve.points.length - 1));
        }
        
        // Maintain the downward bend at the end
        if (this.curve.points.length > 4) {
            this.curve.points[4].y = -0.06;
        }
    }
    
    /**
     * Update ring positions based on current tunnel length
     */
    updateRingPositions() {
        if (!this.rings || this.rings.length === 0) return;
        
        const lengthRatio = this.currentTunnelLength / this.originalTunnelLength;
        
        this.rings.forEach((ring, i) => {
            // Scale ring positions to fit within current tunnel length
            const originalZ = -0.5 - i * 0.3;
            ring.mesh.position.z = originalZ * lengthRatio;
            
            // Hide rings that would be beyond the current tunnel end
            const ringVisible = Math.abs(ring.mesh.position.z) < this.currentTunnelLength;
            ring.mesh.visible = ringVisible;
        });
    }
    
    /**
     * Update tunnel phase and properties based on elapsed time
     * @param {number} elapsedTime - Elapsed time in seconds
     * @param {number} frameDelta - Frame delta time in milliseconds
     */
    updateTunnelPhase(elapsedTime, frameDelta) {
        let newPhase = this.tunnelPhase;
        
        if (elapsedTime <= this.fadeInDuration) {
            newPhase = this.handleFadeInPhase(elapsedTime);
        } else if (elapsedTime <= this.fadeInDuration + this.activeDuration) {
            newPhase = this.handleActivePhase();
        } else if (elapsedTime <= this.fadeInDuration + this.activeDuration + this.fadeOutDuration) {
            newPhase = this.handleFadeOutPhase(elapsedTime);
        } else {
            newPhase = 'complete';
            this.cleanupAndDestroy();
            return;
        }
        
        // Log phase changes
        if (newPhase !== this.tunnelPhase) {
            this.tunnelPhase = newPhase;
            logger.scene(`🌀 Tunnel phase: ${newPhase} (${elapsedTime.toFixed(1)}s elapsed)`);
        }
    }

    /**
     * Handle fade-in phase
     * @param {number} elapsedTime - Elapsed time in seconds
     * @returns {string} - New phase
     */
    handleFadeInPhase(elapsedTime) {
        const fadeProgress = elapsedTime / this.fadeInDuration;
        const smoothFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress); // Smooth step
        
        // Update opacity for all materials
        this.tubeMaterial.opacity = smoothFade;
        if (this.innerTubeMaterial) {
            this.innerTubeMaterial.opacity = smoothFade * 0.8;
        }
        if (this.rings) {
            this.rings.forEach(ring => {
                ring.mesh.material.opacity = smoothFade * 0.6;
            });
        }
        
        return 'fade-in';
    }

    /**
     * Handle active phase
     * @returns {string} - New phase
     */
    handleActivePhase() {
        // Clean up all physics objects when transitioning to active phase
        if (this.tunnelPhase !== 'active') {
            logger.scene('Tunnel entering active phase - cleaning up physics objects...');
            
            // Remove background particles entirely
            if (window.SceneManager && window.SceneManager.backgroundParticles) {
                logger.scene('Removing background particles entirely...');
                window.SceneManager.backgroundParticles.destroy();
                window.SceneManager.backgroundParticles = null;
            }
            
            // Remove all physics/text/particle objects
            if (window.SceneManager && typeof window.SceneManager.cleanupAll === 'function') {
                window.SceneManager.cleanupAll();
            }
        }
        
        // Full opacity for all materials
        this.tubeMaterial.opacity = 1.0;
        if (this.innerTubeMaterial) {
            this.innerTubeMaterial.opacity = 0.8;
        }
        if (this.rings) {
            this.rings.forEach(ring => {
                ring.mesh.material.opacity = 0.6;
            });
        }
        
        return 'active';
    }

    /**
     * Handle fade-out phase
     * @param {number} elapsedTime - Elapsed time in seconds
     * @returns {string} - New phase
     */
    handleFadeOutPhase(elapsedTime) {
        const fadeOutStart = this.fadeInDuration + this.activeDuration;
        const fadeOutProgress = (elapsedTime - fadeOutStart) / this.fadeOutDuration;
        
        // Initialize brain/fluid simulation when transitioning to fade-out phase
        if (this.tunnelPhase !== 'fade-out') {
            logger.scene('Tunnel entering fade-out phase - initializing brain and fluid simulation...');
            
            // Trigger fluid simulation and brain fade-in during fade-out
            if (window.SceneManager && typeof window.SceneManager.startFluidSimulation === 'function') {
                logger.scene('Initializing fluid simulation and brain during tunnel fade-out...');
                window.SceneManager.startFluidSimulation().catch(error => {
                    logger.error('Error starting fluid simulation:', error);
                });
            } else {
                logger.scene('SceneManager not available for fluid simulation transition');
            }
        }
        
        // Shift to black palette during fade-out
        this.forceBlackPalette = true;
        
        // Fade out opacity for all materials
        const fadeOutOpacity = 1.0 - fadeOutProgress;
        this.tubeMaterial.opacity = fadeOutOpacity;
        if (this.innerTubeMaterial) {
            this.innerTubeMaterial.opacity = fadeOutOpacity * 0.8;
        }
        if (this.rings) {
            this.rings.forEach(ring => {
                ring.mesh.material.opacity = fadeOutOpacity * 0.6;
            });
        }
        
        return 'fade-out';
    }
    
    /**
     * Create custom morphing tube geometry that can change shape
     * @param {number} scale - Scale factor for the tube geometry
     * @returns {THREE.BufferGeometry} - The created geometry
     */
    createMorphingTubeGeometry(scale = 1) {
        const geometry = new THREE.BufferGeometry();
        const curvePoints = this.curve.getPoints(this.geometryComplexity);
        
        // Calculate the maximum number of radial segments we might need
        const maxRadialSegments = Math.max(...this.shapeSequence.map(s => s.sides));
        
        const vertices = [];
        const indices = [];
        const uvs = [];
        
        // Create vertices for each segment along the curve
        for (let i = 0; i <= this.geometryComplexity; i++) {
            const t = i / this.geometryComplexity;
            const point = curvePoints[i];
            
            // Get tangent for proper orientation
            const tangent = this.curve.getTangent(t);
            
            // Create a coordinate system at this point
            const normal = new THREE.Vector3(0, 1, 0);
            const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
            const adjustedNormal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
            
            // Calculate which shape this segment should be (wave travels from back to front)
            const shapeWavePosition = t + this.shapeTransitionTime * this.shapeWaveSpeed;
            const shapeIndex = Math.floor(shapeWavePosition) % this.shapeSequence.length;
            const nextShapeIndex = (shapeIndex + 1) % this.shapeSequence.length;
            const shapeLerp = shapeWavePosition - Math.floor(shapeWavePosition);
            
            // Interpolate between current and next shape
            const currentShape = this.shapeSequence[shapeIndex];
            const nextShape = this.shapeSequence[nextShapeIndex];
            
            // Create vertices for this cross-section
            for (let j = 0; j < maxRadialSegments; j++) {
                // Add tunnel twist as it progresses
                const twistAmount = t * Math.PI * 4; // 4 full rotations over tunnel length
                const angle = (j / maxRadialSegments) * Math.PI * 2 + twistAmount;
                
                // Calculate radius based on shape interpolation
                const radius = this.calculateShapeRadius(angle, currentShape, nextShape, shapeLerp) * scale;
                
                // Position vertex
                const x = point.x + (Math.cos(angle) * adjustedNormal.x + Math.sin(angle) * binormal.x) * radius;
                const y = point.y + (Math.cos(angle) * adjustedNormal.y + Math.sin(angle) * binormal.y) * radius;
                const z = point.z + (Math.cos(angle) * adjustedNormal.z + Math.sin(angle) * binormal.z) * radius;
                
                vertices.push(x, y, z);
                
                // UV coordinates
                uvs.push(j / maxRadialSegments, t);
            }
        }
        
        // Create indices for triangles
        for (let i = 0; i < this.geometryComplexity; i++) {
            for (let j = 0; j < maxRadialSegments; j++) {
                const a = i * maxRadialSegments + j;
                const b = i * maxRadialSegments + ((j + 1) % maxRadialSegments);
                const c = (i + 1) * maxRadialSegments + ((j + 1) % maxRadialSegments);
                const d = (i + 1) * maxRadialSegments + j;
                
                // Two triangles per quad
                indices.push(a, b, c);
                indices.push(a, c, d);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Calculate radius for a given angle based on shape interpolation
     * @param {number} angle - The angle in radians
     * @param {Object} currentShape - Current shape object with sides property
     * @param {Object} nextShape - Next shape object with sides property
     * @param {number} lerp - Interpolation factor between shapes
     * @returns {number} - Calculated radius
     */
    calculateShapeRadius(angle, currentShape, nextShape, lerp) {
        const currentRadius = this.getShapeRadius(angle, currentShape.sides);
        const nextRadius = this.getShapeRadius(angle, nextShape.sides);
        
        // Smooth interpolation between shapes
        const smoothLerp = 0.5 * (1 + Math.sin((lerp - 0.5) * Math.PI));
        
        return this.tubeRadius * (currentRadius * (1 - smoothLerp) + nextRadius * smoothLerp);
    }
    
    /**
     * Get radius for a specific angle in a polygonal shape
     * @param {number} angle - The angle in radians
     * @param {number} sides - Number of sides in the polygon
     * @returns {number} - Calculated radius for the shape
     */
    getShapeRadius(angle, sides) {
        if (sides <= 2) return 1; // Fallback for invalid shapes
        
        const anglePerSide = (Math.PI * 2) / sides;
        const sideAngle = Math.floor(angle / anglePerSide);
        const sideProgress = (angle % anglePerSide) / anglePerSide;
        
        // For regular polygons, calculate distance from center to edge
        const apothem = Math.cos(Math.PI / sides);
        const sideLength = 2 * Math.sin(Math.PI / sides);
        
        // Calculate radius based on position along the polygon edge
        const cornerAngle = sideAngle * anglePerSide;
        const nextCornerAngle = (sideAngle + 1) * anglePerSide;
        
        // Distance from center to the polygon edge at this angle
        const edgeDistance = apothem / Math.cos(angle - cornerAngle - Math.PI / sides);
        
        return Math.min(edgeDistance, 1.5); // Clamp to prevent extreme values
    }
    
    // Create additional tunnel layers for more complex visuals
    createAdditionalLayers() {
        // Create inner tunnel with smaller radius but same morphing capability
        this.innerTubeGeometry = this.createMorphingTubeGeometry(0.6); // 60% of original size
        
        this.innerTubeMaterial = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            vertexColors: true,
            transparent: true,
            opacity: 0.0 // Start invisible for fade-in
        });
        
        // Apply different color pattern to inner tube (offset palette timing)
        this.applyProceduralColors(this.innerTubeGeometry, 0.5, 2.5);
        
        this.innerTubeMesh = new THREE.Mesh(this.innerTubeGeometry, this.innerTubeMaterial);
        this.scene.add(this.innerTubeMesh);
        
        // Store original for animations
        this.innerTubeGeometry_o = this.innerTubeGeometry.clone();
        
        // Create outer ring patterns with shape-based segments
        this.rings = [];
        for (let i = 0; i < 3; i++) {
            const ringShape = this.shapeSequence[i % this.shapeSequence.length];
            const ringGeometry = new THREE.RingGeometry(
                this.tubeRadius * (1.2 + i * 0.2), 
                this.tubeRadius * (1.4 + i * 0.2), 
                ringShape.sides
            );
            const ringMaterial = new THREE.MeshBasicMaterial({
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.0, // Start invisible for fade-in
                color: new THREE.Color().setHSL((i * 0.3) % 1, 0.8, 0.6)
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.z = -0.5 - i * 0.3;
            this.scene.add(ring);
            this.rings.push({ mesh: ring, shapeIndex: i });
        }
    }
    
    // Apply palette-based colors to geometry with wave propagation
    applyProceduralColors(geometry = null, timeOffset = 0, paletteOffset = 0) {
        const targetGeometry = geometry || this.tubeGeometry;
        const positions = targetGeometry.attributes.position;
        const colors = [];
        
        // Get current and next palette for smooth transitions (force black during fade-out)
        const currentPalette = this.forceBlackPalette ? this.getBlackPalette() : this.colorPalettes[this.currentPaletteIndex];
        const nextPaletteIndex = this.forceBlackPalette ? 0 : (this.currentPaletteIndex + 1) % this.colorPalettes.length;
        const nextPalette = this.forceBlackPalette ? this.getBlackPalette() : this.colorPalettes[nextPaletteIndex];
        
        // Calculate palette interpolation factor (smooth transition over 1 second)
        const paletteProgress = (this.paletteTime + paletteOffset) % 5; // 5 second cycle
        const paletteLerp = paletteProgress < 4 ? 0 : (paletteProgress - 4) / 1; // Transition in last 1 second
        
        // Generate colors for each vertex
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Calculate position along tunnel (0 = front, 1 = back) - use current tunnel length
            const tunnelPosition = (z + 1) / (this.currentTunnelLength + 1); // Normalize z coordinate
            
            // Create smooth gradient-based color instead of discrete palette stepping
            const baseColorPosition = (tunnelPosition + timeOffset) * 2; // Slower color progression
            
            // Add very gentle variation for interest (much reduced)
            const gentleNoise = this.noise.simplex3(x * 0.5, y * 0.5, z * 0.3 + timeOffset * 0.5) * 0.02;
            
            // Smooth continuous color position
            const smoothColorPosition = baseColorPosition + gentleNoise;
            
            // Map to palette with smooth wrapping
            const palettePosition = smoothColorPosition % 1;
            const continuousIndex = palettePosition * (currentPalette.length - 1); // -1 to avoid wrapping issues
            
            // Get smooth interpolation between colors
            const baseIndex = Math.floor(continuousIndex);
            const nextIndex = Math.min(baseIndex + 1, currentPalette.length - 1);
            const mixFactor = continuousIndex - baseIndex;
            
            // Apply even smoother interpolation
            const smoothMix = mixFactor * mixFactor * mixFactor * (mixFactor * (mixFactor * 6 - 15) + 10); // Smoother step
            
            // Get colors from current palette
            const currentColor = currentPalette[baseIndex];
            const nextColor = currentPalette[nextIndex];
            
            // Get corresponding colors from next palette
            const currentColorNext = nextPalette[baseIndex];
            const nextColorNext = nextPalette[nextIndex];
            
            // Interpolate colors within palette using smooth mixing
            const h1 = currentColor.h + (nextColor.h - currentColor.h) * smoothMix;
            const s1 = currentColor.s + (nextColor.s - currentColor.s) * smoothMix;
            const l1 = currentColor.l + (nextColor.l - currentColor.l) * smoothMix;
            
            // Interpolate corresponding colors in next palette
            const h2 = currentColorNext.h + (nextColorNext.h - currentColorNext.h) * smoothMix;
            const s2 = currentColorNext.s + (nextColorNext.s - currentColorNext.s) * smoothMix;
            const l2 = currentColorNext.l + (nextColorNext.l - currentColorNext.l) * smoothMix;
            
            // Final interpolation between palettes
            const finalH = h1 + (h2 - h1) * paletteLerp;
            const finalS = s1 + (s2 - s1) * paletteLerp;
            const finalL = l1 + (l2 - l1) * paletteLerp;
            
            // Create final color
            const color = new THREE.Color().setHSL(finalH, finalS, finalL);
            colors.push(color.r, color.g, color.b);
        }
        
        targetGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    
    /**
     * Set up event listeners for mouse and window events
     */
    setupEventListeners() {
        // Mouse move handler
        this.mouseMoveHandler = (event) => {
            this.mouse.target.x = event.clientX;
            this.mouse.target.y = event.clientY;
        };
        
        // Touch move handler for mobile
        this.touchMoveHandler = (event) => {
            // Check if brain panel is visible - if so, don't handle touch to allow text selection
            const panelContent = document.getElementById('brain-panel-content');
            if (panelContent && panelContent.classList.contains('panel-visible')) {
                return;
            }
            
            // Only prevent default if the event is cancelable
            if (event.cancelable) {
                event.preventDefault();
            }
            
            if (event.touches.length > 0) {
                this.mouse.target.x = event.touches[0].clientX;
                this.mouse.target.y = event.touches[0].clientY;
            }
        };
        
        // Resize handler
        this.resizeHandler = () => {
            if (this.renderer && this.camera) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        };
        
        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
        window.addEventListener('resize', this.resizeHandler);
    }
    
    /**
     * Update camera position based on mouse movement
     */
    updateCameraPosition() {
        // Smooth mouse tracking (matching inspiration code)
        this.mouse.position.x += (this.mouse.target.x - this.mouse.position.x) / 50;
        this.mouse.position.y += (this.mouse.target.y - this.mouse.position.y) / 50;
        
        // Calculate mouse ratios
        this.mouse.ratio.x = this.mouse.position.x / window.innerWidth;
        this.mouse.ratio.y = this.mouse.position.y / window.innerHeight;
        
        // Apply dramatic camera movement like inspiration code
        this.camera.position.x = this.mouse.ratio.x * 0.044 - 0.025;
        this.camera.position.y = this.mouse.ratio.y * 0.044 - 0.025;
    }

    /**
     * Handle touch navigation for mobile devices
     * @param {number} deltaX - X movement delta
     * @param {number} deltaY - Y movement delta
     */
    handleTouchNavigation(deltaX, deltaY) {
        // Update mouse target based on touch movement
        this.mouse.target.x += deltaX;
        this.mouse.target.y += deltaY;
        
        // Clamp to screen bounds
        this.mouse.target.x = Math.max(0, Math.min(window.innerWidth, this.mouse.target.x));
        this.mouse.target.y = Math.max(0, Math.min(window.innerHeight, this.mouse.target.y));
    }
    
    // Update tunnel geometry and colors
    updateTunnelGeometry(delta, frameDelta) {
        if (!this.tubeGeometry || !this.tubeGeometry_o || !this.curve) return;
        
        const time = delta * 0.001;
        const tunnelElapsedTime = (performance.now() - this.tunnelStartTime) * 0.001;
        
        // Update tunnel phase and properties
        this.updateTunnelPhase(tunnelElapsedTime, frameDelta);
        
        // Update shape transition time using frame delta for consistent speed
        this.shapeTransitionTime += frameDelta * 0.001 * this.shapeTransitionSpeed;
        
        // Update color animation time (only during active phases)
        if (this.tunnelPhase !== 'complete') {
            this.paletteTime += frameDelta * 0.001 * this.paletteShiftSpeed;
        }
        
        // Force black palette during fade-out
        this.forceBlackPalette = this.tunnelPhase === 'fade-out';
        
        // Debug: Log palette time occasionally
        if (Math.floor(this.paletteTime * 2) % 1000 === 0) {
            console.log(`🎨 Palette time: ${this.paletteTime.toFixed(2)}, Current palette: ${this.currentPaletteIndex}`);
        }
        
        // Recreate geometry with new shapes
        this.updateMorphingGeometry(time);
        
        // Update inner tunnel geometry if it exists
        if (this.innerTubeGeometry && this.innerTubeMesh) {
            this.updateInnerTunnelGeometry(time);
        }
        
        // Update ring rotations based on current shape
        this.updateRingAnimations(time);
        
        // Update colors with time-based animation
        this.updateProceduralColors(time);
        
        // Update inner tunnel colors too
        if (this.innerTubeGeometry) {
            this.updateInnerTunnelColors(time);
        }
        
        // Update rings colors (skip - rings use material colors, not vertex colors)
        
        // Log current shape (throttled)
        if (Math.floor(this.shapeTransitionTime * 10) % 20 === 0) {
            const currentShapeIndex = Math.floor(this.shapeTransitionTime * this.shapeWaveSpeed) % this.shapeSequence.length;
            const currentShape = this.shapeSequence[currentShapeIndex];
            logger.scene(`Tunnel shape transitioning: ${currentShape.name}`);
        }
        
        // Update curve points for mouse interaction (preserve natural downward curve)
        if (this.curve && this.curve.points && this.curve.points.length >= 5) {
            this.curve.points[2].x = 0.6 * (1 - this.mouse.ratio.x) - 0.3;
            this.curve.points[3].x = 0;
            this.curve.points[4].x = 0.6 * (1 - this.mouse.ratio.x) - 0.3;

            // Create natural downward progression + mouse influence
            this.curve.points[2].y = -0.02 + (0.6 * (1 - this.mouse.ratio.y) - 0.3);
            this.curve.points[3].y = -0.04;
            // Always maintain strong downward curve at end, add mouse influence on top
            this.curve.points[4].y = -0.12 + (0.6 * (1 - this.mouse.ratio.y) - 0.3);
        }
    }
    
    // Update the morphing geometry with current shape transitions
    updateMorphingGeometry(time) {
        if (!this.tubeGeometry || !this.tubeGeometry.attributes || !this.curve) return;
        
        const positions = this.tubeGeometry.attributes.position;
        const curvePoints = this.curve.getPoints(this.geometryComplexity);
        
        // Calculate the maximum number of radial segments
        const maxRadialSegments = Math.max(...this.shapeSequence.map(s => s.sides));
        
        let vertexIndex = 0;
        
        // Update vertices for each segment along the curve
        for (let i = 0; i <= this.geometryComplexity; i++) {
            const t = i / this.geometryComplexity;
            const point = curvePoints[i];
            
            // Get tangent for proper orientation
            const tangent = this.curve.getTangent(t);
            
            // Create a coordinate system at this point
            const normal = new THREE.Vector3(0, 1, 0);
            const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
            const adjustedNormal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
            
            // Calculate which shape this segment should be (wave travels from back to front)
            const shapeWavePosition = t + this.shapeTransitionTime * this.shapeWaveSpeed;
            const shapeIndex = Math.floor(shapeWavePosition) % this.shapeSequence.length;
            const nextShapeIndex = (shapeIndex + 1) % this.shapeSequence.length;
            const shapeLerp = shapeWavePosition - Math.floor(shapeWavePosition);
            
            // Interpolate between current and next shape
            const currentShape = this.shapeSequence[shapeIndex];
            const nextShape = this.shapeSequence[nextShapeIndex];
            
            // Update vertices for this cross-section
            for (let j = 0; j < maxRadialSegments; j++) {
                // Add tunnel twist as it progresses
                const twistAmount = t * Math.PI * 4; // 4 full rotations over tunnel length
                const angle = (j / maxRadialSegments) * Math.PI * 2 + twistAmount;
                
                // Calculate radius based on shape interpolation
                const radius = this.calculateShapeRadius(angle, currentShape, nextShape, shapeLerp);
                
                // Add wave distortion
                const waveAmount = Math.sin(time + point.z * 10) * 0.002;
                const rotationAmount = Math.cos(time * 0.5 + point.z * 5) * 0.05;
                const finalRadius = radius * (1 + waveAmount);
                
                // Position vertex
                const x = point.x + (Math.cos(angle + rotationAmount) * adjustedNormal.x + Math.sin(angle + rotationAmount) * binormal.x) * finalRadius;
                const y = point.y + (Math.cos(angle + rotationAmount) * adjustedNormal.y + Math.sin(angle + rotationAmount) * binormal.y) * finalRadius;
                const z = point.z + (Math.cos(angle + rotationAmount) * adjustedNormal.z + Math.sin(angle + rotationAmount) * binormal.z) * finalRadius;
                
                positions.setXYZ(vertexIndex, x, y, z);
                vertexIndex++;
            }
        }
        
        positions.needsUpdate = true;
        this.tubeGeometry.computeVertexNormals();
    }
    
    // Update inner tunnel geometry with offset shape transitions
    updateInnerTunnelGeometry(time) {
        if (!this.innerTubeGeometry || !this.innerTubeGeometry.attributes || !this.curve) return;
        
        const positions = this.innerTubeGeometry.attributes.position;
        // Use the same curve points as main tunnel for consistency
        const curvePoints = this.curve.getPoints(this.geometryComplexity);
        
        // Calculate the maximum number of radial segments
        const maxRadialSegments = Math.max(...this.shapeSequence.map(s => s.sides));
        
        let vertexIndex = 0;
        
        // Update vertices for each segment along the curve
        for (let i = 0; i <= this.geometryComplexity; i++) {
            const t = i / this.geometryComplexity;
            const point = curvePoints[i];
            
            // Get tangent for proper orientation
            const tangent = this.curve.getTangent(t);
            
            // Create a coordinate system at this point
            const normal = new THREE.Vector3(0, 1, 0);
            const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
            const adjustedNormal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
            
            // Calculate which shape this segment should be (offset from main tunnel, wave travels from back to front)
            const shapeWavePosition = t + this.shapeTransitionTime * this.shapeWaveSpeed + 0.5; // Offset by 0.5
            const shapeIndex = Math.floor(shapeWavePosition) % this.shapeSequence.length;
            const nextShapeIndex = (shapeIndex + 1) % this.shapeSequence.length;
            const shapeLerp = shapeWavePosition - Math.floor(shapeWavePosition);
            
            // Interpolate between current and next shape
            const currentShape = this.shapeSequence[shapeIndex];
            const nextShape = this.shapeSequence[nextShapeIndex];
            
            // Update vertices for this cross-section
            for (let j = 0; j < maxRadialSegments; j++) {
                // Add tunnel twist as it progresses (opposite direction for inner tunnel)
                const twistAmount = t * Math.PI * -3; // 3 full rotations in opposite direction
                const angle = (j / maxRadialSegments) * Math.PI * 2 + twistAmount;
                
                // Calculate radius based on shape interpolation
                const radius = this.calculateShapeRadius(angle, currentShape, nextShape, shapeLerp) * 0.6; // Inner tunnel scale
                
                // Add different wave distortion for inner tunnel
                const waveAmount = Math.sin(time * 1.5 + point.z * 12) * 0.001;
                const rotationAmount = Math.cos(time * 0.7 + point.z * 6) * 0.03;
                const finalRadius = radius * (1 + waveAmount);
                
                // Position vertex
                const x = point.x + (Math.cos(angle + rotationAmount) * adjustedNormal.x + Math.sin(angle + rotationAmount) * binormal.x) * finalRadius;
                const y = point.y + (Math.cos(angle + rotationAmount) * adjustedNormal.y + Math.sin(angle + rotationAmount) * binormal.y) * finalRadius;
                const z = point.z + (Math.cos(angle + rotationAmount) * adjustedNormal.z + Math.sin(angle + rotationAmount) * binormal.z) * finalRadius;
                
                positions.setXYZ(vertexIndex, x, y, z);
                vertexIndex++;
            }
        }
        
        positions.needsUpdate = true;
        this.innerTubeGeometry.computeVertexNormals();
    }
    
    // Update ring animations based on current shapes
    updateRingAnimations(time) {
        if (!this.rings || this.rings.length === 0) return;
        
        this.rings.forEach((ring, index) => {
            const currentShapeIndex = (Math.floor(this.shapeTransitionTime * this.shapeWaveSpeed) + index) % this.shapeSequence.length;
            const currentShape = this.shapeSequence[currentShapeIndex];
            
            // Rotate rings based on their shape
            ring.mesh.rotation.z = time * (0.5 + index * 0.2) * (currentShape.sides / 6);
            
            // Pulse size based on shape complexity
            const pulseAmount = 1 + Math.sin(time * 2 + index) * 0.1 * (currentShape.sides / 8);
            ring.mesh.scale.setScalar(pulseAmount);
            
            // Update color based on shape
            const hue = (currentShape.sides / 12 + time * 0.1 + index * 0.3) % 1;
            ring.mesh.material.color.setHSL(hue, 0.8, 0.6);
        });
    }
    
    // Update procedural colors with palette waves and transitions
    updateProceduralColors(time) {
        if (!this.tubeGeometry || !this.tubeGeometry.attributes) return;
        
        // Check if we need to switch to next palette (every 5 seconds)
        const newPaletteIndex = Math.floor(this.paletteTime / 5) % this.colorPalettes.length;
        if (newPaletteIndex !== this.currentPaletteIndex) {
            this.currentPaletteIndex = newPaletteIndex;
            const paletteName = ['Electric Neon', 'Fire', 'Ocean', 'Rainbow'][this.currentPaletteIndex];
            logger.scene(`🎨 Switched to color palette: ${paletteName} (${this.currentPaletteIndex})`);
        }
        
        const colors = this.tubeGeometry.attributes.color;
        const positions = this.tubeGeometry.attributes.position;
        
        // Get current and next palette for smooth transitions (force black during fade-out)
        const currentPalette = this.forceBlackPalette ? this.getBlackPalette() : this.colorPalettes[this.currentPaletteIndex];
        const nextPaletteIndex = this.forceBlackPalette ? 0 : (this.currentPaletteIndex + 1) % this.colorPalettes.length;
        const nextPalette = this.forceBlackPalette ? this.getBlackPalette() : this.colorPalettes[nextPaletteIndex];
        
        // Calculate palette interpolation factor (smooth transition over 1 second)
        const paletteProgress = this.paletteTime % 5; // 5 second cycle
        const paletteLerp = paletteProgress < 4 ? 0 : (paletteProgress - 4) / 1; // Transition in last 1 second
        
        for (let i = 0; i < colors.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Calculate position along tunnel (0 = front, 1 = back) - use current tunnel length
            const tunnelPosition = (z + 1) / (this.currentTunnelLength + 1); // Normalize z coordinate
            
            // Create flowing color wave from back to front (smoother)
            const colorWavePosition = tunnelPosition + (this.paletteTime * this.colorWaveSpeed);
            
            // Create smooth gradient-based color instead of discrete palette stepping
            const baseColorPosition = colorWavePosition * 2; // Slower color progression
            
            // Add very gentle variation for interest (much reduced)
            const gentleNoise = this.noise.simplex3(x * 0.8, y * 0.8, z * 0.5 + time * 0.3) * 0.02;
            const gentleSpiral = Math.atan2(y, x) / (Math.PI * 2) * 0.05; // Minimal spiral influence
            
            // Smooth continuous color position
            const smoothColorPosition = baseColorPosition + gentleNoise + gentleSpiral;
            
            // Map to palette with smooth wrapping
            const palettePosition = smoothColorPosition % 1;
            const continuousIndex = palettePosition * (currentPalette.length - 1); // -1 to avoid wrapping issues
            
            // Get smooth interpolation between colors
            const baseIndex = Math.floor(continuousIndex);
            const nextIndex = Math.min(baseIndex + 1, currentPalette.length - 1);
            const mixFactor = continuousIndex - baseIndex;
            
            // Apply even smoother interpolation
            const smoothMix = mixFactor * mixFactor * mixFactor * (mixFactor * (mixFactor * 6 - 15) + 10); // Smoother step
            
            // Get colors from current palette
            const currentColor = currentPalette[baseIndex];
            const nextColor = currentPalette[nextIndex];
            
            // Get corresponding colors from next palette
            const currentColorNext = nextPalette[baseIndex];
            const nextColorNext = nextPalette[nextIndex];
            
            // Interpolate colors within palette using smooth mixing
            const h1 = currentColor.h + (nextColor.h - currentColor.h) * smoothMix;
            const s1 = currentColor.s + (nextColor.s - currentColor.s) * smoothMix;
            const l1 = currentColor.l + (nextColor.l - currentColor.l) * smoothMix;
            
            // Interpolate corresponding colors in next palette
            const h2 = currentColorNext.h + (nextColorNext.h - currentColorNext.h) * smoothMix;
            const s2 = currentColorNext.s + (nextColorNext.s - currentColorNext.s) * smoothMix;
            const l2 = currentColorNext.l + (nextColorNext.l - currentColorNext.l) * smoothMix;
            
            // Final interpolation between palettes
            const finalH = h1 + (h2 - h1) * paletteLerp;
            const finalS = s1 + (s2 - s1) * paletteLerp;
            const finalL = l1 + (l2 - l1) * paletteLerp;
            
            // Create final color
            const color = new THREE.Color().setHSL(finalH, finalS, finalL);
            colors.setXYZ(i, color.r, color.g, color.b);
        }
        
        colors.needsUpdate = true;
    }
    
    // Update inner tunnel colors with offset timing
    updateInnerTunnelColors(time) {
        if (!this.innerTubeGeometry || !this.innerTubeGeometry.attributes) return;
        
        const colors = this.innerTubeGeometry.attributes.color;
        const positions = this.innerTubeGeometry.attributes.position;
        
        // Use offset palette timing for different effect
        const offsetPaletteTime = this.paletteTime + 2.5; // 2.5 second offset
        const offsetPaletteIndex = Math.floor(offsetPaletteTime / 5) % this.colorPalettes.length;
        
        // Get current and next palette for smooth transitions
        const currentPalette = this.colorPalettes[offsetPaletteIndex];
        const nextPaletteIndex = (offsetPaletteIndex + 1) % this.colorPalettes.length;
        const nextPalette = this.colorPalettes[nextPaletteIndex];
        
        // Calculate palette interpolation factor
        const paletteProgress = offsetPaletteTime % 5; // 5 second cycle
        const paletteLerp = paletteProgress < 4 ? 0 : (paletteProgress - 4) / 1; // Transition in last 1 second
        
        for (let i = 0; i < colors.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Calculate position along tunnel (0 = front, 1 = back) - use current tunnel length
            const tunnelPosition = (z + 1) / (this.currentTunnelLength + 1); // Normalize z coordinate
            
            // Create flowing color wave from back to front (faster for inner tunnel, smoother)
            const colorWavePosition = tunnelPosition + (offsetPaletteTime * this.colorWaveSpeed * 1.5);
            
            // Create smooth gradient-based color for inner tunnel (offset pattern)
            const baseColorPosition = colorWavePosition * 2.5; // Slightly faster than main tunnel
            
            // Add very gentle variation for interest (much reduced)
            const gentleNoise = this.noise.simplex3(x * 0.6, y * 0.6, z * 0.4 + time * 0.4) * 0.015;
            const gentleSpiral = Math.atan2(y, x) / (Math.PI * 2) * 0.03; // Minimal spiral influence
            
            // Smooth continuous color position
            const smoothColorPosition = baseColorPosition + gentleNoise + gentleSpiral;
            
            // Map to palette with smooth wrapping
            const palettePosition = smoothColorPosition % 1;
            const continuousIndex = palettePosition * (currentPalette.length - 1);
            
            // Get smooth interpolation between colors
            const baseIndex = Math.floor(continuousIndex);
            const nextIndex = Math.min(baseIndex + 1, currentPalette.length - 1);
            const mixFactor = continuousIndex - baseIndex;
            
            // Apply even smoother interpolation
            const smoothMix = mixFactor * mixFactor * mixFactor * (mixFactor * (mixFactor * 6 - 15) + 10);
            
            // Get colors from current palette
            const currentColor = currentPalette[baseIndex];
            const nextColor = currentPalette[nextIndex];
            
            // Get corresponding colors from next palette
            const currentColorNext = nextPalette[baseIndex];
            const nextColorNext = nextPalette[nextIndex];
            
            // Interpolate colors within palette using smooth mixing
            const h1 = currentColor.h + (nextColor.h - currentColor.h) * smoothMix;
            const s1 = currentColor.s + (nextColor.s - currentColor.s) * smoothMix;
            const l1 = currentColor.l + (nextColor.l - currentColor.l) * smoothMix;
            
            // Interpolate corresponding colors in next palette
            const h2 = currentColorNext.h + (nextColorNext.h - currentColorNext.h) * smoothMix;
            const s2 = currentColorNext.s + (nextColorNext.s - currentColorNext.s) * smoothMix;
            const l2 = currentColorNext.l + (nextColorNext.l - currentColorNext.l) * smoothMix;
            
            // Final interpolation between palettes
            const finalH = h1 + (h2 - h1) * paletteLerp;
            const finalS = s1 + (s2 - s1) * paletteLerp;
            const finalL = l1 + (l2 - l1) * paletteLerp;
            
            // Create final color
            const color = new THREE.Color().setHSL(finalH, finalS, finalL);
            colors.setXYZ(i, color.r, color.g, color.b);
        }
        
        colors.needsUpdate = true;
    }
    
    /**
     * Return a palette of all black for fade-out
     * @returns {Array<Object>} - Array of black color objects
     */
    getBlackPalette() {
        // Use the same length as the current palette for smooth interpolation
        const len = this.colorPalettes[0].length;
        return Array(len).fill({ h: 0, s: 0, l: 0 });
    }

    /**
     * Cleanup tunnel resources and destroy with optimized timing
     */
    cleanupAndDestroy() {
        logger.scene('Tunnel effect complete - checking fluid simulation status before cleanup...');
        
        // Use requestAnimationFrame for optimized cleanup timing
        requestAnimationFrame(() => {
            // Check if fluid simulation is ready before destroying tunnel
            if (window.SceneManager && window.SceneManager.fluidIntegration) {
                const fluidIntegration = window.SceneManager.fluidIntegration;
                
                // If fluid simulation is already visible, we can destroy immediately
                if (fluidIntegration.currentOpacity > 0.5) {
                    logger.scene('Fluid simulation is visible - destroying tunnel immediately');
                    this.destroyTunnelResources();
                } else {
                    // Wait for fluid simulation to be more visible before destroying tunnel
                    logger.scene('Waiting for fluid simulation to become visible before destroying tunnel...');
                    const checkFluidReady = () => {
                        if (fluidIntegration.currentOpacity > 0.3) {
                            logger.scene('Fluid simulation is ready - destroying tunnel');
                            this.destroyTunnelResources();
                        } else {
                            // Continue checking every frame with optimized timing
                            requestAnimationFrame(checkFluidReady);
                        }
                    };
                    checkFluidReady();
                }
            } else {
                // Fallback: destroy immediately if no fluid integration
                logger.scene('No fluid integration found - destroying tunnel immediately');
                this.destroyTunnelResources();
            }
        });
    }
    
    /**
     * Actually destroy the tunnel resources
     */
    destroyTunnelResources() {
        // Set background to transparent instead of black
        if (this.renderer) {
            this.renderer.setClearColor(0x000000, 0); // Alpha = 0 for transparent
        }
        if (this.scene) {
            this.scene.background = null; // Remove background instead of setting to black
        }
        
        logger.scene('Destroying tunnel resources...');
        
        // Remove tunnel and all Three.js resources
        this.destroy();
    }
    
    /**
     * Main animation loop for the tunnel effect
     */
    animate() {
        // Multiple safety checks to prevent errors after destruction
        if (!this.isActive || 
            this.tunnelPhase === 'complete' || 
            !this.renderer || 
            !this.scene || 
            !this.camera ||
            !this.renderer.render) {
            return;
        }
        
        const currentTime = performance.now();
        const delta = currentTime - this.startTime;
        
        // Calculate frame delta time
        const frameDelta = this.lastFrameTime ? currentTime - this.lastFrameTime : 16.67; // Default to ~60fps
        this.lastFrameTime = currentTime;
        
        // Update camera position
        this.updateCameraPosition();
        
        // Update tunnel geometry
        this.updateTunnelGeometry(delta, frameDelta);
        
        // Render the scene (with additional safety check)
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Continue animation (only if not complete and still active)
        if (this.isActive && 
            this.tunnelPhase !== 'complete' && 
            this.renderer && 
            this.renderer.render) {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }
    
    /**
     * Destroy the tunnel effect and clean up all resources with optimized timing
     */
    destroy() {
        logger.scene('Destroying tunnel effect...');
        
        // Stop animation immediately and prevent new animation frames
        this.isActive = false;
        this.tunnelPhase = 'complete';
        
        // Cancel animation frame with additional safety
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Use requestAnimationFrame for optimized cleanup timing
        requestAnimationFrame(() => {
            this.removeEventListeners();
            this.cleanupThreeJSResources();
            this.removeCanvas();
            this.clearReferences();
            
            logger.scene('Tunnel effect destroyed');
        });
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
            this.mouseMoveHandler = null;
        }
        if (this.touchMoveHandler) {
            document.removeEventListener('touchmove', this.touchMoveHandler);
            this.touchMoveHandler = null;
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }

    /**
     * Clean up Three.js resources
     */
    cleanupThreeJSResources() {
        if (this.scene) {
            this.scene.clear();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }

    /**
     * Remove canvas element
     */
    removeCanvas() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    /**
     * Clear all references
     */
    clearReferences() {
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.tubeMesh = null;
        this.tubeGeometry = null;
        this.tubeGeometry_o = null;
        this.tubeMaterial = null;
        this.curve = null;
        this.splineMesh = null;
        this.canvas = null;
        this.innerTubeGeometry = null;
        this.innerTubeGeometry_o = null;
        this.innerTubeMesh = null;
        this.innerTubeMaterial = null;
        this.rings = null;
        this.lastFrameTime = null;
        this.colorPalettes = null;
        this.currentPaletteIndex = 0;
        this.paletteTime = 0;
        this.tunnelStartTime = 0;
        this.tunnelPhase = 'complete';
        this.currentTunnelLength = 0;
        this.forceBlackPalette = false;
    }
} 