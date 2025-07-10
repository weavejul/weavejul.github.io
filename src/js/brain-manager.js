import { logger } from './logger.js';

export class BrainManager {
    constructor() {
        this.isActive = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.brainModel = null;
        this.controls = null;
        this.container = null;
        this.animationId = null;
        this.scriptLoaded = false;
        this.rotationSpeed = 0.005;
        this.autoRotate = true;
        
        // Brain click and pulse properties
        this.raycaster = null;
        this.mouse = null;
        this.isPulsing = false;
        this.pulseStartTime = 0;
        this.pulseDuration = 0.2; // 1 second pulse
        this.originalScale = null;
        this.originalMaterials = [];
        this.pulseScale = 1.1; // Scale up by 30%
        this.pulseColor = new THREE.Color(0xffffff); // Bright red pulse color
        this.originalColors = [];
        
        // Panel properties
        this.panel = null;
        this.panelVisible = false;
        this.panelDelay = 200; // 500ms delay before showing panel
    }

    // Initialize Three.js and load the brain model
    async init() {
        if (this.isActive) {
            logger.scene('Brain manager already active');
            return;
        }

        logger.scene('Initializing brain manager...');

        try {
            // Load Three.js scripts if not already loaded
            await this.loadThreeJSScripts();

            // Create container
            this.container = document.createElement('div');
            this.container.id = 'brain-container';
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.zIndex = '1002'; // Higher than fluid canvas (1001)
            this.container.style.pointerEvents = 'none'; // Allow mouse events to pass through to fluid
            this.container.style.opacity = '0';
            document.body.appendChild(this.container);

            // Initialize Three.js scene
            this.setupThreeJS();

            // Load brain model
            await this.loadBrainModel();
            
            // Initialize click detection
            this.setupClickDetection();
            
            logger.scene('Brain manager setup complete - container z-index:', this.container.style.zIndex);

            this.isActive = true;
            this.startAnimation();

            // Make brain manager globally accessible for fluid simulation
            window.brainManager = this;

            logger.scene('Brain manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize brain manager:', error);
            throw error;
        }
    }

    // Load Three.js scripts dynamically
    async loadThreeJSScripts() {
        // Check if Three.js is already loaded
        if (window.THREE) {
            logger.scene('Three.js already loaded, checking for required components...');
            
            // Check if we have all required components
            if (window.THREE.GLTFLoader && window.THREE.OrbitControls && window.THREE.DRACOLoader) {
                logger.scene('All Three.js components already available');
                return;
            }
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

            scripts.forEach((src, index) => {
                // Check if script already exists
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

    // Setup Three.js scene, camera, and renderer
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        logger.scene('Camera positioned at:', this.camera.position);

        // Renderer
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
        
        // Ensure the renderer canvas is visible and doesn't block mouse events
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.pointerEvents = 'none'; // Allow mouse events to pass through

        // Lighting - Simplified setup for better visibility of changes
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // Reduced ambient light
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

        // Single colored light for accent
        const accentLight = new THREE.PointLight(0x6666ff, 2, 12);
        accentLight.position.set(2, 1, 2);
        this.scene.add(accentLight);

        // Controls (disabled for now, will be enabled when needed)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.enabled = false; // Disabled by default

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    // Load the brain model
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
                    this.brainModel = gltf.scene;
                    
                    // Position and scale the brain
                    this.brainModel.position.set(0, 0, 0);
                    this.brainModel.scale.set(1, 1, 1);
                    
                    // Store original scale for pulse animation
                    this.originalScale = this.brainModel.scale.clone();
                    
                    // Store original materials and colors for pulse animation
                    this.originalMaterials = [];
                    this.originalColors = [];
                    this.brainModel.traverse((child) => {
                        if (child.isMesh) {
                            // Store a reference to the mesh and its material
                            this.originalMaterials.push({
                                mesh: child,
                                material: child.material.clone()
                            });
                            
                            // Store the original color if it exists
                            if (child.material && child.material.color) {
                                this.originalColors.push(child.material.color.clone());
                            } else {
                                // Default color if none exists
                                this.originalColors.push(new THREE.Color(0x888888));
                            }
                        }
                    });
                    
                    // Enable shadows for all meshes
                    this.brainModel.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Add some material properties for better appearance
                            if (child.material) {
                                child.material.metalness = 0.2; // Slightly more metallic
                                child.material.roughness = 0.6; // Less rough for more shine
                                // Reduced emissive to make lighting changes more visible
                                child.material.emissive = new THREE.Color(0x111111); // Very subtle glow
                                child.material.emissiveIntensity = 0.05; // Much lower emission
                            }
                        }
                    });
                    
                    this.scene.add(this.brainModel);
                    logger.scene('Brain model loaded successfully, position:', this.brainModel.position);
                    logger.scene('Brain model rotation:', this.brainModel.rotation);
                    logger.scene('Brain model scale:', this.brainModel.scale);
                    logger.scene('Stored original colors:', this.originalColors.length);
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

    // Setup click detection for the brain
    setupClickDetection() {
        // Initialize raycaster and mouse
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Bind the click handler to maintain proper context
        this.boundHandleBrainClick = this.handleBrainClick.bind(this);
        
        // Add click event listener to the document
        document.addEventListener('click', this.boundHandleBrainClick);
        
        logger.scene('Brain click detection initialized');
        
        // Create the panel
        this.createPanel();
    }
    
    // Create the iframe panel
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'brain-panel';
        this.panel.style.position = 'fixed';
        this.panel.style.top = '50%';
        this.panel.style.left = '50%';
        this.panel.style.transform = 'translate(-50%, -50%)';
        this.panel.style.width = '80%';
        this.panel.style.height = '80%';
        this.panel.style.zIndex = '1003'; // Higher than brain container
        this.panel.style.backgroundColor = 'rgba(26, 0, 0, 0.95)';
        this.panel.style.borderRadius = '0px';
        this.panel.style.border = '2px solid #ff4444';
        this.panel.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.3)';
        this.panel.style.opacity = '0';
        this.panel.style.visibility = 'hidden';
        this.panel.style.transition = 'opacity 0.3s ease-in-out';
        this.panel.style.overflow = 'hidden';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '15px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = '#ff4444';
        closeButton.style.fontSize = '24px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.cursor = 'pointer';
        closeButton.style.zIndex = '1004';
        closeButton.onclick = () => this.hidePanel();
        
        // Create iframe
        const iframe = document.createElement('iframe');
        // Add cache-busting parameter to force reload
        iframe.src = 'panel-content.html?t=' + Date.now();
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        
        this.panel.appendChild(closeButton);
        this.panel.appendChild(iframe);
        document.body.appendChild(this.panel);
        
        logger.scene('Brain panel created');
    }
    
    // Show the panel
    showPanel() {
        if (!this.panel || this.panelVisible) return;
        
        // Force reload the iframe content to ensure latest version
        const iframe = this.panel.querySelector('iframe');
        if (iframe) {
            iframe.src = 'panel-content.html?t=' + Date.now();
        }
        
        this.panel.style.visibility = 'visible';
        this.panel.style.opacity = '1';
        this.panelVisible = true;
        
        logger.scene('Brain panel shown');
    }
    
    // Hide the panel
    hidePanel() {
        if (!this.panel || !this.panelVisible) return;
        
        this.panel.style.opacity = '0';
        setTimeout(() => {
            if (this.panel) {
                this.panel.style.visibility = 'hidden';
                this.panelVisible = false;
            }
        }, 300); // Match transition duration
        
        logger.scene('Brain panel hidden');
    }

    // Handle brain click detection
    handleBrainClick(event) {
        if (!this.brainModel || this.isPulsing) return;
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObject(this.brainModel, true);
        
        if (intersects.length > 0) {
            logger.scene('Brain clicked! Starting pulse animation...');
            this.startPulse();
            
            // Show panel after delay
            setTimeout(() => {
                this.showPanel();
            }, this.panelDelay);
        }
    }

    // Start pulse animation
    startPulse() {
        if (this.isPulsing) return;
        
        this.isPulsing = true;
        this.pulseStartTime = performance.now();
        
        logger.scene('Brain pulse animation started');
    }

    // Update pulse animation
    updatePulse() {
        if (!this.isPulsing || !this.brainModel) return;
        
        const currentTime = performance.now();
        const elapsed = (currentTime - this.pulseStartTime) / 1000;
        const progress = Math.min(elapsed / this.pulseDuration, 1.0);
        
        // Create a pulse curve that grows and then shrinks
        const pulseCurve = this.createPulseCurve(progress);
        
        // Scale animation - use the pulse curve for growing and shrinking
        const scaleFactor = 1.0 + (this.pulseScale - 1.0) * pulseCurve;
        this.brainModel.scale.setScalar(this.originalScale.x * scaleFactor);
        
        // Color animation - apply to all stored materials
        this.originalMaterials.forEach((materialData, index) => {
            if (materialData.mesh && materialData.mesh.material && this.originalColors[index]) {
                const originalColor = this.originalColors[index];
                const pulseColor = this.pulseColor;
                
                // Interpolate between original and pulse color
                const newR = originalColor.r + (pulseColor.r - originalColor.r) * pulseCurve;
                const newG = originalColor.g + (pulseColor.g - originalColor.g) * pulseCurve;
                const newB = originalColor.b + (pulseColor.b - originalColor.b) * pulseCurve;
                
                materialData.mesh.material.color.setRGB(newR, newG, newB);
                
                // Also animate emissive for extra glow effect
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
        
        // End pulse animation
        if (progress >= 1.0) {
            this.isPulsing = false;
            
            // Reset colors
            this.originalMaterials.forEach((materialData, index) => {
                if (materialData.mesh && materialData.mesh.material && this.originalColors[index]) {
                    materialData.mesh.material.color.copy(this.originalColors[index]);
                    // Reset emissive to original
                    materialData.mesh.material.emissive.setRGB(0.133, 0.133, 0.133); // 0x222222
                }
            });
            
            logger.scene('Brain pulse animation completed');
        }
    }

    // Create a pulse curve that grows and then shrinks
    createPulseCurve(progress) {
        // Use a sine wave to create a smooth pulse that goes from 0 to 1 and back to 0
        return Math.sin(progress * Math.PI);
    }

    // Start the animation loop
    startAnimation() {
        const animate = () => {
            if (!this.isActive) return;

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
        logger.scene('Brain animation started');
    }

    // Fade in the brain
    fadeIn(duration = 2.0) {
        if (!this.container) {
            logger.error('Brain container not found for fade in');
            return;
        }

        logger.scene('Fading in brain with z-index:', this.container.style.zIndex);
        this.container.style.transition = `opacity ${duration}s ease-in-out`;
        this.container.style.opacity = '1';
        // Don't override pointer events here - let enableControls handle it

        logger.scene('Brain fade in initiated');
    }

    // Fade out the brain
    fadeOut(duration = 2.0) {
        if (!this.container) return;

        this.container.style.transition = `opacity ${duration}s ease-in-out`;
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';

        logger.scene('Brain faded out');
    }

    // Enable/disable user controls
    enableControls(enabled = true) {
        if (this.controls) {
            this.controls.enabled = enabled;
        }
        
        // Keep pointer events disabled so fluid interaction works
        // The brain will auto-rotate but won't block mouse events
        if (this.container) {
            this.container.style.pointerEvents = 'none';
        }
    }

    // Set auto-rotation
    setAutoRotate(enabled = true) {
        this.autoRotate = enabled;
    }

    // Set rotation speed
    setRotationSpeed(speed) {
        this.rotationSpeed = speed;
    }

    // Get brain position for turbulence generation
    getBrainPosition() {
        if (this.brainModel) {
            // Convert 3D position to 2D screen coordinates
            const vector = new THREE.Vector3();
            this.brainModel.getWorldPosition(vector);
            
            // Project 3D position to 2D screen space
            vector.project(this.camera);
            
            // Convert to normalized coordinates (0-1)
            const x = (vector.x + 1) / 2;
            const y = (1 - vector.y) / 2; // Flip Y coordinate
            
            return { x, y };
        }
        return { x: 0.5, y: 0.5 }; // Default center position
    }

    // Handle window resize
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            logger.scene('Brain manager window resize handled');
        }
    }
    
    // Update for window resize (called from scene manager)
    updateForResize() {
        this.onWindowResize();
        logger.scene('Brain manager updated for resize');
    }

    // Clean up and destroy
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

        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Remove panel
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }

        // Clear references
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

        logger.scene('Brain manager destroyed');
    }

    // Get current state
    isRunning() {
        return this.isActive;
    }
} 