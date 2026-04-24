import {useCallback, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';

export const useDrawing = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { dispatch } = useDocument();
  const { state: uiState } = useUI();
  const [drawingPath, setDrawingPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (uiState.tool === 'draw' && uiState.activeLayerId) {
      setIsDrawing(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / uiState.scale;
        const y = (e.clientY - rect.top) / uiState.scale;
        setDrawingPath(`M ${x} ${y}`);
      }
    }
  }, [uiState.tool, uiState.activeLayerId, uiState.scale, containerRef]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDrawing && uiState.tool === 'draw') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        let x = (e.clientX - rect.left) / uiState.scale;
        let y = (e.clientY - rect.top) / uiState.scale;
        
        if (e.shiftKey) {
          const parts = drawingPath.trim().split(' ');
          if (parts.length >= 3) {
             const lastY = parseFloat(parts[parts.length - 1]);
             const lastX = parseFloat(parts[parts.length - 2]);
             if (Math.abs(x - lastX) > Math.abs(y - lastY)) y = lastY; else x = lastX;
          }
        }
        setDrawingPath((prev) => `${prev} L ${x} ${y}`);
      }
    }
  }, [isDrawing, uiState.tool, uiState.scale, drawingPath, containerRef]);

  const onMouseUp = useCallback(() => {
    if (isDrawing && uiState.activeLayerId) {
      setIsDrawing(false);
      if (drawingPath.length > 10) {
        dispatch({
          type: 'ADD_OBJECT',
          payload: {
            id: uuidv4(), type: 'path', name: '', x: 0, y: 0, 
            width: CANVAS_BASE_WIDTH, height: CANVAS_BASE_HEIGHT,
            layerId: uiState.activeLayerId, pathData: drawingPath, color: '#000000', strokeWidth: 2
          }
        });
      }
      setDrawingPath('');
    }
  }, [isDrawing, uiState.activeLayerId, drawingPath, dispatch]);

  return { drawingPath, isDrawing, onMouseDown, onMouseMove, onMouseUp };
};
