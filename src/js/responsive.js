import { getViewportDimensions } from './config.js';
import { APP_CONFIG } from './constants.js';

/**
 * Responsive utility functions for handling viewport-dependent calculations
 * @namespace Responsive
 */
export const Responsive = {
    /**
     * Calculate responsive font size based on screen width
     * @param {number} [multiplier=1] - Font size multiplier
     * @returns {number} - Calculated font size in pixels
     */
    fontSize: (multiplier = 1) => {
        const { width } = getViewportDimensions();
        return Math.max(
            APP_CONFIG.TEXT.MIN_FONT_SIZE, 
            Math.min(width * APP_CONFIG.TEXT.FONT_SCALE_FACTOR, APP_CONFIG.TEXT.MAX_FONT_SIZE)
        ) * multiplier;
    },
    
    /**
     * Calculate string offset based on text width and screen width
     * @param {number} textWidth - Width of the text in pixels
     * @param {number} [multiplier] - Offset multiplier (defaults to APP_CONFIG.RESPONSIVE.STRING_OFFSET_MULTIPLIER)
     * @returns {number} - Calculated string offset in pixels
     */
    stringOffset: (textWidth, multiplier = APP_CONFIG.RESPONSIVE.STRING_OFFSET_MULTIPLIER) => {
        const { width } = getViewportDimensions();
        return Math.max(textWidth * multiplier, width * APP_CONFIG.RESPONSIVE.SCREEN_WIDTH_SCALE_FACTOR);
    },
    
    /**
     * Calculate start position above screen
     * @param {number} [multiplier] - Position multiplier (defaults to APP_CONFIG.RESPONSIVE.START_Y_MULTIPLIER)
     * @returns {number} - Y position above the screen
     */
    startY: (multiplier = APP_CONFIG.RESPONSIVE.START_Y_MULTIPLIER) => {
        const { height } = getViewportDimensions();
        return -height * multiplier;
    },
    
    /**
     * Calculate string length needed to reach target Y position
     * @param {number} startY - Starting Y position
     * @param {number} targetY - Target Y position
     * @returns {number} - Required string length in segments
     */
    stringLength: (startY, targetY) => {
        return Math.ceil(Math.abs(targetY - startY) / APP_CONFIG.PHYSICS.STRING_SEGMENTS);
    },
    
    /**
     * Get horizontal center position of the viewport
     * @returns {number} - X coordinate of screen center
     */
    centerX: () => {
        const { width } = getViewportDimensions();
        return width / 2;
    },
    
    /**
     * Get vertical center position of the viewport
     * @returns {number} - Y coordinate of screen center
     */
    centerY: () => {
        const { height } = getViewportDimensions();
        return height / 2;
    },
    
    /**
     * Calculate horizontal position as percentage of screen width
     * @param {number} percent - Percentage of screen width (0-100)
     * @returns {number} - X position in pixels
     */
    percentX: (percent) => {
        const { width } = getViewportDimensions();
        return width * (percent / 100);
    },
    
    /**
     * Calculate vertical position as percentage of screen height
     * @param {number} percent - Percentage of screen height (0-100)
     * @returns {number} - Y position in pixels
     */
    percentY: (percent) => {
        const { height } = getViewportDimensions();
        return height * (percent / 100);
    },
    
    /**
     * Calculate responsive spacing based on screen width
     * @param {number} [multiplier=1] - Spacing multiplier
     * @returns {number} - Calculated spacing in pixels
     */
    spacing: (multiplier = 1) => {
        const { width } = getViewportDimensions();
        return Math.max(APP_CONFIG.RESPONSIVE.MIN_SPACING, width * APP_CONFIG.RESPONSIVE.SPACING_SCALE_FACTOR) * multiplier;
    },
    
    /**
     * Evaluate responsive values during resize
     * @param {*} value - Value to evaluate (can be function or static value)
     * @param {*} fallback - Fallback value if value is undefined
     * @returns {*} - Evaluated value
     */
    evaluate: (value, fallback) => {
        if (typeof value === 'function') {
            return value();
        }
        return value !== undefined ? value : (typeof fallback === 'function' ? fallback() : fallback);
    }
}; 

/**
 * Get current viewport dimensions
 * @returns {{width: number, height: number}} - Current viewport dimensions
 */
export function getCurrentViewport() {
    return getViewportDimensions();
}

/**
 * Check if current viewport is mobile-sized
 * @param {number} [breakpoint=768] - Mobile breakpoint in pixels
 * @returns {boolean} - True if viewport width is below breakpoint
 */
export function isMobile(breakpoint = 768) {
    const { width } = getViewportDimensions();
    return width < breakpoint;
}

/**
 * Check if current viewport is tablet-sized
 * @param {number} [minBreakpoint=768] - Minimum tablet breakpoint
 * @param {number} [maxBreakpoint=1024] - Maximum tablet breakpoint
 * @returns {boolean} - True if viewport width is within tablet range
 */
export function isTablet(minBreakpoint = 768, maxBreakpoint = 1024) {
    const { width } = getViewportDimensions();
    return width >= minBreakpoint && width < maxBreakpoint;
}

/**
 * Check if current viewport is desktop-sized
 * @param {number} [breakpoint=1024] - Desktop breakpoint in pixels
 * @returns {boolean} - True if viewport width is above breakpoint
 */
export function isDesktop(breakpoint = 1024) {
    const { width } = getViewportDimensions();
    return width >= breakpoint;
}

/**
 * Get responsive breakpoint for current viewport
 * @returns {'mobile'|'tablet'|'desktop'} - Current breakpoint category
 */
export function getBreakpoint() {
    const { width } = getViewportDimensions();
    
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
}

/**
 * Calculate aspect ratio of current viewport
 * @returns {number} - Aspect ratio (width / height)
 */
export function getAspectRatio() {
    const { width, height } = getViewportDimensions();
    return width / height;
}

/**
 * Check if viewport is in landscape orientation
 * @returns {boolean} - True if width > height
 */
export function isLandscape() {
    const { width, height } = getViewportDimensions();
    return width > height;
}

/**
 * Check if viewport is in portrait orientation
 * @returns {boolean} - True if height > width
 */
export function isPortrait() {
    const { width, height } = getViewportDimensions();
    return height > width;
} 