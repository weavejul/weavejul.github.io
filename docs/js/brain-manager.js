import { logger } from './logger.js';

/**
 * BrainManager class for handling 3D brain visualization and interaction
 * @class BrainManager
 */
export class BrainManager {
    /**
     * Create a new BrainManager instance
     */
    constructor() {
        this.isActive = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.brainModel = null;
        this.controls = null;
        this.container = null;
        this.animationId = null;
        
        // Animation properties
        this.rotationSpeed = 0.005;
        this.autoRotate = true;
        
        // Click detection properties
        this.raycaster = null;
        this.mouse = null;
        this.boundHandleBrainClick = null;
        
        // Pulse animation properties
        this.isPulsing = false;
        this.pulseStartTime = 0;
        this.pulseDuration = 0.2;
        this.originalScale = null;
        this.originalMaterials = [];
        this.pulseScale = 1.1;
        this.pulseColor = new THREE.Color(0xffffff);
        this.originalColors = [];
        
        // Panel properties
        this.panel = null;
        this.panelVisible = false;
        this.panelDelay = 200;
        
        // Performance optimization properties
        this.pauseBrainAnimation = false;
        this.originalBrainOpacity = null;
    }

    /**
     * Initialize the brain manager and load the 3D brain model with optimized timing
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isActive) {
            logger.scene('Brain manager already active');
            return;
        }

        logger.scene('Initializing brain manager with optimized timing...');

        try {
            // Defer heavy operations to next frame
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            await this.loadThreeJSScripts();
            
            // Use requestAnimationFrame for DOM operations
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.createContainer();
                    this.setupThreeJS();
                    resolve();
                });
            });
            
            await this.loadBrainModel();
            
            // Defer remaining setup to next frame
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.setupClickDetection();
                    this.createPanel();
                    resolve();
                });
            });

            this.isActive = true;
            this.startAnimation();

            // Make brain manager globally accessible for fluid simulation
            window.brainManager = this;

            logger.scene('Brain manager initialized successfully with optimized timing');
        } catch (error) {
            logger.error('Failed to initialize brain manager:', error);
            throw error;
        }
    }

    /**
     * Load Three.js scripts dynamically
     * @returns {Promise<void>}
     */
    async loadThreeJSScripts() {
        if (window.THREE && window.THREE.GLTFLoader && window.THREE.OrbitControls && window.THREE.DRACOLoader) {
                logger.scene('All Three.js components already available');
                return;
        }

        return new Promise((resolve, reject) => {
            const scripts = [
                'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
            ];

            let loadedCount = 0;
            const totalScripts = scripts.length;

            scripts.forEach((src) => {
                const existingScript = document.querySelector(`script[src="${src}"]`);
                if (existingScript) {
                    loadedCount++;
                    if (loadedCount === totalScripts) {
                        logger.scene('All Three.js scripts already loaded');
                        resolve();
                    }
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === totalScripts) {
                        logger.scene('All Three.js scripts loaded');
                        resolve();
                    }
                };
                script.onerror = () => {
                    logger.error(`Failed to load script: ${src}`);
                    reject(new Error(`Failed to load script: ${src}`));
                };
                document.head.appendChild(script);
            });
        });
    }

    /**
     * Create the brain container element
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'brain-container';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.zIndex = '1002';
        this.container.style.pointerEvents = 'none';
        this.container.style.opacity = '0';
        document.body.appendChild(this.container);
    }

    /**
     * Setup Three.js scene, camera, renderer, and lighting
     */
    setupThreeJS() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupControls();
        this.setupEventListeners();
    }

    /**
     * Setup the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
    }

    /**
     * Setup the camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        logger.scene('Camera positioned at:', this.camera.position);
    }

    /**
     * Setup the renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Ensure renderer canvas is visible and doesn't block mouse events
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.pointerEvents = 'none';
    }

    /**
     * Setup lighting for the scene
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Secondary directional light for fill
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight2.position.set(-3, 2, -3);
        this.scene.add(directionalLight2);

        // Accent light
        const accentLight = new THREE.PointLight(0x6666ff, 2, 12);
        accentLight.position.set(2, 1, 2);
        this.scene.add(accentLight);
    }

    /**
     * Setup orbit controls
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.enabled = false;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Load the brain model from GLB file
     * @returns {Promise<void>}
     */
    async loadBrainModel() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            
            // Use DRACO loader for compressed models
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
            loader.setDRACOLoader(dracoLoader);
            
            loader.load(
                '../assets/models/brain-small.glb',
                (gltf) => {
                    this.setupBrainModel(gltf.scene);
                    resolve();
                },
                (xhr) => {
                    logger.scene(`Loading brain model... ${Math.round(xhr.loaded / xhr.total * 100)}%`);
                },
                (error) => {
                    logger.error('Error loading brain model:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Setup loaded brain model
     * @param {THREE.Group} brainModel - Loaded brain model
     */
    setupBrainModel(brainModel) {
        this.brainModel = brainModel;
        
        // Position and scale the brain
        this.brainModel.position.set(0, 0, 0);
        this.brainModel.scale.set(1, 1, 1);
        
        // Store original scale for pulse animation
        this.originalScale = this.brainModel.scale.clone();
        
        // Store original materials and colors
        this.storeOriginalMaterials();
        
        // Setup materials and shadows
        this.setupBrainMaterials();
        
        this.scene.add(this.brainModel);
        logger.scene('Brain model loaded successfully');
    }

    /**
     * Store original materials and colors for pulse animation
     */
    storeOriginalMaterials() {
        this.originalMaterials = [];
        this.originalColors = [];
        
        this.brainModel.traverse((child) => {
            if (child.isMesh) {
                this.originalMaterials.push({
                    mesh: child,
                    material: child.material.clone()
                });
                
                if (child.material && child.material.color) {
                    this.originalColors.push(child.material.color.clone());
                } else {
                    this.originalColors.push(new THREE.Color(0x888888));
                }
            }
        });
        
        logger.scene('Stored original colors:', this.originalColors.length);
    }

    /**
     * Setup brain materials and shadows
     */
    setupBrainMaterials() {
        this.brainModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                    child.material.metalness = 0.2;
                    child.material.roughness = 0.6;
                    child.material.emissive = new THREE.Color(0x111111);
                    child.material.emissiveIntensity = 0.05;
                }
            }
        });
    }

    /**
     * Setup click detection for the brain
     */
    setupClickDetection() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.boundHandleBrainClick = this.handleBrainClick.bind(this);
        document.addEventListener('click', this.boundHandleBrainClick);
        
        // Add touch support for mobile devices
        if (window.mobileCheck && window.mobileCheck()) {
            document.addEventListener('touchstart', this.boundHandleBrainClick, { passive: false });
            logger.scene('Brain touch detection initialized for mobile');
        }
        
        logger.scene('Brain click detection initialized');
    }
    
    /**
     * Create the iframe panel
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'brain-panel';
        this.setupPanelStyles();
        this.setupPanelContent();
        document.body.appendChild(this.panel);
        
        logger.scene('Brain panel created');
    }

    /**
     * Setup panel styles
     */
    setupPanelStyles() {
        // Check if mobile device
        const isMobile = window.mobileCheck && window.mobileCheck();
        
        Object.assign(this.panel.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: isMobile ? '95%' : '80%',
            height: isMobile ? '70%' : '80%',
            zIndex: '1003',
            backgroundColor: 'rgba(26, 0, 0, 0.95)',
            borderRadius: '0px',
            border: '2px solid #ff4444',
            boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)',
            opacity: '0',
            visibility: 'hidden',
            transition: 'opacity 0.3s ease-in-out',
            overflow: 'hidden'
        });
        
        // Add responsive styles for very small screens
        if (isMobile) {
            this.panel.style.setProperty('--panel-width', '95%');
            this.panel.style.setProperty('--panel-height', '70%');
        }
    }

    /**
     * Setup panel content (close button and iframe)
     */
    setupPanelContent() {
        const closeButton = this.createCloseButton();
        const iframe = this.createIframe();
        
        this.panel.appendChild(closeButton);
        this.panel.appendChild(iframe);
    }

    /**
     * Create the close button
     * @returns {HTMLButtonElement}
     */
    createCloseButton() {
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        
        Object.assign(closeButton.style, {
            position: 'absolute',
            top: '10px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#ff4444',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: '1004',
            // Add mobile-friendly touch target
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
        });
        
        closeButton.onclick = () => this.hidePanel();
        
        // Add touch support for mobile
        closeButton.addEventListener('touchstart', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hidePanel();
        }, { passive: false });
        
        return closeButton;
    }

    /**
     * Create the iframe with optimized loading
     * @returns {HTMLIFrameElement}
     */
    createIframe() {
        const iframe = document.createElement('iframe');
        
        // Add loading="lazy" for optimized loading
        iframe.loading = 'lazy';
        
        // Start with iframe hidden to prevent flash
        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px',
            // Add hardware acceleration for smooth rendering
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        });
        
        // Don't load iframe content until panel is shown
        this.iframe = iframe;
        
        return iframe;
    }
    
    /**
     * Show the panel with optimized rendering and hide brain
     */
    showPanel() {
        if (!this.panel || this.panelVisible) return;
        
        // Use requestAnimationFrame for smooth panel showing
        requestAnimationFrame(() => {
            // Show panel first
            this.panel.style.visibility = 'visible';
            this.panel.style.opacity = '1';
            this.panelVisible = true;
            
            // Load iframe content with cache busting and proper loading sequence
            if (this.iframe) {
                // Load iframe content with cache busting
                this.iframe.src = 'panel-content.html?t=' + Date.now() + '&v=' + Math.random();
                
                // Wait for iframe to load, then fade it in
                this.iframe.onload = () => {
                    // Small delay to ensure content is rendered
                    setTimeout(() => {
                        this.iframe.style.opacity = '1';
                    }, 100);
                };
            }
            
            // Hide brain for better performance when panel is open
            this.hideBrain();
            
            logger.scene('Brain panel shown with optimized rendering - brain hidden for performance');
        });
    }
    
    /**
     * Hide the panel and show brain
     */
    hidePanel() {
        if (!this.panel || !this.panelVisible) return;
        
        this.panel.style.opacity = '0';
        setTimeout(() => {
            if (this.panel) {
                this.panel.style.visibility = 'hidden';
                this.panelVisible = false;
                
                // Reset iframe for next time
                if (this.iframe) {
                    this.iframe.style.opacity = '0';
                    this.iframe.src = '';
                }
                
                // Show brain again when panel is closed
                this.showBrain();
            }
        }, 300);
        
        logger.scene('Brain panel hidden - brain shown again');
    }

    /**
     * Handle brain click detection
     * @param {MouseEvent|TouchEvent} event - The click or touch event
     */
    handleBrainClick(event) {
        if (!this.brainModel || this.isPulsing) return;
        
        // Prevent default for touch events to avoid scrolling
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        
        // Get coordinates from either mouse or touch event
        let clientX, clientY;
        if (event.type === 'touchstart' && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // Calculate position in normalized device coordinates
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObject(this.brainModel, true);
        
        if (intersects.length > 0) {
            logger.scene('Brain clicked/touched! Starting pulse animation...');
            this.startPulse();
            
            // Show panel after delay
            setTimeout(() => {
                this.showPanel();
            }, this.panelDelay);
        }
    }

    /**
     * Start pulse animation
     */
    startPulse() {
        if (this.isPulsing) return;
        
        this.isPulsing = true;
        this.pulseStartTime = performance.now();
        
        logger.scene('Brain pulse animation started');
    }

    /**
     * Update pulse animation
     */
    updatePulse() {
        if (!this.isPulsing || !this.brainModel) return;
        
        const currentTime = performance.now();
        const elapsed = (currentTime - this.pulseStartTime) / 1000;
        const progress = Math.min(elapsed / this.pulseDuration, 1.0);
        
        const pulseCurve = this.createPulseCurve(progress);
        
        this.updatePulseScale(pulseCurve);
        this.updatePulseColors(pulseCurve, progress);
        
        // End pulse animation
        if (progress >= 1.0) {
            this.endPulse();
        }
    }

    /**
     * Update pulse scale animation
     * @param {number} pulseCurve - The pulse curve value
     */
    updatePulseScale(pulseCurve) {
        const scaleFactor = 1.0 + (this.pulseScale - 1.0) * pulseCurve;
        this.brainModel.scale.setScalar(this.originalScale.x * scaleFactor);
    }

    /**
     * Update pulse color animation
     * @param {number} pulseCurve - The pulse curve value
     * @param {number} progress - The animation progress
     */
    updatePulseColors(pulseCurve, progress) {
        this.originalMaterials.forEach((materialData, index) => {
            if (materialData.mesh && materialData.mesh.material && this.originalColors[index]) {
                const originalColor = this.originalColors[index];
                const pulseColor = this.pulseColor;
                
                // Interpolate between original and pulse color
                const newR = originalColor.r + (pulseColor.r - originalColor.r) * pulseCurve;
                const newG = originalColor.g + (pulseColor.g - originalColor.g) * pulseCurve;
                const newB = originalColor.b + (pulseColor.b - originalColor.b) * pulseCurve;
                
                materialData.mesh.material.color.setRGB(newR, newG, newB);
                
                // Animate emissive for extra glow effect
                materialData.mesh.material.emissive.setRGB(
                    pulseColor.r * 0.5 * pulseCurve * 5,
                    pulseColor.g * 0.5 * pulseCurve * 5,
                    pulseColor.b * 0.5 * pulseCurve * 5
                );
                
                // Debug logging for first material
                if (index === 0 && progress > 0.1 && progress < 0.9) {
                    logger.scene(`Pulse color: R=${newR.toFixed(3)}, G=${newG.toFixed(3)}, B=${newB.toFixed(3)}, curve=${pulseCurve.toFixed(3)}`);
                }
            }
        });
    }

    /**
     * End the pulse animation and reset colors
     */
    endPulse() {
            this.isPulsing = false;
            
            // Reset colors
            this.originalMaterials.forEach((materialData, index) => {
                if (materialData.mesh && materialData.mesh.material && this.originalColors[index]) {
                    materialData.mesh.material.color.copy(this.originalColors[index]);
                materialData.mesh.material.emissive.setRGB(0.133, 0.133, 0.133);
                }
            });
            
            logger.scene('Brain pulse animation completed');
        }

    /**
     * Create a pulse curve that grows and then shrinks
     * @param {number} progress - Animation progress (0-1)
     * @returns {number} - Pulse curve value
     */
    createPulseCurve(progress) {
        return Math.sin(progress * Math.PI);
    }

    /**
     * Start the animation loop
     */
    startAnimation() {
        const animate = () => {
            if (!this.isActive) return;

            // Skip animation if brain is paused for performance
            if (this.pauseBrainAnimation) {
                this.animationId = requestAnimationFrame(animate);
                return;
            }

            // Auto-rotate the brain
            if (this.brainModel && this.autoRotate) {
                this.brainModel.rotation.y += this.rotationSpeed;
            }

            // Update controls
            if (this.controls) {
                this.controls.update();
            }

            // Update pulse animation
            this.updatePulse();

            // Render the scene
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
        logger.scene('Brain animation started with pause support');
    }

    /**
     * Fade in the brain
     * @param {number} duration - Fade duration in seconds
     */
    fadeIn(duration = 2.0) {
        if (!this.container) {
            logger.error('Brain container not found for fade in');
            return;
        }

        logger.scene('Fading in brain with z-index:', this.container.style.zIndex);
        this.container.style.transition = `opacity ${duration}s ease-in-out`;
        this.container.style.opacity = '1';

        logger.scene('Brain fade in initiated');
    }

    /**
     * Fade out the brain
     * @param {number} duration - Fade duration in seconds
     */
    fadeOut(duration = 2.0) {
        if (!this.container) return;

        this.container.style.transition = `opacity ${duration}s ease-in-out`;
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';

        logger.scene('Brain faded out');
    }

    /**
     * Hide brain for performance optimization when panel is open
     */
    hideBrain() {
        if (!this.container || !this.brainModel) return;
        
        // Store current opacity for restoration
        this.originalBrainOpacity = this.container.style.opacity || '1';
        
        // Hide brain with smooth transition
        this.container.style.transition = 'opacity 0.3s ease-out';
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
        
        // Pause brain animation for performance
        this.pauseBrainAnimation = true;
        
        logger.scene('Brain hidden for panel performance optimization');
    }

    /**
     * Show brain when panel is closed
     */
    showBrain() {
        if (!this.container || !this.brainModel) return;
        
        // Restore brain with smooth transition
        this.container.style.transition = 'opacity 0.3s ease-in';
        this.container.style.opacity = this.originalBrainOpacity || '1';
        // Keep pointerEvents as 'none' to avoid interfering with fluid simulation
        this.container.style.pointerEvents = 'none';
        
        // Resume brain animation
        this.pauseBrainAnimation = false;
        
        logger.scene('Brain shown again after panel closed - pointer events disabled for fluid compatibility');
    }

    /**
     * Enable/disable user controls
     * @param {boolean} enabled - Whether to enable controls
     */
    enableControls(enabled = true) {
        if (this.controls) {
            this.controls.enabled = enabled;
        }
        
        if (this.container) {
            this.container.style.pointerEvents = 'none';
        }
    }

    /**
     * Set auto-rotation
     * @param {boolean} enabled - Whether to enable auto-rotation
     */
    setAutoRotate(enabled = true) {
        this.autoRotate = enabled;
    }

    /**
     * Set rotation speed
     * @param {number} speed - Rotation speed
     */
    setRotationSpeed(speed) {
        this.rotationSpeed = speed;
    }

    /**
     * Get brain position for turbulence generation
     * @returns {{x: number, y: number}} - Normalized screen coordinates
     */
    getBrainPosition() {
        if (this.brainModel) {
            const vector = new THREE.Vector3();
            this.brainModel.getWorldPosition(vector);
            
            vector.project(this.camera);
            
            const x = (vector.x + 1) / 2;
            const y = (1 - vector.y) / 2;
            
            return { x, y };
        }
        return { x: 0.5, y: 0.5 };
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            logger.scene('Brain manager window resize handled');
        }
    }
    
    /**
     * Update for window resize (called from scene manager)
     */
    updateForResize() {
        this.onWindowResize();
        logger.scene('Brain manager updated for resize');
    }

    /**
     * Clean up and destroy the brain manager
     */
    destroy() {
        logger.scene('Destroying brain manager...');

        this.isActive = false;

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        document.removeEventListener('click', this.boundHandleBrainClick);

        // Dispose of Three.js resources
        this.disposeThreeJSResources();

        // Remove DOM elements
        this.removeDOMElements();

        // Clear references
        this.clearReferences();

        logger.scene('Brain manager destroyed');
    }

    /**
     * Dispose of Three.js resources
     */
    disposeThreeJSResources() {
        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        }

    /**
     * Remove DOM elements
     */
    removeDOMElements() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        }

    /**
     * Clear all references
     */
    clearReferences() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.brainModel = null;
        this.controls = null;
        this.container = null;
        this.raycaster = null;
        this.mouse = null;
        this.originalScale = null;
        this.originalMaterials = [];
        this.originalColors = [];
        this.panel = null;
        this.panelVisible = false;
        this.boundHandleBrainClick = null;
    }

    /**
     * Check if the brain manager is running
     * @returns {boolean} - True if active, false otherwise
     */
    isRunning() {
        return this.isActive;
    }
} 