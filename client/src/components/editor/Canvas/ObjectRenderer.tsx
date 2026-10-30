import React, {useEffect, useLayoutEffect, useRef, useState, memo} from 'react';
import {Rnd} from 'react-rnd';
import {ArrowRight, Camera, Circle, CopyPlus, Heart, Hexagon, RotateCw, Settings2, Square, Star, Trash2, Triangle} from 'lucide-react';
import {useDocumentDispatch, useUIDispatch} from '@/lib/editor-context';
import {useTouchGestures} from '@/hooks/useTouchGestures';
import {cn} from '@/lib/utils';
import {EditorObject, Layer} from '@/lib/types';
import {useCurrentUser} from '@/hooks/useAuth';
import {DEFAULT_LABEL_POSITION, getLeaderLine, LabelPosition} from '@/core/label-position';
import {Box, Guide, SNAP_DISTANCE_PX, snapBox, stepPoint} from '@/core/snapping';
import {CANVAS_BASE_WIDTH} from '@/core/constants';
import {statusOf} from '@/core/status';
import {dragStore} from '@/lib/drag-store';
import {LV_ICONS, objectLabel} from '@/core/lv-icons';
import {LvIcon} from '@/components/editor/LvIcon';
import {BlindspotShape} from '@/components/editor/BlindspotShape';
import {BLINDSPOT_ICON} from '@/core/camera-coverage';
import {PLAN_CHANGE_BY_ID} from '@/core/plan-change';
import {v4 as uuidv4} from 'uuid';

/** Label placement around the object box; the label never moves the object itself. */
const LABEL_POSITION_CLASSES: Record<LabelPosition, string> = {
  bottom: 'top-full mt-1 left-1/2 -translate-x-1/2',
  top: 'bottom-full mb-1 left-1/2 -translate-x-1/2',
  left: 'right-full mr-1 top-1/2 -translate-y-1/2',
  right: 'left-full ml-1 top-1/2 -translate-y-1/2',
};

/** Corner resize handle: transparent 20 px grab area with an 8 px dot centred in it. */
const RESIZE_HANDLE_CLASS = "after:absolute after:inset-[6px] after:rounded-full after:bg-primary after:ring-1 after:ring-white";

/**
 * Touch: the action bar (and a stylus on the rotate handle) ignores taps this long after the object
 * was selected — the second tap of a double tap must not hit an action that just appeared.
 */
const ACTION_GUARD_MS = 400;
/** Smallest on-screen label font (the labels' size before print-size preview). */
const LABEL_MIN_PX = 10;

/** Touch: finger travel (px) before a press on a selected object moves it, so a tap never nudges it. */
const TOUCH_DRAG_THRESHOLD_PX = 8;

/** Touch: gap (px) between an object and its action bar, and the bar's margin to the visible edges. */
const ACTION_BAR_GAP_PX = 40;
const ACTION_BAR_MARGIN_PX = 8;

/** Pointer travel (px) before a press on the label counts as a drag rather than a click. */
const LABEL_DRAG_THRESHOLD = 3;

/** Colour of technicians' change requests on the plan. */
export const REQUEST_COLOR = '#d97706';

interface ObjectRendererProps {
  obj: EditorObject;
  layer: Layer;
  scale: number;
  tool: string;
  selectedObjectIds: string[];
  showStatusColors: boolean;
  /** A technician's move not sent yet ("send as request?" is open): shown like a pending request. */
  draftMove?: { x: number; y: number };
  /** Mount height next to the label ("TV 1 · 60″"). */
  showMountHeight?: boolean;
  disableMovement?: boolean;
  /** Snap to nearby objects while dragging (Ctrl / ⌘ / Alt disables it for one drag move). */
  snapEnabled?: boolean;
  /** Boxes the object can snap to (must be stable — read lazily at drag time). */
  getSnapTargets?: (excludeId: string) => Box[];
  /** Page height in unscaled canvas units, for keeping a dragged object on the page. */
  pageHeight?: number;
  /** Shift-drag steps (0.5 ft in canvas units) and the tape they follow; null without a measuring scale. */
  dragStep?: { step: number; tape: { a: { x: number; y: number }; b: { x: number; y: number } } | null } | null;
  /**
   * Touch layout (tablet): a finger drag on an unselected object pans the plan — only a selected
   * object (tap / long press) moves. The rotate handle turns in 45° steps per tap.
   */
  touchLayout?: boolean;
  /** Colour of the IDF this device home-runs to (or of the rack itself); shown when there are several IDFs. */
  idfColor?: string;
  /** Device with no cable assigned — flagged while cable routes are shown. */
  noCables?: boolean;
  /** Label size of the exported PDF (canvas units): labels grow with it, never below the screen's 10px. */
  labelFontSize?: number;
}

/** Client coordinates of a mouse or touch event. */
const clientPoint = (e: MouseEvent | TouchEvent) => {
  const t = 'touches' in e ? (e.touches[0] ?? e.changedTouches[0]) : null;
  return t ? { x: t.clientX, y: t.clientY } : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

const IconRenderer = ({ iconType, color }: { iconType: string, color?: string }) => {
  const props = { className: "w-full h-full", style: { color } };
  if (LV_ICONS[iconType]) return <LvIcon type={iconType} {...props} />;
  // Fills its whole box (any proportions), unlike the square icons.
  if (iconType === BLINDSPOT_ICON) return <BlindspotShape className="w-full h-full" color={color} />;
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
  showMountHeight = false,
  draftMove,
  disableMovement,
  snapEnabled = true,
  getSnapTargets,
  pageHeight,
  dragStep,
  touchLayout = false,
  idfColor,
  noCables = false,
  labelFontSize = 1,
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
  /** After a double-tap clone, the browser's emulated click must not select the original again. */
  const ignoreClickUntilRef = useRef(0);

  const isSelected = selectedObjectIds.includes(obj.id);
  // Paint-bucket fills are traced from the blueprint, so they stay pinned to it.
  const isFill = !!obj.isFill;
  const lockGeometry = isFill || !!disableMovement;
  const canDuplicate = !isTech && !disableMovement && !layer.locked && !isFill && obj.type !== 'path' && tool === 'select';

  /**
   * When the object was selected. The rotate button appears under the finger's next tap, so on touch
   * it ignores taps right after selecting (the second tap of a double tap used to rotate the object).
   */
  const selectedAtRef = useRef(0);
  useEffect(() => { if (isSelected) selectedAtRef.current = Date.now(); }, [isSelected]);

  const duplicate = () => {
    ignoreClickUntilRef.current = Date.now() + 600;
    dispatch({ type: 'DUPLICATE_OBJECT', payload: { id: obj.id, newId: uuidv4() } });
  };

  const canEdit = !isTech && !disableMovement && !layer.locked;
  /** Touch actions for the one selected object. */
  const actions = [
    canDuplicate && { id: 'duplicate', label: 'Duplicate (next number)', short: 'Copy', icon: CopyPlus, run: duplicate },
    canEdit && !lockGeometry && { id: 'rotate', label: 'Rotate 45°', short: '45°', icon: RotateCw, run: () => rotateByStep() },
    {
      id: 'properties', label: 'Properties', short: 'Props', icon: Settings2,
      run: () => { uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id }); uiDispatch({ type: 'OPEN_OBJECT_DETAILS' }); },
    },
    canEdit && { id: 'delete', label: 'Delete', short: 'Delete', icon: Trash2, run: () => dispatch({ type: 'DELETE_OBJECT', payload: obj.id }) },
  ].filter(Boolean) as { id: string; label: string; short: string; icon: typeof CopyPlus; run: () => void }[];
  const showActionBar = touchLayout && isSelected && tool === 'select' && selectedObjectIds.length === 1;
  /**
   * Where the bar fits in the visible part of the plan (scrolled area, minus the floating properties
   * panel): above the object unless there is no room, and slid sideways off the edges.
   */
  const actionBarRef = useRef<HTMLDivElement>(null);
  const [actionBarPlace, setActionBarPlace] = useState({ below: false, shift: 0 });
  useLayoutEffect(() => {
    const bar = actionBarRef.current;
    const box = bar?.parentElement;
    const scroller = box?.closest<HTMLElement>('[data-canvas-scroller]');
    if (!showActionBar || !bar || !box || !scroller) return;
    const place = () => {
      const o = box.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      const panel = document.querySelector<HTMLElement>('[data-floating-panel]')?.getBoundingClientRect();
      const right = panel && panel.left > s.left ? Math.min(s.right, panel.left) : s.right;
      const need = bar.offsetHeight + ACTION_BAR_GAP_PX + ACTION_BAR_MARGIN_PX;
      const above = o.top - s.top, under = s.bottom - o.bottom;
      const below = above < need && under > above;
      const left = o.left + o.width / 2 - bar.offsetWidth / 2;
      const min = s.left + ACTION_BAR_MARGIN_PX, max = right - ACTION_BAR_MARGIN_PX - bar.offsetWidth;
      const shift = Math.round(Math.max(min, Math.min(left, max)) - left);
      setActionBarPlace(p => (p.below === below && p.shift === shift ? p : { below, shift }));
    };
    place();
    scroller.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => { scroller.removeEventListener('scroll', place); window.removeEventListener('resize', place); };
  }, [showActionBar, obj.x, obj.y, obj.width, obj.height, scale, dragPos]);

  const touchGestures = useTouchGestures({
    onTap: () => {
      uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
    },
    // Double tap = clone it next to itself (label number + 1), ready to place the next device.
    onDoubleTap: () => {
      if (!canDuplicate) {
        uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
        return;
      }
      duplicate();
    },
    // Long press = select it (so it can be moved) and open its settings.
    onLongPress: () => {
      uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
      uiDispatch({ type: 'OPEN_OBJECT_DETAILS' });
    },
  });

  const displayColor = showStatusColors && obj.type !== 'text'
    ? (getStatusCategoryColor(obj.status) || obj.color || '#000000')
    : (obj.color || '#000000');
  
  const indicatorColor = obj.type !== 'text' ? (statusOf(obj.status)?.hex ?? null) : null;

  // --- Label: optional manual placement + dashed leader line back to the object ---
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState({ w: 0, h: 0 });
  const [dragLabelOffset, setDragLabelOffset] = useState<{ x: number; y: number } | null>(null);
  const labelDragRef = useRef<{
    pointerId: number; startX: number; startY: number; origin: { x: number; y: number }; moved: boolean;
  } | null>(null);
  const labelOffset = dragLabelOffset ?? obj.labelOffset ?? null;
  const labelText = objectLabel(obj, showMountHeight);
  const canMoveLabel = !isTech && !disableMovement && !layer.locked && tool === 'select';

  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    setLabelSize(s => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
  }, [obj.name, obj.mountHeightIn, showMountHeight, labelOffset !== null]);

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

  const planChange = obj.change && !isFill ? PLAN_CHANGE_BY_ID[obj.change] : null;
  /** Relocation ghost: the original spot, relative to this box, and where the arrow meets the box edge. */
  const ghost = (() => {
    if (obj.change !== 'RELOCATE' || !obj.changeOrigin) return null;
    const pos = dragPos ?? obj;
    const gx = (obj.changeOrigin.x - pos.x) * scale, gy = (obj.changeOrigin.y - pos.y) * scale;
    const dist = Math.hypot(gx, gy);
    if (dist < Math.max(boxW, boxH)) return null;
    // Stop the arrow at the box edge (ray from the centre towards the ghost).
    const t = Math.min(boxW / 2 / Math.abs(gx || 1e-9), boxH / 2 / Math.abs(gy || 1e-9));
    return { x: gx, y: gy, arrowEnd: { x: boxW / 2 + gx * t, y: boxH / 2 + gy * t } };
  })();

  /**
   * Requested move (a technician's pending request, or their draft): a dashed amber box at the
   * proposed spot, with an arrow from the object to it. The object stays put until the PM approves.
   */
  const requestedMove = (() => {
    const c = draftMove ?? obj.techRequest?.changes;
    if (!c || c.x === undefined || c.y === undefined) return null;
    const gx = (c.x - obj.x) * scale, gy = (c.y - obj.y) * scale;
    if (Math.hypot(gx, gy) < 1) return null;
    const t = Math.min(boxW / 2 / Math.abs(gx || 1e-9), boxH / 2 / Math.abs(gy || 1e-9));
    const start = { x: boxW / 2 + gx * Math.min(1, t), y: boxH / 2 + gy * Math.min(1, t) };
    return { x: gx, y: gy, start, draft: !!draftMove };
  })();

  /** Next 45° step (from whatever angle the object has now). */
  const rotateByStep = () => {
    const next = ((Math.round((obj.rotation || 0) / 45) + 1) * 45) % 360;
    dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { rotation: next } } });
  };

  /**
   * Rotate handle. A tap / click turns the object by 45°. With a mouse it can also be dragged round
   * (snapping to 45°); with a finger or stylus it is a push button only — dragging a small handle
   * round with a finger is fiddly and fights with panning.
   */
  const handleRotationPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTech || disableMovement) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.pointerType !== 'mouse' && Date.now() - selectedAtRef.current < ACTION_GUARD_MS) return;
    const handle = e.currentTarget;
    const rect = handle.parentElement?.getBoundingClientRect();
    if (!rect) return;
    handle.setPointerCapture(e.pointerId);
    setIsRotating(true);
    const pointerId = e.pointerId;
    const canDrag = e.pointerType === 'mouse';
    const start = { x: e.clientX, y: e.clientY };
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    let dragged = false;

    const onMove = (m: PointerEvent) => {
      if (m.pointerId !== pointerId || !canDrag) return;
      if (!dragged && Math.hypot(m.clientX - start.x, m.clientY - start.y) < 4) return;
      dragged = true;
      const degree = Math.atan2(m.clientY - center.y, m.clientX - center.x) * (180 / Math.PI) + 90;
      const snapped = ((Math.round(degree / 45) * 45) % 360 + 360) % 360;
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { rotation: snapped } } });
    };
    const onEnd = (u: PointerEvent, commit: boolean) => {
      if (u.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      setIsRotating(false);
      if (commit && !dragged) rotateByStep();
    };
    const onUp = (u: PointerEvent) => onEnd(u, true);
    const onCancel = (u: PointerEvent) => onEnd(u, false);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
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
        if (touchLayout && !draggedRef.current && Math.hypot(p.x - start.clientX, p.y - start.clientY) < TOUCH_DRAG_THRESHOLD_PX) {
          // Not a move yet: keep the object where it is.
          dragPosRef.current = { x: start.x, y: start.y, seq: (dragPosRef.current?.seq ?? 0) + 1 };
          setDragPos(dragPosRef.current);
          return;
        }
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
        const start = dragStartRef.current;
        dragStartRef.current = null;
        dragPosRef.current = null;
        setDragPos(null);
        dragStore.set(null);
        // No movement (a plain click) or movement not allowed: nothing to save.
        if (!pos || disableMovement || (start && pos.x === start.x && pos.y === start.y)) return;
        // A technician's move is a request: the object goes back, "send as request?" shows the proposal.
        if (isTech) {
          uiDispatch({ type: 'SET_TECH_REQUEST_DRAFT', payload: { objectId: obj.id, changes: { x: pos.x, y: pos.y } } });
          return;
        }
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
        if (Date.now() < ignoreClickUntilRef.current) return;
        if ((e.ctrlKey || e.metaKey) && !dragged) {
          uiDispatch({ type: 'TOGGLE_OBJECT_SELECTION', payload: obj.id });
        } else {
          uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id });
        }
      }}
      scale={1}
      // Not drag handles: react-draggable cancels their touchstart, which would swallow the button's click.
      cancel=".object-label, .object-action"
      bounds="parent"
      disableDragging={lockGeometry || (isTech && obj.type === 'path') || layer.locked || tool !== 'select' || isRotating || (touchLayout && !isSelected)}
      // Touch: no resize handles — they took most of a small icon and turned moves into resizes.
      enableResizing={isTech || lockGeometry || touchLayout ? {} : (!layer.locked && isSelected)}
      // re-resizable sizes the corner handles inline (20 px) — keep that as the grab area and draw a
      // small 8 px dot in its middle.
      resizeHandleClasses={{
        bottomRight: RESIZE_HANDLE_CLASS,
        bottomLeft:  RESIZE_HANDLE_CLASS,
        topRight:    RESIZE_HANDLE_CLASS,
        topLeft:     RESIZE_HANDLE_CLASS,
      }}
      className={cn(
        "group z-20",
        isFill && "is-fill", // a selection rectangle may start on a fill (see useMarquee)
        // Touch layout: a selected object takes the finger (moves); others let it pan the plan.
        touchLayout && isSelected && !lockGeometry && "touch-none",
        isSelected ? "ring-1 ring-primary ring-offset-1" : "",
        // While the bucket is active, clicks go through a fill to the blueprint (re-fill = recolour).
        // Route tool: clicks reach the plan, so a route can end on a device or rack.
        layer.locked || tool === 'route' || tool === 'wall' || tool === 'area' || (isFill && tool === 'fill') ? "pointer-events-none" : isFill ? "cursor-pointer" : "cursor-move"
      )}
      // Fills sit below regular objects and drawn paths. With its action bar, the object goes above the
      // cable-run preview and its length label (z 45–46) so they never cover the bar.
      style={{ opacity: (obj.opacity ?? 1) * (obj.change === 'REMOVE' ? 0.45 : 1), zIndex: showActionBar ? 47 : isSelected ? 30 : isFill ? 8 : 20 }}
    >
      {isSelected && !layer.locked && !lockGeometry && !touchLayout && (
        <div 
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-alias shadow-lg z-50 touch-none select-none active:scale-95 [@media(hover:hover)]:hover:scale-110 transition-transform",
            "-top-10 w-8 h-8"
          )}
          onPointerDown={handleRotationPointerDown}
          // Keep react-draggable (mouse / touch events on the object) from starting a move.
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title="Rotate 45° (tap) — with a mouse you can also drag it round"
          role="button"
          aria-label="Rotate 45 degrees"
          data-testid="rotate-handle"
        >
          <RotateCw className="w-4 h-4" />
        </div>
      )}
      {/* Touch layout: one bar of large actions, away from the object, instead of small handles on it. */}
      {showActionBar && (
        <div
          ref={actionBarRef}
          className="object-action absolute left-1/2 z-50 flex gap-1 rounded-xl border border-border bg-background p-1 shadow-lg touch-none select-none whitespace-nowrap"
          style={{
            transform: `translateX(calc(-50% + ${actionBarPlace.shift}px))`,
            ...(actionBarPlace.below
              ? { top: `calc(100% + ${ACTION_BAR_GAP_PX}px)` }
              : { bottom: `calc(100% + ${ACTION_BAR_GAP_PX}px)` }),
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          data-testid="object-action-bar"
        >
          {actions.map(a => (
            <button
              key={a.id}
              type="button"
              className={cn(
                "object-action flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] font-medium active:bg-muted",
                a.id === 'delete' ? "text-destructive" : "text-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - selectedAtRef.current < ACTION_GUARD_MS) return;
                a.run();
              }}
              aria-label={a.label}
              title={a.label}
              data-testid={`action-${a.id}`}
            >
              <a.icon className="w-4 h-4" />
              {a.short}
            </button>
          ))}
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

      {noCables && (
        <div
          className="absolute -bottom-1.5 -left-1.5 min-w-4 h-4 px-1 rounded-full border-2 border-white bg-amber-500 text-white text-[9px] font-bold leading-3 text-center shadow-sm z-50 pointer-events-none"
          title="No cables assigned"
          data-testid="no-cables-badge"
        >0</div>
      )}

      {idfColor && !isFill && (
        <div
          className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-50 pointer-events-none"
          style={{ backgroundColor: idfColor }}
          data-testid="idf-dot"
        />
      )}
      {planChange && (
        <div
          className="absolute -top-2 -right-2 min-w-4 h-4 px-0.5 rounded-full border border-white shadow-sm z-50 flex items-center justify-center pointer-events-none text-[8px] font-black text-white leading-none"
          style={{ backgroundColor: planChange.color }}
          title={planChange.label + (obj.changeNote ? ` — ${obj.changeNote}` : '')}
          data-testid="plan-change-badge"
        >
          {planChange.badge}
        </div>
      )}
      {obj.change === 'REMOVE' && (
        <svg className="absolute inset-0 overflow-visible pointer-events-none" width={boxW} height={boxH}>
          <line x1={0} y1={0} x2={boxW} y2={boxH} stroke={planChange!.color} strokeWidth={1.5} />
          <line x1={boxW} y1={0} x2={0} y2={boxH} stroke={planChange!.color} strokeWidth={1.5} />
        </svg>
      )}
      {ghost && (
        <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={boxW} height={boxH}>
          <defs>
            <marker id={`reloc-${obj.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={planChange!.color} />
            </marker>
          </defs>
          <rect x={ghost.x} y={ghost.y} width={boxW} height={boxH} fill="none" stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 2" />
          <line
            x1={ghost.x + boxW / 2} y1={ghost.y + boxH / 2} x2={ghost.arrowEnd.x} y2={ghost.arrowEnd.y}
            stroke={planChange!.color} strokeWidth={1.5} strokeDasharray="4 3" markerEnd={`url(#reloc-${obj.id})`}
          />
        </svg>
      )}

      {requestedMove && (
        <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={boxW} height={boxH} data-testid="requested-move">
          <defs>
            <marker id={`req-${obj.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={REQUEST_COLOR} />
            </marker>
          </defs>
          <rect x={requestedMove.x} y={requestedMove.y} width={boxW} height={boxH} rx={3}
            fill={REQUEST_COLOR} fillOpacity={0.12} stroke={REQUEST_COLOR} strokeWidth={1.5}
            strokeDasharray={requestedMove.draft ? '2 2' : '5 3'} />
          <line
            x1={requestedMove.start.x} y1={requestedMove.start.y} x2={requestedMove.x + boxW / 2} y2={requestedMove.y + boxH / 2}
            stroke={REQUEST_COLOR} strokeWidth={1.5} strokeDasharray="4 3" markerEnd={`url(#req-${obj.id})`}
          />
        </svg>
      )}
      {obj.techRequest && (
        <span
          className="absolute -top-2 -left-2 z-10 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow ring-1 ring-white pointer-events-none"
          style={{ backgroundColor: REQUEST_COLOR }}
          title={`Change request by ${obj.techRequest.byName}`}
          data-testid="request-badge"
        >
          R
        </span>
      )}

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
          "object-label absolute whitespace-nowrap border border-border px-1.5 py-0.5 rounded font-medium shadow-sm touch-none",
          // A detached label is opaque so the leader line visibly ends at its border.
          labelCenter ? "bg-white -translate-x-1/2 -translate-y-1/2" : cn("bg-white/80", LABEL_POSITION_CLASSES[obj.labelPosition ?? DEFAULT_LABEL_POSITION]),
          canMoveLabel && labelText ? "pointer-events-auto cursor-move" : "pointer-events-none",
          dragLabelOffset && "ring-1 ring-primary"
        )}
        style={{
          ...(labelCenter ? { left: labelCenter.x, top: labelCenter.y } : {}),
          // Same size relative to the plan as in the printed PDF, so overlaps show before printing.
          fontSize: Math.max(LABEL_MIN_PX, labelFontSize * scale),
        }}
        title={canMoveLabel && labelText ? 'Drag to move the label' : undefined}
        onPointerDown={handleLabelPointerDown}
        onPointerMove={handleLabelPointerMove}
        onPointerUp={handleLabelPointerUp}
        onPointerCancel={handleLabelPointerUp}
        onMouseDown={(e) => { if (canMoveLabel) e.stopPropagation(); }}
        onClick={(e) => e.stopPropagation()}
      >
        {labelText}
      </div>}
    </Rnd>
  );
});

ObjectRenderer.displayName = 'ObjectRenderer';
