import { useRef, useEffect, useCallback } from 'react';
import { useUI } from '@/lib/editor-context';

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
  const { state: uiState, dispatch: uiDispatch } = useUI();
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMovedRef = useRef<boolean>(false);
  const initialPinchDistanceRef = useRef<number | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getDistance = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
    return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      clearLongPressTimer();
      initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      return;
    }

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
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleFactor = currentDistance / initialPinchDistanceRef.current;
      
      uiDispatch({ 
        type: 'SET_SCALE', 
        payload: Math.max(0.1, Math.min(10, uiState.scale * scaleFactor)) 
      });
      
      initialPinchDistanceRef.current = currentDistance;
      return;
    }

    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    if (dx > moveThreshold || dy > moveThreshold) {
      isMovedRef.current = true;
      clearLongPressTimer();
    }
  }, [moveThreshold, clearLongPressTimer, uiDispatch, uiState.scale]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistanceRef.current = null;
    }

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
