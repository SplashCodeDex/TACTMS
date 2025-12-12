import { useEffect, useCallback, useRef } from 'react';

type KeyCombo = {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
};

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
    combo: KeyCombo;
    handler: ShortcutHandler;
    description?: string;
    /** If true, prevents default browser behavior */
    preventDefault?: boolean;
    /** If true, stops event propagation */
    stopPropagation?: boolean;
    /** Only trigger when no modal/dialog is open */
    global?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 * Supports key combinations with Ctrl, Shift, Alt, Meta modifiers
 *
 * @example
 * useKeyboardShortcuts([
 *     { combo: { key: 's', ctrl: true }, handler: handleSave, preventDefault: true },
 *     { combo: { key: 'Escape' }, handler: handleClose },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs (unless global)
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        for (const shortcut of shortcutsRef.current) {
            const { combo, handler, preventDefault, stopPropagation, global } = shortcut;

            // Skip non-global shortcuts when in input
            if (isInput && !global && combo.key !== 'Escape') continue;

            // Check key match (case insensitive for letters)
            const keyMatch = event.key.toLowerCase() === combo.key.toLowerCase() ||
                event.code === combo.key;

            // Check modifiers
            const ctrlMatch = !!combo.ctrl === (event.ctrlKey || event.metaKey);
            const shiftMatch = !!combo.shift === event.shiftKey;
            const altMatch = !!combo.alt === event.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                if (preventDefault) event.preventDefault();
                if (stopPropagation) event.stopPropagation();
                handler(event);
                break; // Only trigger first matching shortcut
            }
        }
    }, [enabled]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Common shortcuts for modals (Enter to confirm, Escape to close)
 */
export function useModalShortcuts(
    onConfirm?: () => void,
    onClose?: () => void,
    enabled: boolean = true
) {
    useKeyboardShortcuts([
        ...(onConfirm ? [{
            combo: { key: 'Enter', ctrl: true },
            handler: () => onConfirm(),
            description: 'Confirm',
            preventDefault: true
        }] : []),
        ...(onClose ? [{
            combo: { key: 'Escape' },
            handler: () => onClose(),
            description: 'Close modal'
        }] : []),
    ], enabled);
}

/**
 * Global app shortcuts (accessible from anywhere)
 */
export function useGlobalShortcuts(handlers: {
    onSave?: () => void;
    onSearch?: () => void;
    onHelp?: () => void;
}) {
    useKeyboardShortcuts([
        ...(handlers.onSave ? [{
            combo: { key: 's', ctrl: true },
            handler: () => handlers.onSave!(),
            description: 'Save',
            preventDefault: true,
            global: true
        }] : []),
        ...(handlers.onSearch ? [{
            combo: { key: 'k', ctrl: true },
            handler: () => handlers.onSearch!(),
            description: 'Search',
            preventDefault: true,
            global: true
        }] : []),
        ...(handlers.onHelp ? [{
            combo: { key: '/', shift: true },
            handler: () => handlers.onHelp!(),
            description: 'Help',
            global: true
        }] : []),
    ]);
}
