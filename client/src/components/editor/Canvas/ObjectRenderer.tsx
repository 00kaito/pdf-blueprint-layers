import React, {useState} from 'react';
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
  const [isRotating, setIsRotating] = useState(false);

  const handleRotationMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);

    // Get center of the object in screen coordinates
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleMouseMove = (mE: MouseEvent) => {
      const angle = Math.atan2(mE.clientY - centerY, mE.clientX - centerX);
      let degree = (angle * (180 / Math.PI)) + 90;
      const snappedDegree = Math.round(degree / 45) * 45;
      dispatch({ 
        type: 'UPDATE_OBJECT', 
        payload: { id: obj.id, updates: { rotation: snappedDegree } } 
      });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const isSelected = uiState.selectedObjectId === obj.id;

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
      scale={1}
      bounds="parent"
      disableDragging={layer.locked || uiState.tool !== 'select' || isRotating}
      enableResizing={!layer.locked && isSelected}
      resizeHandleClasses={{
        bottomRight: "bg-primary w-2 h-2 rounded-full",
        bottomLeft:  "bg-primary w-2 h-2 rounded-full",
        topRight:    "bg-primary w-2 h-2 rounded-full",
        topLeft:     "bg-primary w-2 h-2 rounded-full",
      }}
      className={cn(
        "group z-20",
        isSelected ? "ring-1 ring-primary ring-offset-1" : "",
        layer.locked ? "pointer-events-none" : "cursor-move"
      )}
      style={{ opacity: obj.opacity ?? 1, zIndex: isSelected ? 30 : 20 }}
    >
      {isSelected && !layer.locked && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-alias shadow-lg z-50 hover:scale-110 transition-transform"
          onMouseDown={handleRotationMouseDown}
        >
          <RotateCw className="w-4 h-4" />
        </div>
      )}
      
      <div 
        className="w-full h-full relative" 
        style={{ transform: `rotate(${obj.rotation || 0}deg)` }}
      >
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
          {obj.type === 'image' && obj.content && (
            obj.color ? (
              <div 
                className="w-full h-full"
                style={{ 
                  backgroundColor: obj.color,
                  maskImage: `url(${obj.content})`,
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  maskSize: 'contain',
                  WebkitMaskImage: `url(${obj.content})`,
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  WebkitMaskSize: 'contain'
                }}
              />
            ) : (
              <img src={obj.content} alt="" className="w-full h-full object-contain pointer-events-none" />
            )
          )}
      </div>

      <div 
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/80 border border-border px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none shadow-sm"
        style={{ transform: `translateX(-50%)` }}
      >
        {obj.name}
      </div>
    </Rnd>
  );
};
