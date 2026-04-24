import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {scalePath} from '@/core/svg-utils';
import {cn} from '@/lib/utils';

interface DrawingLayerProps {
  drawingPath: string;
  isDrawing: boolean;
}

export const DrawingLayer = ({ drawingPath, isDrawing }: DrawingLayerProps) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  return (
    <>
      <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', zIndex: 10 }}>
        {docState.objects.map(obj => {
          const layer = docState.layers.find(l => l.id === obj.layerId);
          if (!layer?.visible || obj.type !== 'path' || !obj.pathData) return null;
          return (
            <path 
              key={obj.id} 
              d={scalePath(obj.pathData, uiState.scale)} 
              stroke={obj.color || "black"} 
              strokeWidth={(obj.strokeWidth || 2) * uiState.scale} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ opacity: obj.opacity ?? 1 }} 
              className={cn("cursor-pointer pointer-events-auto transition-colors", uiState.selectedObjectId === obj.id ? "stroke-primary" : "stroke-black hover:stroke-primary/50")} 
              onClick={(e: any) => { e.stopPropagation(); dispatch({ type: 'SELECT_OBJECT', payload: obj.id }); }} 
            />
          );
        })}
      </svg>
      {isDrawing && drawingPath && (
        <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', zIndex: 30 }}>
          <path d={scalePath(drawingPath, uiState.scale)} stroke="black" strokeWidth={2 * uiState.scale} fill="none" strokeDasharray="5,5" />
        </svg>
      )}
    </>
  );
};
