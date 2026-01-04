import { useCallback, useRef, useEffect } from "react";

interface UseLongPressOptions {
    delay?: number;
    interval?: number;
    shouldStop?: () => boolean;
}

export function useLongPress(
    callback: () => void,
    options: UseLongPressOptions = {}
) {
    const { delay = 500, interval = 100, shouldStop } = options;
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPressingRef = useRef(false);
    const startTimeRef = useRef<number>(0);
    const hasTriggeredRef = useRef(false);
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    const startPress = useCallback(() => {
        if (isPressingRef.current) return;
        isPressingRef.current = true;
        startTimeRef.current = Date.now();
        hasTriggeredRef.current = false;

        timeoutRef.current = setTimeout(() => {
            if (!isPressingRef.current) return;

            if (shouldStop?.()) {
                stopPress();
                return;
            }

            hasTriggeredRef.current = true;
            callbackRef.current();

            intervalRef.current = setInterval(() => {
                if (!isPressingRef.current) return;

                if (shouldStop?.()) {
                    stopPress();
                    return;
                }

                callbackRef.current();
            }, interval);
        }, delay);
    }, [delay, interval, shouldStop]);

    const stopPress = useCallback(() => {
        isPressingRef.current = false;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const handleClick = useCallback(() => {
        const pressDuration = Date.now() - startTimeRef.current;

        if (!hasTriggeredRef.current && pressDuration < delay) {
            callbackRef.current();
        }
    }, [delay]);

    const handleMouseDown = useCallback(() => {
        startPress();
    }, [startPress]);

    const handleMouseUp = useCallback(() => {
        stopPress();
    }, [stopPress]);

    const handleMouseLeave = useCallback(() => {
        stopPress();
    }, [stopPress]);

    const handleTouchStart = useCallback((_e: React.TouchEvent) => {
        startPress();
    }, [startPress]);

    const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
        stopPress();
    }, [stopPress]);

    const handleTouchCancel = useCallback((_e: React.TouchEvent) => {
        stopPress();
    }, [stopPress]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
    }, []);

    useEffect(() => {
        return () => {
            stopPress();
        };
    }, [stopPress]);

    return {
        onClick: handleClick,
        onMouseDown: handleMouseDown,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseLeave,
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
        onContextMenu: handleContextMenu,
    };
}
