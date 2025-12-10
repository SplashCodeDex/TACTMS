/**
 * Haptic Feedback Utility
 * Provides a simple interface for triggering haptic feedback on supported devices.
 */

// Vibration patterns (in milliseconds)
export const HAPTIC_PATTERNS = {
    soft: 10,       // Subtle click
    select: 20,     // Selection change
    success: [50, 50, 50], // Double tap feel
    warning: [50, 100, 50],
    error: [50, 50, 50, 50, 100],
    impactLight: 15,
    impactMedium: 40,
    impactHeavy: 70,
};

/**
 * Triggers a haptic feedback pattern
 * @param pattern - The vibration pattern to use (number or array of numbers)
 */
export const vibrate = (pattern: number | number[] = HAPTIC_PATTERNS.soft) => {
    // Check if navigator.vibrate is supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Fail silently on devices that don't support or allow vibration
            console.debug("Haptic feedback failed", e);
        }
    }
};

/**
 * Trigger soft impact haptic
 */
export const hapticSoft = () => vibrate(HAPTIC_PATTERNS.soft);

/**
 * Trigger selection haptic
 */
export const hapticSelect = () => vibrate(HAPTIC_PATTERNS.select);

/**
 * Trigger success haptic
 */
export const hapticSuccess = () => vibrate(HAPTIC_PATTERNS.success);

/**
 * Trigger error haptic
 */
export const hapticError = () => vibrate(HAPTIC_PATTERNS.error);
