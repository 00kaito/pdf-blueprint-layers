import React from 'react';
import {Rnd} from 'react-rnd';
import {ArrowRight, Camera, Circle, Heart, Hexagon, RotateCw, Square, Star, Triangle} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {cn} from '@/lib/utils';
import {EditorObject, Layer} from '@/lib/types';

interface ObjectRendererProps {
  obj: EditorObject;
  layer: Layer;
}

const IconRenderer = ({ iconType, color }: { iconType: string, color?: string }) => {
  const props = { className: "w-full h-full", style: { color } };
  switch (iconType) {
    case 'circle': return <Circle {...props} />;
    case 'triangle': return <Triangle {...props} />;
    case 'star': return <Star {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'hexagon': return <Hexagon {...props} />;
    case 'arrow-right': return <ArrowRight {...props} />;
    case 'camera': return <Camera {...props} />;
    default: return <Square {...props} />;
  }
};

export const ObjectRenderer = ({ obj, layer }: ObjectRendererProps) => {
  const { dispatch } = useDocument();
  const { state: uiState } = useUI();

  return (
    <Rnd
      key={obj.id}
      position={{ x: obj.x * uiState.scale, y: obj.y * uiState.scale }}
      size={{ width: obj.width * uiState.scale, height: obj.height * uiState.scale }}
      onDragStop={(e: any, d) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { x: d.x / uiState.scale, y: d.y / uiState.scale } } })}
      onResizeStop={(e: any, dir, ref, delta, pos) => dispatch({ 
        type: 'UPDATE_OBJECT', 
        payload: { 
          id: obj.id, 
          updates: { 
            width: parseFloat(ref.style.width) / uiState.scale, 
            height: parseFloat(ref.style.height) / uiState.scale, 
            x: pos.x / uiState.scale, 
            y: pos.y / uiState.scale 
          } 
        } 
      })}
      onClick={(e: any) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
      }}
      onDoubleClick={(e: any) => {
        e.stopPropagation();
        const newName = prompt('Enter object name (label):', obj.name || '');
        if (newName !== null) {
          dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { name: newName } } });
        }
      }}
      scale={1}
      bounds="parent"
      disableDragging={layer.locked || uiState.tool !== 'select'}
      enableResizing={!layer.locked && uiState.selectedObjectId === obj.id}
      resizeHandleClasses={{
        bottomRight: "bg-primary w-2 h-2 rounded-full",
        bottomLeft:  "bg-primary w-2 h-2 rounded-full",
        topRight:    "bg-primary w-2 h-2 rounded-full",
        topLeft:     "bg-primary w-2 h-2 rounded-full",
      }}
      className={cn(
        "group z-20",
        uiState.selectedObjectId === obj.id ? "ring-1 ring-primary ring-offset-1" : "",
        layer.locked ? "pointer-events-none" : "cursor-move"
      )}
      style={{ transform: `rotate(${obj.rotation || 0}deg)`, opacity: obj.opacity ?? 1 }}
    >
      {uiState.selectedObjectId === obj.id && !layer.locked && (
        <div 
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-alias shadow-md"
          onMouseDown={(e) => {
            e.stopPropagation();
            const sY = e.clientY, sR = obj.rotation || 0;
            const hMM = (mE: MouseEvent) => {
              const rawRotation = (sR + (mE.clientY - sY) * 2) % 360;
              const newRotation = Math.round(rawRotation / 45) * 45;
              dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { rotation: newRotation } } });
            };
            const hMU = () => { document.removeEventListener('mousemove', hMM); document.removeEventListener('mouseup', hMU); };
            document.addEventListener('mousemove', hMM); document.addEventListener('mouseup', hMU);
          }}
        >
          <RotateCw className="w-3 h-3" />
        </div>
      )}
      <div className="w-full h-full relative group">
          {obj.type === 'text' && (
            <div 
              className={cn("w-full h-full p-1 break-words overflow-hidden outline-none", obj.fontWeight === 'bold' ? 'font-bold' : '')} 
              style={{ fontSize: (obj.fontSize || 16) * uiState.scale, color: obj.color }}
              contentEditable={uiState.tool === 'text'}
              suppressContentEditableWarning
              onBlur={(e) => dispatch({ 
                type: 'UPDATE_OBJECT', 
                payload: { id: obj.id, updates: { content: e.currentTarget.textContent || '' } } 
              })}
            >
              {obj.content}
            </div>
          )}
          {obj.type === 'icon' && <IconRenderer iconType={obj.content || 'square'} color={obj.color} />}
          {obj.type === 'image' && obj.content && <img src={obj.content} alt="" className="w-full h-full object-contain pointer-events-none" />}
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/60 px-0.5 rounded pointer-events-none" style={{ fontSize: 1 * uiState.scale, transform: `translateX(-50%) rotate(-${obj.rotation || 0}deg)` }}>{obj.name}</div>
    </Rnd>
  );
};
