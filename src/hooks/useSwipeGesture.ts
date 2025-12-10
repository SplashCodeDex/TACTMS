import { useRef, useCallback } from 'react';

interface SwipeConfig {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number; // minimum distance in pixels to trigger swipe
}

/**
 * Hook to detect swipe gestures on touch devices
 * @param config - Configuration object with swipe callbacks and threshold
 * @returns Touch event handlers to spread onto an element
 */
export function useSwipeGesture(config: SwipeConfig) {
    const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 } = config;

    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const touchEndY = useRef<number>(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
        touchEndY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback(() => {
        const deltaX = touchEndX.current - touchStartX.current;
        const deltaY = touchEndY.current - touchStartY.current;

        // Determine if horizontal or vertical swipe
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

        if (isHorizontal) {
            if (deltaX < -threshold && onSwipeLeft) {
                onSwipeLeft();
            } else if (deltaX > threshold && onSwipeRight) {
                onSwipeRight();
            }
        } else {
            if (deltaY < -threshold && onSwipeUp) {
                onSwipeUp();
            } else if (deltaY > threshold && onSwipeDown) {
                onSwipeDown();
            }
        }

        // Reset values
        touchStartX.current = 0;
        touchStartY.current = 0;
        touchEndX.current = 0;
        touchEndY.current = 0;
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
}
