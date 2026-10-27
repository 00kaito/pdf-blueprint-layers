import React, {useEffect, useRef, useState} from 'react';
import {Loader2, Plus, Sparkles, Trash2} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {Progress} from '@/components/ui/progress';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {coverageObstacles, isCoverageArea, pathPoints} from '@/core/camera-coverage';
import {type CameraType, DEFAULT_CAMERA_TYPES, type PlacementInput} from '@/core/camera-placement';
import type {PlacementMessage} from '@/core/camera-placement.worker';
import {feetPerUnit} from '@/core/measure';

const SETTINGS_KEY = 'editor.cameraPlacement';
const DEFAULT_TARGET_PCT = 95;

type Settings = { types: CameraType[]; targetPct: number; removeExisting: boolean };

const loadSettings = (): Settings => {
  const fallback = { types: DEFAULT_CAMERA_TYPES, targetPct: DEFAULT_TARGET_PCT, removeExisting: false };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return saved && Array.isArray(saved.types) && saved.types.length ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
};

const saveSettings = (s: Settings) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
};

/** Number from an input; empty / invalid = `fallback`. */
const num = (v: string, fallback: number | null) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Types as entered, made usable: sane ranges, angle 10–360°, positive cost, whole max. */
const cleanTypes = (types: CameraType[]) => types.map(t => ({
  ...t,
  rangeFt: Math.min(200, Math.max(1, t.rangeFt || 1)),
  angleDeg: Math.min(360, Math.max(10, t.angleDeg || 10)),
  cost: Math.max(0.1, t.cost || 1),
  max: t.max == null ? null : Math.max(0, Math.round(t.max)),
}));

/**
 * Settings of the automatic camera placement: which camera types (range, angle, cost, most of
 * each), the coverage to reach. Runs the placement in a worker; the result is shown on the plan.
 */
export const AutoPlaceCamerasDialog = () => {
  const { state: docState } = useDocument();
  const { state: uiState, dispatch } = useUI();
  const placement = uiState.placement;
  const open = placement?.step === 'dialog';
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => () => workerRef.current?.terminate(), []);
  useEffect(() => { if (!open) { workerRef.current?.terminate(); workerRef.current = null; setProgress(null); } }, [open]);

  const ftPerUnit = feetPerUnit(docState.measureCalibration);
  const areas = docState.objects.filter(o => placement?.areaIds.includes(o.id) && isCoverageArea(o));
  const setType = (i: number, updates: Partial<CameraType>) =>
    setSettings(s => ({ ...s, types: s.types.map((t, k) => (k === i ? { ...t, ...updates } : t)) }));

  const close = () => dispatch({ type: 'SET_PLACEMENT', payload: null });

  const run = () => {
    if (!placement || !ftPerUnit) return;
    const types = cleanTypes(settings.types);
    if (!types.some(t => t.enabled)) { setError('Enable at least one camera type.'); return; }
    setError(null);
    const shown = new Set(docState.layers.filter(l => l.visible).map(l => l.id));
    const input: PlacementInput = {
      areas: areas.map(a => pathPoints(a.pathData!)),
      obstacles: coverageObstacles(docState.objects, shown),
      ftPerUnit, types, targetPct: Math.min(100, Math.max(1, settings.targetPct || DEFAULT_TARGET_PCT)),
    };
    const worker = new Worker(new URL('../../core/camera-placement.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setProgress(0);
    worker.onmessage = (e: MessageEvent<PlacementMessage>) => {
      if (e.data.type === 'progress') { setProgress(e.data.value); return; }
      worker.terminate();
      workerRef.current = null;
      setProgress(null);
      const result = e.data.result;
      if (!result.cameras.length) { setError('No camera position covers these areas.'); return; }
      dispatch({
        type: 'SET_PLACEMENT',
        payload: { ...placement, step: 'preview', types, result, removeExisting: settings.removeExisting },
      });
    };
    worker.onerror = () => {
      worker.terminate();
      workerRef.current = null;
      setProgress(null);
      setError('The placement failed. Try simpler areas or fewer camera types.');
    };
    worker.postMessage(input);
  };

  const cancelRun = () => { workerRef.current?.terminate(); workerRef.current = null; setProgress(null); };
  const running = progress !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-2xl" data-testid="auto-place-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Auto-place cameras</DialogTitle>
          <DialogDescription>
            As few cameras as possible covering {areas.length === 1 ? 'the selected area' : `the ${areas.length} selected areas`}.
            Regular cameras go on the edges, corners and drawn walls, 360° cameras in the middle. Cameras already on the plan are ignored.
          </DialogDescription>
        </DialogHeader>

        {!ftPerUnit ? (
          <p className="text-sm text-destructive">Set the scale first (measure tool): ranges are in feet.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1.25rem_1fr_4.5rem_4.5rem_4rem_4rem_2rem] gap-1.5 text-[10px] font-medium text-muted-foreground">
                <span /><span>Camera type</span><span>Range (ft)</span><span>Angle (°)</span><span>Cost</span><span>Max</span><span />
              </div>
              {settings.types.map((t, i) => (
                <div key={t.id} className="grid grid-cols-[1.25rem_1fr_4.5rem_4.5rem_4rem_4rem_2rem] items-center gap-1.5" data-testid="placement-type">
                  <Checkbox checked={t.enabled} onCheckedChange={(c) => setType(i, { enabled: c === true })} aria-label={`Use ${t.name}`} />
                  <Input className="h-8 text-xs" value={t.name} onChange={e => setType(i, { name: e.target.value })} />
                  <Input className="h-8 text-xs" type="number" inputMode="decimal" value={t.rangeFt}
                    onChange={e => setType(i, { rangeFt: num(e.target.value, 0)! })} />
                  <Input className="h-8 text-xs" type="number" inputMode="decimal" value={t.angleDeg}
                    onChange={e => setType(i, { angleDeg: num(e.target.value, 0)! })} />
                  <Input className="h-8 text-xs" type="number" inputMode="decimal" step="0.1" value={t.cost}
                    title="Relative price: at cost 2 a camera must cover twice as much to be picked"
                    onChange={e => setType(i, { cost: num(e.target.value, 0)! })} />
                  <Input className="h-8 text-xs" type="number" inputMode="numeric" placeholder="∞" value={t.max ?? ''}
                    title="Most cameras of this type (empty = no limit)"
                    onChange={e => setType(i, { max: num(e.target.value, null) })} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${t.name}`}
                    disabled={settings.types.length <= 1}
                    onClick={() => setSettings(s => ({ ...s, types: s.types.filter((_, k) => k !== i) }))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                  onClick={() => setSettings(s => ({ ...s, types: [...s.types, { ...DEFAULT_CAMERA_TYPES[0], id: crypto.randomUUID(), name: `Type ${s.types.length + 1}` }] }))}>
                  <Plus className="w-3.5 h-3.5" /> Type
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSettings(s => ({ ...s, types: DEFAULT_CAMERA_TYPES }))}>
                  Reset types
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="placement-target" className="text-xs">Coverage to reach</Label>
                <Input id="placement-target" className="h-8 w-20 text-xs" type="number" min={1} max={100} value={settings.targetPct}
                  onChange={e => setSettings(s => ({ ...s, targetPct: num(e.target.value, DEFAULT_TARGET_PCT)! }))} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="placement-remove" checked={settings.removeExisting}
                  onCheckedChange={(c) => setSettings(s => ({ ...s, removeExisting: c === true }))} />
                <Label htmlFor="placement-remove" className="text-xs font-normal cursor-pointer">Remove existing cameras in these areas when applying</Label>
              </div>
            </div>

            {running && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <Progress value={(progress ?? 0) * 100} className="h-2" />
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {running
            ? <Button variant="outline" onClick={cancelRun}>Stop</Button>
            : <Button variant="outline" onClick={close}>Cancel</Button>}
          <Button onClick={run} disabled={!ftPerUnit || running || !areas.length} className="gap-1.5" data-testid="placement-run">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Place cameras
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
