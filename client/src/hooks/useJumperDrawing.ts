import {useCallback, useEffect, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {useDocument, useUI} from '@/lib/editor-context';
import type {EditorAction, EditorObject} from '@/lib/types';
import type {Point} from '@/core/measure';
import {canHaveJumpers} from '@/core/jumpers';

/** A tap this close (screen px) to an object still picks it (small icons on a phone). */
const PICK_SLOP_PX = 6;

/** Topmost visible object under `p` that can be a jumper end (see canHaveJumpers). */
export const objectAt = (objects: EditorObject[], visibleLayers: Set<string>, p: Point, slop: number): EditorObject | undefined => {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (!canHaveJumpers(o) || !visibleLayers.has(o.layerId)) continue;
    if (p.x >= o.x - slop && p.x <= o.x + o.width + slop && p.y >= o.y - slop && p.y <= o.y + o.height + slop) return o;
  }
  return undefined;
};

/**
 * Jumper tool: click / tap the first object, optionally points on the plan the cable passes, then the
 * second object — the jumper is added with the cables picked in the tool's bar (the last ones used) and
 * selected, so they can still be changed right on the plan. Esc cancels the jumper being drawn, Backspace takes back a point.
 * `startJumperFrom` (the panel's "+ Jumper") begins at an object already chosen.
 */
export const useJumperDrawing = (containerRef: React.RefObject<HTMLDivElement>) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const active = uiState.tool === 'jumper';
  const draft = uiState.jumperDraft;
  const [hover, setHover] = useState<Point | null>(null);
  /** Object under the mouse that a click would pick (highlighted on the plan). */
  const [targetId, setTargetId] = useState<string | null>(null);
  const latest = useRef({ draft, scale: uiState.scale, objects: docState.objects, layers: docState.layers });
  latest.current = { draft, scale: uiState.scale, objects: docState.objects, layers: docState.layers };

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) / latest.current.scale, y: (clientY - rect.top) / latest.current.scale };
  }, [containerRef]);

  const setDraft = useCallback((d: typeof draft) => dispatch({ type: 'SET_JUMPER_DRAFT', payload: d }), [dispatch]);

  const onClick = useCallback((e: React.MouseEvent) => {
    const p = toCanvasPoint(e.clientX, e.clientY);
    if (!p) return;
    const visible = new Set(docState.layers.filter(l => l.visible).map(l => l.id));
    const hit = objectAt(docState.objects, visible, p, PICK_SLOP_PX / latest.current.scale);
    const d = latest.current.draft;
    if (!d) {
      if (hit) {
        setDraft({ fromId: hit.id, points: [] });
        dispatch({ type: 'SELECT_OBJECT', payload: hit.id });
      }
      return;
    }
    if (!hit) { setDraft({ ...d, points: [...d.points, p] }); return; }
    if (hit.id === d.fromId) return;
    const id = uuidv4();
    dispatch({
      type: 'ADD_JUMPER',
      payload: {
        fromId: d.fromId,
        jumper: { id, toId: hit.id, cables: uiState.jumperCables.map(c => ({ ...c })), status: 'PLANNED', ...(d.points.length ? { points: d.points } : {}) },
      },
    });
    setDraft(null);
    dispatch({ type: 'SELECT_OBJECT', payload: d.fromId });
    dispatch({ type: 'SELECT_JUMPER', payload: id });
  }, [toCanvasPoint, docState.layers, docState.objects, setDraft, dispatch, uiState.jumperCables]);

  useEffect(() => {
    if (!active) { setHover(null); setTargetId(null); return; }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const p = toCanvasPoint(e.clientX, e.clientY);
      const { objects, layers, draft: d, scale } = latest.current;
      const visible = new Set(layers.filter(l => l.visible).map(l => l.id));
      const hit = p ? objectAt(objects, visible, p, PICK_SLOP_PX / scale) : undefined;
      // The first end itself is no target for the second.
      setTargetId(hit && hit.id !== d?.fromId ? hit.id : null);
      if (d) setHover(p);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      const d = latest.current.draft;
      if (!d) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Not the Canvas' Delete / Backspace: that would delete the selected first object.
        e.preventDefault();
        e.stopImmediatePropagation();
        setDraft(d.points.length ? { ...d, points: d.points.slice(0, -1) } : null);
      } else if (e.key === 'Escape') {
        // Stop the Canvas' Esc (back to select): the first Esc only drops the jumper being drawn.
        e.stopImmediatePropagation();
        setDraft(null);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [active, toCanvasPoint, setDraft]);

  return { draft: active ? draft : null, hover: active && draft ? hover : null, targetId: active ? targetId : null, onClick, cancel: () => setDraft(null) };
};

/** The jumper tool, with its first end already chosen (the panel's "+ Jumper"). */
export const startJumperFrom = (dispatch: (a: EditorAction) => void, fromId: string) => {
  dispatch({ type: 'SET_TOOL', payload: 'jumper' });
  dispatch({ type: 'SET_JUMPER_DRAFT', payload: { fromId, points: [] } });
  dispatch({ type: 'SELECT_OBJECT', payload: fromId });
};
