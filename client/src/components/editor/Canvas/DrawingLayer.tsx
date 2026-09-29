import React, {memo} from 'react';
import {useDocumentDispatch, useUIDispatch} from '@/lib/editor-context';
import {EditorObject, Layer} from '@/lib/types';

interface DrawingLayerProps {
  drawingPath: string | null;
  isDrawing: boolean;
  objects: EditorObject[];
  layers: Layer[];
  scale: number;
  selectedObjectIds: string[];
  /** Colour / stroke width (unscaled) of the stroke being drawn. */
  drawColor: string;
  drawStrokeWidth: number;
}

/** Scales every coordinate of a stored path ("M x y L x y …", unscaled canvas units) to screen pixels. */
const scalePath = (path: string, scale: number) =>
  path.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (n) => String(parseFloat(n) * scale));

export const DrawingLayer = memo(({ 
  drawingPath, 
  isDrawing, 
  objects, 
  layers, 
  scale, 
  selectedObjectIds,
  drawColor,
  drawStrokeWidth
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
              strokeWidth={(obj.strokeWidth || 2) * scale} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              // CSS vars only resolve in style, not in SVG presentation attributes.
              style={{
                opacity: obj.opacity ?? 1,
                stroke: selectedObjectIds.includes(obj.id) ? 'hsl(var(--primary))' : (obj.color || '#000000'),
              }}
              className="cursor-pointer pointer-events-auto" 
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
          <path d={scalePath(drawingPath, scale)} stroke={drawColor} strokeWidth={drawStrokeWidth * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
});

DrawingLayer.displayName = 'DrawingLayer';
