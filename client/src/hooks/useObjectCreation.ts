import {useCallback} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
import {
  CANVAS_BASE_WIDTH, 
  DEFAULT_TEXT_WIDTH, 
  DEFAULT_TEXT_HEIGHT, 
  DEFAULT_ICON_SIZE, 
  DEFAULT_IMAGE_SIZE,
  DEFAULT_ICON_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_COLOR
} from '@/core/constants';

export const useObjectCreation = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const targetLayerId = uiState.activeLayerId ?? docState.layers[0]?.id ?? null;

  const getCenterPosition = useCallback((width: number, height: number) => {
    const scroller = document.querySelector<HTMLElement>('[data-canvas-scroller]');
    const page = document.querySelector<HTMLElement>('[data-canvas-page]');
    if (scroller && page) {
      const viewportRect = scroller.getBoundingClientRect();
      const pageRect = page.getBoundingClientRect();
      const x = (viewportRect.left + viewportRect.width / 2 - pageRect.left) / uiState.scale - width / 2;
      const y = (viewportRect.top + viewportRect.height / 2 - pageRect.top) / uiState.scale - height / 2;
      return {
        x: Math.max(0, Math.min(CANVAS_BASE_WIDTH - width, x)),
        y: Math.max(0, Math.min(docState.pdfCanvasHeight - height, y)),
      };
    }

    const scrollX = (uiState.scrollPos?.x || 0) / uiState.scale;
    const scrollY = (uiState.scrollPos?.y || 0) / uiState.scale;
    const viewportW = window.innerWidth / uiState.scale;
    const viewportH = window.innerHeight / uiState.scale;

    return {
      x: Math.max(0, Math.min(CANVAS_BASE_WIDTH - width, scrollX + viewportW / 2 - width / 2)),
      y: Math.max(0, Math.min(docState.pdfCanvasHeight - height, scrollY + viewportH / 2 - height / 2))
    };
  }, [docState.pdfCanvasHeight, uiState.scrollPos, uiState.scale]);

  const handleAddText = useCallback(() => {
    if (!targetLayerId) return;
    const width = DEFAULT_TEXT_WIDTH / uiState.scale;
    const height = DEFAULT_TEXT_HEIGHT / uiState.scale;
    const { x, y } = getCenterPosition(width, height);
    const id = uuidv4();

    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id, type: 'text', name: '', x, y, width, height,
        layerId: targetLayerId, content: 'Double click to edit',
        fontSize: DEFAULT_TEXT_FONT_SIZE / uiState.scale, color: DEFAULT_TEXT_COLOR, rotation: 0,
        status: 'PLANNED'
      }
    });
    // The new object is selected: you are now working with objects (and can move / edit it at once).
    dispatch({ type: 'SET_TOOL', payload: 'select' });
    dispatch({ type: 'SELECT_OBJECT', payload: id });
  }, [targetLayerId, uiState.scale, getCenterPosition, dispatch]);

  const handleAddIcon = useCallback((iconType: string) => {
    if (!targetLayerId) return;
    const size = DEFAULT_ICON_SIZE / uiState.scale;

    if (docState.autoNumbering.enabled) {
      dispatch({
        type: 'SET_AUTO_NUMBERING',
        payload: { template: { type: 'icon', content: iconType, color: DEFAULT_ICON_COLOR } }
      });
      dispatch({ type: 'SET_TOOL', payload: 'stamp' });
      return;
    }

    const { x, y } = getCenterPosition(size, size);
    const id = uuidv4();
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id, type: 'icon', name: '', x, y, width: size, height: size,
        layerId: targetLayerId, color: DEFAULT_ICON_COLOR, content: iconType, rotation: 0,
        status: 'PLANNED'
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
    dispatch({ type: 'SELECT_OBJECT', payload: id });
  }, [targetLayerId, uiState.scale, docState.autoNumbering.enabled, getCenterPosition, dispatch]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetLayerId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const size = DEFAULT_IMAGE_SIZE / uiState.scale;
      const { x, y } = getCenterPosition(size, size);
      const id = uuidv4();
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id, type: 'image', name: '', x, y, width: size, height: size,
          layerId: targetLayerId, content: url, rotation: 0,
          status: 'PLANNED'
        }
      });
      dispatch({ type: 'SET_TOOL', payload: 'select' });
      dispatch({ type: 'SELECT_OBJECT', payload: id });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [targetLayerId, uiState.scale, getCenterPosition, dispatch]);

  return { handleAddText, handleAddIcon, handleImageUpload, getCenterPosition };
};
