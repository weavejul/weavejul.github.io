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

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 1.0); // Increased ambient light
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Add a second directional light from the opposite side
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight2.position.set(-5, -5, -5);
        this.scene.add(directionalLight2);

        // Colored lights for better visualization - increased intensity
        const redLight = new THREE.PointLight(0xff6666, 0.8, 15); // Brighter red light
        redLight.position.set(3, 2, 3);
        this.scene.add(redLight);

        const blueLight = new THREE.PointLight(0x6666ff, 0.8, 15); // Brighter blue light
        blueLight.position.set(-3, -2, -3);
        this.scene.add(blueLight);

        // Add a white spotlight for extra illumination
        const spotlight = new THREE.SpotLight(0xffffff, 1.0, 20, Math.PI / 4, 0.5);
        spotlight.position.set(0, 10, 5);
        spotlight.target.position.set(0, 0, 0);
        this.scene.add(spotlight);
        this.scene.add(spotlight.target);

        // Add additional point lights for more illumination
        const frontLight = new THREE.PointLight(0xffffff, 0.6, 10);
        frontLight.position.set(0, 0, 8);
        this.scene.add(frontLight);

        const backLight = new THREE.PointLight(0xffffff, 0.4, 10);
        backLight.position.set(0, 0, -8);
        this.scene.add(backLight);

        const topLight = new THREE.PointLight(0xffffff, 0.5, 10);
        topLight.position.set(0, 8, 0);
        this.scene.add(topLight);

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
            
            // Set up DRACO loader for compressed models
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
            loader.setDRACOLoader(dracoLoader);

            loader.load(
                'brain-small.glb',
                (gltf) => {
                    this.brainModel = gltf.scene;
                    
                    // Center and scale the model
                    const box = new THREE.Box3().setFromObject(this.brainModel);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    // Scale to fit nicely in view
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 1.5 / maxDim; // Slightly smaller than test
                    this.brainModel.scale.setScalar(scale);
                    
                    // Center the model
                    this.brainModel.position.sub(center.multiplyScalar(scale));
                    
                    // Enable shadows for all meshes
                    this.brainModel.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Add some material properties for better appearance
                            if (child.material) {
                                child.material.metalness = 0.2; // Slightly more metallic
                                child.material.roughness = 0.6; // Less rough for more shine
                                child.material.emissive = new THREE.Color(0x222222); // Add subtle glow
                                child.material.emissiveIntensity = 0.1; // Subtle emission
                            }
                        }
                    });
                    
                    this.scene.add(this.brainModel);
                    logger.scene('Brain model loaded successfully, position:', this.brainModel.position);
                    logger.scene('Brain model rotation:', this.brainModel.rotation);
                    logger.scene('Brain model scale:', this.brainModel.scale);
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

        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.brainModel = null;
        this.controls = null;
        this.container = null;

        logger.scene('Brain manager destroyed');
    }

    // Get current state
    isRunning() {
        return this.isActive;
    }
} 