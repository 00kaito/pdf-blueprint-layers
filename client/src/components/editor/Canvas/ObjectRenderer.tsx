import React, {useLayoutEffect, useRef, useState, memo} from 'react';
import {Rnd} from 'react-rnd';
import {ArrowRight, Camera, Circle, Heart, Hexagon, RotateCw, Square, Star, Triangle} from 'lucide-react';
import {useDocumentDispatch, useUIDispatch} from '@/lib/editor-context';
import {useTouchGestures} from '@/hooks/useTouchGestures';
import {cn} from '@/lib/utils';
import {EditorObject, Layer} from '@/lib/types';
import {useCurrentUser} from '@/hooks/useAuth';
import {DEFAULT_LABEL_POSITION, getLeaderLine, LabelPosition} from '@/core/label-position';
import {Box, Guide, SNAP_DISTANCE_PX, snapBox, stepPoint} from '@/core/snapping';
import {CANVAS_BASE_WIDTH} from '@/core/constants';
import {dragStore} from '@/lib/drag-store';

/** Label placement around the object box; the label never moves the object itself. */
const LABEL_POSITION_CLASSES: Record<LabelPosition, string> = {
  bottom: 'top-full mt-1 left-1/2 -translate-x-1/2',
  top: 'bottom-full mb-1 left-1/2 -translate-x-1/2',
  left: 'right-full mr-1 top-1/2 -translate-y-1/2',
  right: 'left-full ml-1 top-1/2 -translate-y-1/2',
};

/** Pointer travel (px) before a press on the label counts as a drag rather than a click. */
const LABEL_DRAG_THRESHOLD = 3;

interface ObjectRendererProps {
  obj: EditorObject;
  layer: Layer;
  scale: number;
  tool: string;
  selectedObjectIds: string[];
  showStatusColors: boolean;
  disableMovement?: boolean;
  /** Snap to nearby objects while dragging (Ctrl / ⌘ / Alt disables it for one drag move). */
  snapEnabled?: boolean;
  /** Boxes the object can snap to (must be stable — read lazily at drag time). */
  getSnapTargets?: (excludeId: string) => Box[];
  /** Page height in unscaled canvas units, for keeping a dragged object on the page. */
  pageHeight?: number;
  /** Shift-drag steps (0.5 ft in canvas units) and the tape they follow; null without a measuring scale. */
  dragStep?: { step: number; tape: { a: { x: number; y: number }; b: { x: number; y: number } } | null } | null;
}

/** Client coordinates of a mouse or touch event. */
const clientPoint = (e: MouseEvent | TouchEvent) => {
  const t = 'touches' in e ? (e.touches[0] ?? e.changedTouches[0]) : null;
  return t ? { x: t.clientX, y: t.clientY } : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

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

export const ObjectRenderer = memo(({ 
  obj, 
  layer, 
  scale, 
  tool, 
  selectedObjectIds, 
  showStatusColors,
  disableMovement,
  snapEnabled = true,
  getSnapTargets,
  pageHeight,
  dragStep,
}: ObjectRendererProps) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const dispatch = useDocumentDispatch();
  const uiDispatch = useUIDispatch();
  const [isRotating, setIsRotating] = useState(false);
  /** Position (unscaled) while dragging — driven from the cursor, so snapping never makes the object drift. */
  const [dragPos, setDragPos] = useState<{ x: number; y: number; seq: number } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number; seq: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  /** Set when a drag really moved the object, so the click that ends it is not a Ctrl+click selection toggle. */
  const draggedRef = useRef(false);

  const isSelected = selectedObjectIds.includes(obj.id);
  // Paint-bucket fills are traced from the blueprint, so they stay pinned to it.
  const isFill = !!obj.isFill;
  const lockGeometry = isFill || !!disableMovement;

  const touchGestures = useTouchGestures({
    onTap: () => {
      uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
    },
    onDoubleTap: () => {
      uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
      uiDispatch({ type: 'OPEN_OBJECT_DETAILS' });
    },
    onLongPress: () => {
      uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
      uiDispatch({ type: 'OPEN_OBJECT_DETAILS' });
    },
  });

  const displayColor = showStatusColors && obj.type !== 'text'
    ? (getStatusCategoryColor(obj.status) || obj.color || '#000000')
    : (obj.color || '#000000');
  
  const indicatorColor = obj.type !== 'text' ? getStatusColor(obj.status) : null;

  // --- Label: optional manual placement + dashed leader line back to the object ---
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState({ w: 0, h: 0 });
  const [dragLabelOffset, setDragLabelOffset] = useState<{ x: number; y: number } | null>(null);
  const labelDragRef = useRef<{
    pointerId: number; startX: number; startY: number; origin: { x: number; y: number }; moved: boolean;
  } | null>(null);
  const labelOffset = dragLabelOffset ?? obj.labelOffset ?? null;
  const canMoveLabel = !isTech && !disableMovement && !layer.locked && tool === 'select';

  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    setLabelSize(s => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
  }, [obj.name, labelOffset !== null]);

  const handleLabelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canMoveLabel || e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    let origin = obj.labelOffset;
    if (!origin) {
      // Start from wherever the side placement currently puts the label.
      const parent = el.offsetParent as HTMLElement | null;
      const lr = el.getBoundingClientRect();
      const pr = parent?.getBoundingClientRect();
      origin = pr
        ? { x: (lr.left + lr.width / 2 - (pr.left + pr.width / 2)) / scale, y: (lr.top + lr.height / 2 - (pr.top + pr.height / 2)) / scale }
        : { x: 0, y: 0 };
    }
    el.setPointerCapture(e.pointerId);
    labelDragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origin, moved: false };
  };

  const handleLabelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = labelDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < LABEL_DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragLabelOffset({ x: drag.origin.x + dx / scale, y: drag.origin.y + dy / scale });
  };

  const handleLabelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = labelDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    labelDragRef.current = null;
    if (drag.moved && dragLabelOffset) {
      const round = (v: number) => Math.round(v * 100) / 100;
      dispatch({
        type: 'UPDATE_OBJECT',
        payload: { id: obj.id, updates: { labelOffset: { x: round(dragLabelOffset.x), y: round(dragLabelOffset.y) } } },
      });
    } else {
      uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
    }
    setDragLabelOffset(null);
  };

  const boxW = obj.width * scale, boxH = obj.height * scale;
  const labelCenter = labelOffset
    ? { x: boxW / 2 + labelOffset.x * scale, y: boxH / 2 + labelOffset.y * scale }
    : null;
  const leader = labelCenter && obj.name && labelSize.w > 0
    ? getLeaderLine(
        { cx: boxW / 2, cy: boxH / 2, w: boxW, h: boxH },
        { cx: labelCenter.x, cy: labelCenter.y, w: labelSize.w, h: labelSize.h },
        4,
      )
    : null;

  const handleRotationMouseDown = (e: React.MouseEvent) => {
    if (isTech || disableMovement) return;
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);

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
    if (isTech || disableMovement) return;
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
      position={{
        // While dragging, react-draggable renders its own position and only takes ours when the prop
        // changes. A snapped object can keep the same position for several moves, so alternate an
        // invisible 0.001 px to make every move override it (otherwise the object drifts off the snap).
        x: (dragPos?.x ?? obj.x) * scale + (dragPos && dragPos.seq % 2 ? 0.001 : 0),
        y: (dragPos?.y ?? obj.y) * scale,
      }}
      size={{ width: obj.width * scale, height: obj.height * scale }}
      onDragStart={(e: any) => {
        const p = clientPoint(e);
        dragStartRef.current = { x: obj.x, y: obj.y, clientX: p.x, clientY: p.y };
      }}
      onDrag={(e: any) => {
        const start = dragStartRef.current;
        if (!start) return;
        const p = clientPoint(e);
        // Raw position from the cursor (not react-draggable's own, which already contains the last snap).
        let x = start.x + (p.x - start.clientX) / scale;
        let y = start.y + (p.y - start.clientY) / scale;
        const stepping = e.shiftKey && !!dragStep;
        if (stepping) {
          // Shift: the centre jumps in 0.5 ft steps (along / across the tape if there is one).
          const half = { x: obj.width / 2, y: obj.height / 2 };
          const c = stepPoint(
            { x: x + half.x, y: y + half.y },
            { x: start.x + half.x, y: start.y + half.y },
            dragStep!.step,
            dragStep!.tape,
          );
          x = c.x - half.x;
          y = c.y - half.y;
        }
        x = clamp(x, 0, CANVAS_BASE_WIDTH - obj.width);
        y = pageHeight ? clamp(y, 0, pageHeight - obj.height) : Math.max(0, y);
        let guides: Guide[] = [];
        // Ctrl / ⌘ / Alt held = drop the object exactly where it is, no snapping.
        const free = e.ctrlKey || e.metaKey || e.altKey;
        if (!stepping && snapEnabled && !free && getSnapTargets) {
          const snapped = snapBox({ x, y, width: obj.width, height: obj.height }, getSnapTargets(obj.id), SNAP_DISTANCE_PX / scale);
          ({ x, y, guides } = snapped);
        }
        draggedRef.current = true;
        dragPosRef.current = { x, y, seq: (dragPosRef.current?.seq ?? 0) + 1 };
        setDragPos(dragPosRef.current);
        dragStore.set({ objectId: obj.id, box: { x, y, width: obj.width, height: obj.height }, guides });
      }}
      onDragStop={() => {
        const pos = dragPosRef.current;
        dragStartRef.current = null;
        dragPosRef.current = null;
        setDragPos(null);
        dragStore.set(null);
        // No movement (a plain click) or movement not allowed: nothing to save.
        if (!pos || isTech || disableMovement) return;
        dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { x: pos.x, y: pos.y } } });
      }}
      onResizeStop={(e: any, dir, ref, delta, pos) => {
        if (isTech || disableMovement) return;
        dispatch({ 
          type: 'UPDATE_OBJECT', 
          payload: { 
            id: obj.id, 
            updates: { 
              width: parseFloat(ref.style.width) / scale, 
              height: parseFloat(ref.style.height) / scale, 
              x: pos.x / scale, 
              y: pos.y / scale 
            }
          } 
        });
      }}
      onClick={(e: any) => {
        e.stopPropagation();
        const dragged = draggedRef.current;
        draggedRef.current = false;
        if ((e.ctrlKey || e.metaKey) && !dragged) {
          uiDispatch({ type: 'TOGGLE_OBJECT_SELECTION', payload: obj.id });
        } else {
          uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
        }
      }}
      scale={1}
      cancel=".object-label"
      bounds="parent"
      disableDragging={lockGeometry || isTech || layer.locked || tool !== 'select' || isRotating}
      enableResizing={isTech || lockGeometry ? {} : (!layer.locked && isSelected)}
      resizeHandleClasses={{
        bottomRight: "bg-primary w-2 h-2 rounded-full",
        bottomLeft:  "bg-primary w-2 h-2 rounded-full",
        topRight:    "bg-primary w-2 h-2 rounded-full",
        topLeft:     "bg-primary w-2 h-2 rounded-full",
      }}
      className={cn(
        "group z-20",
        isFill && "is-fill", // a selection rectangle may start on a fill (see useMarquee)
        isSelected ? "ring-1 ring-primary ring-offset-1" : "",
        // While the bucket is active, clicks go through a fill to the blueprint (re-fill = recolour).
        layer.locked || (isFill && tool === 'fill') ? "pointer-events-none" : isFill ? "cursor-pointer" : "cursor-move"
      )}
      // Fills sit below regular objects and drawn paths.
      style={{ opacity: obj.opacity ?? 1, zIndex: isSelected ? 30 : isFill ? 8 : 20 }}
    >
      {isSelected && !layer.locked && !lockGeometry && (
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
              style={{ fontSize: (obj.fontSize || 16) * scale, color: displayColor }}
              contentEditable={isTech || disableMovement ? false : (tool === 'text')}
              suppressContentEditableWarning
              onDoubleClick={(e) => {
                if (isTech || disableMovement) e.stopPropagation();
              }}
              onBlur={(e) => {
                if (isTech || disableMovement) return;
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
          {/* Photo marker, mirroring the status dot in the opposite corner. */}
          {!isFill && obj.type !== 'path' && !!obj.photos?.length && (
            <div
              className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-sky-500 border border-white shadow-sm z-50 flex items-center justify-center pointer-events-none"
              title={`${obj.photos.length} photo(s)`}
              data-testid="photo-indicator"
            >
              <Camera className="w-2 h-2 text-white" strokeWidth={3} />
            </div>
          )}
      </div>

      {!isFill && leader && (
        <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={boxW} height={boxH}>
          <line
            x1={leader.from.x} y1={leader.from.y} x2={leader.to.x} y2={leader.to.y}
            stroke={displayColor} strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round"
          />
        </svg>
      )}

      {!isFill && <div 
        ref={labelRef}
        className={cn(
          "object-label absolute whitespace-nowrap border border-border px-1.5 py-0.5 rounded text-[10px] font-medium shadow-sm touch-none",
          // A detached label is opaque so the leader line visibly ends at its border.
          labelCenter ? "bg-white -translate-x-1/2 -translate-y-1/2" : cn("bg-white/80", LABEL_POSITION_CLASSES[obj.labelPosition ?? DEFAULT_LABEL_POSITION]),
          canMoveLabel && obj.name ? "pointer-events-auto cursor-move" : "pointer-events-none",
          dragLabelOffset && "ring-1 ring-primary"
        )}
        style={labelCenter ? { left: labelCenter.x, top: labelCenter.y } : undefined}
        title={canMoveLabel && obj.name ? 'Drag to move the label' : undefined}
        onPointerDown={handleLabelPointerDown}
        onPointerMove={handleLabelPointerMove}
        onPointerUp={handleLabelPointerUp}
        onPointerCancel={handleLabelPointerUp}
        onMouseDown={(e) => { if (canMoveLabel) e.stopPropagation(); }}
        onClick={(e) => e.stopPropagation()}
      >
        {obj.name}
      </div>}
    </Rnd>
  );
});

ObjectRenderer.displayName = 'ObjectRenderer';
