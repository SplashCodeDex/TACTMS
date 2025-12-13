/**
 * Standardized Framer Motion Animation Configurations
 *
 * These are the official animation presets for TACTMS.
 * Use these instead of inline animation configs for consistency.
 *
 * @see PROJECT_RULES.md - Animation Standards section
 */

import type { Transition, Variants } from "framer-motion";

// ============================================================================
// SPRING TRANSITIONS
// ============================================================================

/**
 * Spring-based transition configurations.
 * Spring physics create natural, organic motion.
 */
export const springTransitions = {
    /**
     * Standard modal/panel expand animation
     * Use for: Modals, sidebars, drawers, expanded panels
     */
    panelExpand: {
        type: "spring",
        damping: 25,
        stiffness: 300
    } as Transition,

    /**
     * Snappy button/card interaction
     * Use for: Buttons, cards, dropdowns, tooltips
     */
    snappy: {
        type: "spring",
        damping: 20,
        stiffness: 400
    } as Transition,

    /**
     * Soft, elegant transitions
     * Use for: Page transitions, hero sections, large content blocks
     */
    gentle: {
        type: "spring",
        damping: 30,
        stiffness: 200
    } as Transition,

    /**
     * Quick micro-interactions
     * Use for: Icons, badges, small UI elements, hover states
     */
    micro: {
        type: "spring",
        damping: 15,
        stiffness: 500
    } as Transition,

    /**
     * Bouncy, playful animation
     * Use for: Success states, celebrations, attention-grabbing elements
     */
    bouncy: {
        type: "spring",
        damping: 10,
        stiffness: 300
    } as Transition,
} as const;

// ============================================================================
// MOTION PRESETS
// ============================================================================

/**
 * Complete motion preset objects for common animation patterns.
 * Spread these directly onto motion components.
 *
 * @example
 * <motion.div {...motionPresets.fadeSlideUp}>Content</motion.div>
 */
export const motionPresets = {
    /** Fade in while sliding up - great for content reveals */
    fadeSlideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: springTransitions.panelExpand,
    },

    /** Fade in while sliding down - for dropdowns, menus */
    fadeSlideDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: springTransitions.snappy,
    },

    /** Scale and fade - for modals, dialogs, popovers */
    scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: springTransitions.snappy,
    },

    /** Slide from bottom with scale - for bottom sheets, panels */
    panelSlideUp: {
        initial: { opacity: 0, y: 100, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 100, scale: 0.95 },
        transition: springTransitions.panelExpand,
    },

    /** Slide from right - for sidebars, drawers */
    slideFromRight: {
        initial: { opacity: 0, x: 100 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 100 },
        transition: springTransitions.panelExpand,
    },

    /** Slide from left - for navigation drawers */
    slideFromLeft: {
        initial: { opacity: 0, x: -100 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -100 },
        transition: springTransitions.panelExpand,
    },

    /** Simple fade - for overlays, backdrops */
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: springTransitions.gentle,
    },

    /** Rotate and scale - for FABs, spinning elements */
    rotateScale: {
        initial: { scale: 0, rotate: -180 },
        animate: { scale: 1, rotate: 0 },
        exit: { scale: 0, rotate: 180 },
        transition: springTransitions.bouncy,
    },
} as const;

// ============================================================================
// STAGGER CHILDREN VARIANTS
// ============================================================================

/**
 * Variants for staggered list animations.
 * Use with AnimatePresence and motion components.
 *
 * @example
 * <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <motion.li key={item.id} variants={staggerItem}>{item.name}</motion.li>
 *   ))}
 * </motion.ul>
 */
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: springTransitions.snappy,
    },
};

// ============================================================================
// HOVER & TAP ANIMATIONS
// ============================================================================

/**
 * Hover and tap animation configs for interactive elements.
 * Use with whileHover and whileTap props.
 *
 * @example
 * <motion.button whileHover={hoverScale} whileTap={tapScale}>Click me</motion.button>
 */
export const hoverScale = { scale: 1.02 };
export const hoverScaleLarge = { scale: 1.05 };
export const hoverScaleSmall = { scale: 1.01 };

export const tapScale = { scale: 0.98 };
export const tapScaleSmall = { scale: 0.95 };

export const hoverLift = { y: -2, scale: 1.01 };
export const hoverGlow = {
    boxShadow: "0 0 20px rgba(var(--primary-accent-rgb), 0.3)"
};

// ============================================================================
// LOADING ANIMATIONS
// ============================================================================

/**
 * Loading/skeleton animation configs.
 */
export const pulseAnimation = {
    animate: { opacity: [0.5, 1, 0.5] },
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
};

export const bounceDots = {
    animate: { y: [0, -5, 0] },
    transition: { duration: 0.6, repeat: Infinity },
};
