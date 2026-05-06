import React, {memo} from 'react';
import {useDocumentDispatch, useUIDispatch} from '@/lib/editor-context';
import {EditorObject, Layer} from '@/lib/types';
import {cn} from '@/lib/utils';

interface DrawingLayerProps {
  drawingPath: string | null;
  isDrawing: boolean;
  objects: EditorObject[];
  layers: Layer[];
  scale: number;
  selectedObjectIds: string[];
}

const scalePath = (path: string, scale: number) => {
  return path.replace(/([0-9.]+),([0-9.]+)/g, (match, x, y) => {
    return `${parseFloat(x) * scale},${parseFloat(y) * scale}`;
  });
};

export const DrawingLayer = memo(({ 
  drawingPath, 
  isDrawing, 
  objects, 
  layers, 
  scale, 
  selectedObjectIds 
}: DrawingLayerProps) => {
  const dispatch = useDocumentDispatch();
  const uiDispatch = useUIDispatch();

  return (
    <>
      <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', zIndex: 10 }}>
        {objects.map(obj => {
          const layer = layers.find(l => l.id === obj.layerId);
          if (!layer?.visible || obj.type !== 'path' || !obj.pathData) return null;
          return (
            <path 
              key={obj.id} 
              d={scalePath(obj.pathData, scale)} 
              stroke={obj.color || "black"} 
              strokeWidth={(obj.strokeWidth || 2) * scale} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ opacity: obj.opacity ?? 1 }} 
              className={cn(
                "cursor-pointer pointer-events-auto transition-colors", 
                selectedObjectIds.includes(obj.id) ? "stroke-primary" : "stroke-black hover:stroke-primary/50"
              )} 
              onClick={(e: any) => { 
                e.stopPropagation(); 
                if (e.ctrlKey || e.metaKey) {
                  uiDispatch({ type: 'TOGGLE_OBJECT_SELECTION', payload: obj.id });
                } else {
                  uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
                }
              }} 
            />
          );
        })}
      </svg>
      {isDrawing && drawingPath && (
        <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', zIndex: 30 }}>
          <path d={scalePath(drawingPath, scale)} stroke="black" strokeWidth={2 * scale} fill="none" strokeDasharray="5,5" />
        </svg>
      )}
    </>
  );
});

DrawingLayer.displayName = 'DrawingLayer';
