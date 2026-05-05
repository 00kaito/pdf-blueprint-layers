import React, {useState} from 'react';
import {Rnd} from 'react-rnd';
import {ArrowRight, Camera, Circle, Heart, Hexagon, RotateCw, Square, Star, Triangle} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {useTouchGestures} from '@/hooks/useTouchGestures';
import {cn} from '@/lib/utils';
import {EditorObject, Layer} from '@/lib/types';
import {useCurrentUser} from '@/hooks/useAuth';

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

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'PLANNED': return '#f87171'; // Red 400
    case 'CABLE_PULLED': return '#3b82f6'; // Blue 500
    case 'TERMINATED': return '#a855f7'; // Purple 500
    case 'TESTED': return '#4ade80'; // Green 400 (Jasnozielony)
    case 'APPROVED': return '#16a34a'; // Green 600
    case 'ISSUE': return '#dc2626'; // Red 600
    default: return null;
  }
};

const getStatusCategoryColor = (status?: string) => {
  switch (status) {
    case 'PLANNED': return '#f87171'; // Red 400
    case 'CABLE_PULLED':
    case 'TERMINATED': return '#fbbf24'; // Amber 400
    case 'TESTED':
    case 'APPROVED': return '#22c55e'; // Green 500
    case 'ISSUE': return '#dc2626'; // Red 600
    default: return null;
  }
};

export const ObjectRenderer = ({ obj, layer }: ObjectRendererProps) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { dispatch } = useDocument();
  const { state: uiState } = useUI();
  const [isRotating, setIsRotating] = useState(false);

  const touchGestures = useTouchGestures({
    onTap: () => {
      dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
    },
    onDoubleTap: () => {
      dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
      dispatch({ type: 'OPEN_OBJECT_DETAILS' });
    },
    onLongPress: () => {
      dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
      dispatch({ type: 'OPEN_OBJECT_DETAILS' });
    },
  });

  const displayColor = uiState.showStatusColors && obj.type !== 'text'
    ? (getStatusCategoryColor(obj.status) || obj.color || '#000000')
    : (obj.color || '#000000');
  
  const indicatorColor = obj.type !== 'text' ? getStatusColor(obj.status) : null;

  const handleRotationMouseDown = (e: React.MouseEvent) => {
    if (isTech) return;
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

  const handleRotationTouchStart = (e: React.TouchEvent) => {
    if (isTech) return;
    e.stopPropagation();
    setIsRotating(true);

    const touch = e.touches[0];
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleTouchMove = (tE: TouchEvent) => {
      if (tE.touches.length !== 1) return;
      tE.preventDefault();
      const moveTouch = tE.touches[0];
      const angle = Math.atan2(moveTouch.clientY - centerY, moveTouch.clientX - centerX);
      let degree = (angle * (180 / Math.PI)) + 90;
      const snappedDegree = Math.round(degree / 45) * 45;
      dispatch({ 
        type: 'UPDATE_OBJECT', 
        payload: { id: obj.id, updates: { rotation: snappedDegree } } 
      });
    };

    const handleTouchEnd = () => {
      setIsRotating(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <Rnd
      key={obj.id}
      position={{ x: obj.x * uiState.scale, y: obj.y * uiState.scale }}
      size={{ width: obj.width * uiState.scale, height: obj.height * uiState.scale }}
      onDragStop={(e: any, d) => {
        if (isTech) return;
        dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { x: d.x / uiState.scale, y: d.y / uiState.scale } } });
      }}
      onResizeStop={(e: any, dir, ref, delta, pos) => {
        if (isTech) return;
        dispatch({ 
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
        });
      }}
      onClick={(e: any) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          dispatch({ type: 'TOGGLE_OBJECT_SELECTION', payload: obj.id });
        } else {
          dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
        }
      }}
      scale={1}
      bounds="parent"
      disableDragging={isTech || layer.locked || uiState.tool !== 'select' || isRotating}
      enableResizing={isTech ? {} : (!layer.locked && uiState.selectedObjectIds.includes(obj.id))}
      resizeHandleClasses={{
        bottomRight: "bg-primary w-2 h-2 rounded-full",
        bottomLeft:  "bg-primary w-2 h-2 rounded-full",
        topRight:    "bg-primary w-2 h-2 rounded-full",
        topLeft:     "bg-primary w-2 h-2 rounded-full",
      }}
      className={cn(
        "group z-20",
        uiState.selectedObjectIds.includes(obj.id) ? "ring-1 ring-primary ring-offset-1" : "",
        layer.locked ? "pointer-events-none" : "cursor-move"
      )}
      style={{ opacity: obj.opacity ?? 1, zIndex: uiState.selectedObjectIds.includes(obj.id) ? 30 : 20 }}
    >
      {uiState.selectedObjectIds.includes(obj.id) && !layer.locked && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-alias shadow-lg z-50 hover:scale-110 transition-transform"
          onMouseDown={handleRotationMouseDown}
          onTouchStart={handleRotationTouchStart}
        >
          <RotateCw className="w-4 h-4" />
        </div>
      )}
      
      <div 
        className="w-full h-full relative" 
        style={{ transform: `rotate(${obj.rotation || 0}deg)` }}
        {...touchGestures}
      >
          {obj.type === 'text' && (
            <div 
              className={cn("w-full h-full p-1 break-words overflow-hidden outline-none", obj.fontWeight === 'bold' ? 'font-bold' : '')} 
              style={{ fontSize: (obj.fontSize || 16) * uiState.scale, color: displayColor }}
              contentEditable={isTech ? false : (uiState.tool === 'text')}
              suppressContentEditableWarning
              onDoubleClick={(e) => {
                if (isTech) e.stopPropagation();
              }}
              onBlur={(e) => {
                if (isTech) return;
                dispatch({ 
                  type: 'UPDATE_OBJECT', 
                  payload: { id: obj.id, updates: { content: e.currentTarget.textContent || '' } } 
                });
              }}
            >
              {obj.content}
            </div>
          )}
          {obj.type === 'icon' && <IconRenderer iconType={obj.content || 'square'} color={displayColor} />}
          {obj.type === 'image' && obj.content && (
            displayColor ? (
              <div 
                className="w-full h-full"
                style={{ 
                  backgroundColor: displayColor,
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

          {indicatorColor && (
            <div 
              className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white shadow-sm z-50"
              style={{ backgroundColor: indicatorColor }}
            />
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
