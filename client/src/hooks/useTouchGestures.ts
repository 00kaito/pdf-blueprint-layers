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
  const lastTapRef = useRef<number>(0);
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
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const now = Date.now();
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
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

    const now = Date.now();
    const duration = now - touchStartRef.current.time;

    if (!isMovedRef.current && duration < longPressDelay) {
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < doubleTapDelay) {
        if (onDoubleTap) onDoubleTap();
        lastTapRef.current = 0; // Reset for next sequence
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
