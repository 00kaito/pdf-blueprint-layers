import React, {useCallback, useEffect, useMemo} from 'react';
import {v4 as uuidv4} from 'uuid';
import {ArrowLeft, Check, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {LvIcon} from '@/components/editor/LvIcon';
import {COVERAGE_AREA_LAYER_NAME, FILL_LAYER_NAME, useDocument, useUI} from '@/lib/editor-context';
import type {EditorObject} from '@/lib/types';
import {insidePolygon, isCamera, pathPoints} from '@/core/camera-coverage';
import {placementObjects} from '@/core/camera-placement';
import {DEFAULT_ICON_SIZE} from '@/core/constants';

const isSpecialLayer = (name: string) =>
  [COVERAGE_AREA_LAYER_NAME, FILL_LAYER_NAME].some(n => n.toLowerCase() === name.trim().toLowerCase());

/**
 * The auto-placement proposal as plan objects. `preview` uses placeholder ids on a visible layer
 * (for drawing); `apply` adds real cameras in one undo step.
 */
export const usePlacementProposal = () => {
  const { state: docState } = useDocument();
  const { state: uiState, dispatch } = useUI();
  const placement = uiState.placement;

  const build = useCallback((layerId: string, newId: (i: number) => string) => {
    if (!placement?.result) return null;
    const placed = [...docState.objects].reverse().filter(o => o.type === 'icon' && !o.isFill);
    // Same size as cameras already on the plan (as adding one by hand does).
    const size = (content: string) =>
      (placed.find(o => o.content === content) ?? placed.find(isCamera) ?? placed[0])?.width ?? DEFAULT_ICON_SIZE / uiState.scale;
    const cables = (content: string) => docState.lvSettings.cableDefaults[content]?.map(c => ({ ...c }));
    return placementObjects(placement.result, placement.types, placement.areaIds, { layerId, size, cables, newId });
  }, [placement, docState.objects, docState.lvSettings, uiState.scale]);

  const preview = useMemo(() => {
    if (placement?.step !== 'preview') return null;
    const layer = docState.layers.find(l => l.visible) ?? docState.layers[0];
    return layer ? build(layer.id, i => `placement-preview-${i}`) : null;
  }, [placement?.step, docState.layers, build]);

  const apply = useCallback(() => {
    if (!placement) return;
    const layer = docState.layers.find(l => l.id === uiState.activeLayerId && !isSpecialLayer(l.name))
      ?? docState.layers.find(l => !isSpecialLayer(l.name))
      ?? docState.layers[0];
    const built = layer && build(layer.id, () => uuidv4());
    if (!built) return;
    let removeIds: string[] = [];
    if (placement.removeExisting) {
      const outlines = docState.objects.filter(o => placement.areaIds.includes(o.id)).map(o => pathPoints(o.pathData!));
      removeIds = docState.objects
        .filter(o => isCamera(o) && outlines.some(a => insidePolygon({ x: o.x + o.width / 2, y: o.y + o.height / 2 }, a)))
        .map(o => o.id);
    }
    dispatch({ type: 'APPLY_CAMERA_PLACEMENT', payload: { ...built, removeIds } });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  }, [placement, docState.layers, docState.objects, uiState.activeLayerId, build, dispatch]);

  return { preview, apply };
};

/**
 * Objects the coverage layer shows during the preview: the plan without its cameras (they are
 * ignored by the placement), the proposed cameras and the areas assigned to them.
 */
export const previewCoverageObjects = (objects: EditorObject[], preview: { cameras: EditorObject[]; areaCameras: Record<string, string[]> }) => [
  ...objects.filter(o => !isCamera(o)).map(o => (preview.areaCameras[o.id] ? { ...o, coverageCameraIds: preview.areaCameras[o.id] } : o)),
  ...preview.cameras,
];

/** Proposed cameras drawn over the plan (see-through, not clickable) and the bar to apply or drop them. */
export const PlacementPreview = ({ cameras, scale, onApply }: { cameras: EditorObject[]; scale: number; onApply: () => void }) => {
  const { state: uiState, dispatch } = useUI();
  const placement = uiState.placement;
  const cancel = useCallback(() => dispatch({ type: 'SET_PLACEMENT', payload: null }), [dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
    };
    // Capture: the canvas' own Esc handling must not run as well.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cancel]);

  if (!placement?.result) return null;
  const { result, types } = placement;
  const perType = types
    .map(t => ({ t, n: result.cameras.filter(c => c.typeId === t.id).length }))
    .filter(({ n }) => n > 0)
    .map(({ t, n }) => `${n}× ${t.name}`)
    .join(', ');

  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 48 }} data-testid="placement-preview">
        {cameras.map(c => (
          <div
            key={c.id}
            className="absolute rounded-full ring-2 ring-primary ring-offset-1 bg-white/70"
            style={{
              left: c.x * scale, top: c.y * scale, width: c.width * scale, height: c.height * scale,
              transform: `rotate(${c.rotation || 0}deg)`,
            }}
          >
            <LvIcon type={c.content!} className="w-full h-full text-primary" />
          </div>
        ))}
      </div>
      <div
        className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl"
        data-testid="placement-bar"
      >
        <span className="font-medium">{result.cameras.length} camera{result.cameras.length === 1 ? '' : 's'}</span>
        <span className="text-muted-foreground">({perType})</span>
        <span>· {result.coveredPct.toFixed(1)}% covered</span>
        {result.unreachablePct >= 0.5 && (
          <span className="text-muted-foreground" title="No allowed camera position sees these parts (edges / walls for regular cameras, the middle for 360°)">
            · {result.unreachablePct.toFixed(1)}% out of reach
          </span>
        )}
        {placement.removeExisting && <span className="text-destructive">· replaces existing cameras</span>}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'SET_PLACEMENT', payload: { ...placement, step: 'dialog' } })}>
          <ArrowLeft className="h-4 w-4" /> Settings
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={cancel}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onApply} data-testid="placement-apply">
          <Check className="h-4 w-4" /> Apply
        </Button>
      </div>
    </>
  );
};
