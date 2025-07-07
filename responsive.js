import { getViewportDimensions } from './config.js';
import { APP_CONFIG } from './constants.js';

// Responsive utility functions
export const Responsive = {
    // Font size based on screen size
    fontSize: (multiplier = 1) => {
        const { width } = getViewportDimensions();
        return Math.max(
            APP_CONFIG.TEXT.MIN_FONT_SIZE, 
            Math.min(width * APP_CONFIG.TEXT.FONT_SCALE_FACTOR, APP_CONFIG.TEXT.MAX_FONT_SIZE)
        ) * multiplier;
    },
    
    // String offset based on text width and screen width
    stringOffset: (textWidth, multiplier = APP_CONFIG.RESPONSIVE.STRING_OFFSET_MULTIPLIER) => {
        const { width } = getViewportDimensions();
        return Math.max(textWidth * multiplier, width * APP_CONFIG.RESPONSIVE.SCREEN_WIDTH_SCALE_FACTOR);
    },
    
    // Start position above screen
    startY: (multiplier = APP_CONFIG.RESPONSIVE.START_Y_MULTIPLIER) => {
        const { height } = getViewportDimensions();
        return -height * multiplier;
    },
    
    // String length to reach center of screen
    stringLength: (startY, targetY) => Math.ceil(Math.abs(targetY - startY) / APP_CONFIG.PHYSICS.STRING_SEGMENTS),
    
    // Center positions
    centerX: () => {
        const { width } = getViewportDimensions();
        return width / 2;
    },
    
    centerY: () => {
        const { height } = getViewportDimensions();
        return height / 2;
    },
    
    // Relative positioning
    percentX: (percent) => {
        const { width } = getViewportDimensions();
        return width * (percent / 100);
    },
    
    percentY: (percent) => {
        const { height } = getViewportDimensions();
        return height * (percent / 100);
    },
    
    // Responsive spacing
    spacing: (multiplier = 1) => {
        const { width } = getViewportDimensions();
        return Math.max(APP_CONFIG.RESPONSIVE.MIN_SPACING, width * APP_CONFIG.RESPONSIVE.SPACING_SCALE_FACTOR) * multiplier;
    },
    
    // Helper to evaluate responsive values during resize
    evaluate: (value, fallback) => {
        if (typeof value === 'function') {
            return value();
        }
        return value !== undefined ? value : (typeof fallback === 'function' ? fallback() : fallback);
    }
}; 