# Julian Weaver's Personal Website

## Tech Stack

### Core

- **HTML5**
- **CSS3**
- **Vanilla JavaScript (ES6+)**
- **Matter.js**
- **Three.js**

### AI System

- **Google Gemini API**: LLM backend via Vercel serverless functions
- **Secure Proxy**: API key protection with CORS handling

## Architecture

```text
js/
├── script.js              # Main application entry point
├── config.js              # Physics engine configuration
├── constants.js           # Application constants and settings
├── scene-manager.js       # Scene orchestration and transitions
├── background-particles.js # Particle system management
├── hanging-text.js        # Interactive text physics
├── tunnel-effect.js       # 3D tunnel visual effects
├── fluid-integration.js   # Fluid simulation integration
├── brain-manager.js       # Neural network visualization
├── brain-ai.js           # JULIVER.AI chat interface
├── ground-manager.js      # Ground physics and interactions
├── responsive.js          # Responsive design utilities
├── utils.js              # Utility functions and cleanup
└── logger.js             # Debugging and logging system

api/
├── chat.js               # Gemini API proxy with secure authentication
└── julian-info.js        # A small knowledge base and LLM personality config
```

### Core Components

#### 1. Physics Engine (Matter.js)

- **Engine**: Central physics simulation with configurable gravity and iterations
- **Renderer**: Canvas-based rendering with hardware acceleration
- **Mouse Controls**: Interactive drag-and-drop physics objects
- **World Management**: Dynamic object creation and cleanup

#### 2. Scene Management System

- **SceneManager**: Orchestrates sequential scene transitions
- **HangingText**: Physics-based text objects with string constraints
- **BackgroundParticles**: Dynamic particle system with shimmer effects
- **TunnelEffect**: 3D tunnel visualization using Three.js

#### 3. Performance Optimization

- **Hardware Acceleration**: CSS transforms and `will-change` properties
- **Object Pooling**: Efficient memory management for particles
- **Cleanup Systems**: Automatic removal of off-screen objects
- **Frame Rate Optimization**: Adaptive performance monitoring

#### 4. JULIVER.AI System

- **BrainAI Class**: Chat interface
- **Secure API Proxy**: Vercel serverless function protecting API keys
- **Conversation Management**: Context-aware dialogue with memory
- **Personality Engine**: Responses representing my background

## Visual Features

### Interactive Elements

- **Physics-Based Text**: Hanging text objects with realistic physics
- **Mouse Interaction**: Click and drag functionality
- **Particle Systems**: Dynamic background particles with shimmer effects
- **3D Effects**: Tunnel visualization and fluid simulations

### Animation System

- **Scene Transitions**: Smooth transitions between different states
- **Color Changes**: Dynamic color palette transitions
- **Particle Effects**: Shimmer, twinkle, and glow effects
- **Responsive Design**: Adaptive layouts for different screen sizes

## Config

### Physics Settings

```javascript
PHYSICS: {
    GRAVITY: 1,
    CONSTRAINT_ITERATIONS: 10,
    POSITION_ITERATIONS: 10,
    VELOCITY_ITERATIONS: 10
}
```

### Performance Settings

```javascript
CLEANUP: {
    INTERVAL: 300,           // Cleanup frequency (frames)
    MAX_OFFSCREEN_DISTANCE: 1000  // Object removal threshold
}
```

### Visual Settings

```javascript
PARTICLES: {
    DEFAULT_MAX: 80,
    DEFAULT_SPAWN_RATE: 0.3,
    DEFAULT_MIN_LIFETIME: 3000,
    DEFAULT_MAX_LIFETIME: 8000
}
```

## Features

### Interactive Physics

- Realistic gravity and collision detection
- Mouse-controlled object manipulation
- Dynamic object creation and destruction

### Visual Effects

- Hardware-accelerated animations
- Particle systems with shimmer effects
- 3D tunnel visualization
- Fluid simulation integration

### Performance

- Optimized rendering with 60fps target
- Automatic cleanup of off-screen objects
- Memory-efficient object pooling
- Adaptive performance monitoring

### Responsive Design

- Adaptive layouts for different screen sizes
- Dynamic text scaling
- Mobile-friendly interactions

## Customization

### Adding New Scenes

1. Extend the `SceneManager` class
2. Add scene logic in `run[SceneName]Scene()` method
3. Configure timing in `APP_CONFIG.ANIMATION`

### Modifying Physics

1. Adjust settings in `APP_CONFIG.PHYSICS`
2. Modify engine configuration in `config.js`
3. Update object properties in respective classes

### Visual Customization

1. Update colors in `APP_CONFIG.COLORS`
2. Modify particle settings in `APP_CONFIG.PARTICLES`
3. Adjust animation timing in `APP_CONFIG.ANIMATION`

### AI Customization

1. Modify personality in `julian-info.js`
2. Update system prompts in `chat.js`
3. Adjust response length via `maxOutputTokens`
4. Configure conversation guidelines and examples
