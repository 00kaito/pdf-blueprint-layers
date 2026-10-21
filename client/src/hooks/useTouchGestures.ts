import { useRef, useEffect, useCallback } from 'react';

interface TouchGesturesOptions {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  moveThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
}

export const useTouchGestures = ({
  onTap,
  onDoubleTap,
  onLongPress,
  moveThreshold = 10,
  doubleTapDelay = 300,
  longPressDelay = 500,
}: TouchGesturesOptions) => {
  /**
   * Times come from the events themselves (`timeStamp`), not from when they are handled: the first tap
   * selects the object and the re-render can delay the second tap's handling past the double-tap window.
   */
  const lastTapRef = useRef<number>(-Infinity);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMovedRef = useRef<boolean>(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Multi-touch (pinch) is handled by usePinchZoom; it is never a tap.
    if (e.touches.length !== 1) {
      clearLongPressTimer();
      touchStartRef.current = null;
      return;
    }

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: e.timeStamp };
    isMovedRef.current = false;

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (!isMovedRef.current && onLongPress) {
        onLongPress();
        touchStartRef.current = null; // Prevent tap after long press
      }
    }, longPressDelay);
  }, [onLongPress, longPressDelay, clearLongPressTimer]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    if (dx > moveThreshold || dy > moveThreshold) {
      isMovedRef.current = true;
      clearLongPressTimer();
    }
  }, [moveThreshold, clearLongPressTimer]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();

    if (!touchStartRef.current) return;

    const now = e.timeStamp;
    const duration = now - touchStartRef.current.time;

    if (!isMovedRef.current && duration < longPressDelay) {
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < doubleTapDelay) {
        if (onDoubleTap) onDoubleTap();
        lastTapRef.current = -Infinity; // Reset for next sequence
      } else {
        if (onTap) onTap();
        lastTapRef.current = now;
      }
    }

    touchStartRef.current = null;
  }, [onTap, onDoubleTap, longPressDelay, doubleTapDelay, clearLongPressTimer]);

  const onTouchCancel = useCallback(() => {
    clearLongPressTimer();
    touchStartRef.current = null;
    isMovedRef.current = false;
  }, [clearLongPressTimer]);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
};
