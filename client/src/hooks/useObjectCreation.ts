import {useCallback} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
import {CANVAS_BASE_WIDTH} from '@/core/constants';

export const useObjectCreation = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  const getCenterPosition = useCallback((width: number, height: number) => {
    const scrollX = (uiState.scrollPos?.x || 0) / uiState.scale;
    const scrollY = (uiState.scrollPos?.y || 0) / uiState.scale;
    const viewportW = window.innerWidth / uiState.scale;
    const viewportH = window.innerHeight / uiState.scale;

    return {
      x: Math.max(0, Math.min(CANVAS_BASE_WIDTH - width, scrollX + viewportW / 2 - width / 2)),
      y: Math.max(0, scrollY + viewportH / 2 - height / 2)
    };
  }, [uiState.scrollPos, uiState.scale]);

  const handleAddText = useCallback(() => {
    if (!uiState.activeLayerId) return;
    const width = 200 / uiState.scale;
    const height = 50 / uiState.scale;
    const { x, y } = getCenterPosition(width, height);
    
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(), type: 'text', name: '', x, y, width, height,
        layerId: uiState.activeLayerId, content: 'Double click to edit',
        fontSize: 16 / uiState.scale, color: '#000000', rotation: 0
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  }, [uiState.activeLayerId, uiState.scale, getCenterPosition, dispatch]);

  const handleAddIcon = useCallback((iconType: string) => {
    if (!uiState.activeLayerId) return;
    const size = 50 / uiState.scale;

    if (docState.autoNumbering.enabled) {
      dispatch({
        type: 'SET_AUTO_NUMBERING',
        payload: { template: { type: 'icon', content: iconType, color: '#ef4444' } }
      });
      dispatch({ type: 'SET_TOOL', payload: 'stamp' });
      return;
    }

    const { x, y } = getCenterPosition(size, size);
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(), type: 'icon', name: '', x, y, width: size, height: size,
        layerId: uiState.activeLayerId, color: '#ef4444', content: iconType, rotation: 0
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  }, [uiState.activeLayerId, uiState.scale, docState.autoNumbering.enabled, getCenterPosition, dispatch]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uiState.activeLayerId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const size = 200 / uiState.scale;
      const { x, y } = getCenterPosition(size, size);
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(), type: 'image', name: '', x, y, width: size, height: size,
          layerId: uiState.activeLayerId!, content: url, rotation: 0
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [uiState.activeLayerId, uiState.scale, getCenterPosition, dispatch]);

  const handleCustomIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      dispatch({
        type: 'ADD_CUSTOM_ICON',
        payload: { id: uuidv4(), url: event.target?.result as string, name: file.name }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [dispatch]);

  return { handleAddText, handleAddIcon, handleImageUpload, handleCustomIconUpload, getCenterPosition };
};
