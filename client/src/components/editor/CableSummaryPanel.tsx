import React, {useMemo, useState} from 'react';
import {AlertTriangle} from 'lucide-react';
import {useDocument, useUI} from '@/lib/editor-context';
import {CableType, EditorObject} from '@/lib/types';
import {buildCableSummary, isCableDevice, ProgressBucket, rackColorMap, RackSummary} from '@/core/cable-routing';
import {CABLE_LABEL, CABLE_TYPES, deviceKey, objectTypeName} from '@/core/lv-icons';
import {PLAN_CHANGES} from '@/core/plan-change';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Button} from '@/components/ui/button';
import {useCurrentUser} from '@/hooks/useAuth';
import {cn} from '@/lib/utils';

const BUCKETS: { id: ProgressBucket; label: string }[] = [
  { id: 'planned', label: 'Planned' },
  { id: 'pulled', label: 'Pulled' },
  { id: 'terminated', label: 'Terminated' },
  { id: 'tested', label: 'Tested / approved' },
  { id: 'issue', label: 'Issue' },
];

const ft = (n: number) => `${Math.round(n).toLocaleString()} ft`;

const ALL = 'all';
/** Device type of a cable device: its icon / library image (inline images share one bucket). */
const typeKey = (o: EditorObject) => deviceKey(o) ?? 'other';

const NumberSetting = ({ label, value, onChange, disabled }: {
  label: string; value: number; onChange: (v: number) => void; disabled?: boolean;
}) => (
  <div className="space-y-1">
    <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
    <Input
      type="number" min={0} value={value} disabled={disabled}
      onChange={(e) => { const n = parseFloat(e.target.value); if (n >= 0) onChange(n); }}
      className="h-8 text-xs"
    />
  </div>
);

/** Bill of materials for the low-voltage install: drops, patch panels and cable lengths per rack. */
export const CableSummaryPanel = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { data: user } = useCurrentUser();
  const readOnly = user?.role === 'TECH';
  const open = uiState.cableSummaryOpen;
  const s = docState.lvSettings;

  // Device types on the plan (cable devices), for the filter: key = icon / image, label = its type name.
  const deviceTypes = useMemo(() => {
    const byKey = new Map<string, { label: string; count: number }>();
    for (const o of docState.objects) {
      if (!isCableDevice(o) || o.change === 'REMOVE') continue;
      const key = typeKey(o);
      const t = byKey.get(key) ?? { label: objectTypeName(o, docState.customIcons), count: 0 };
      t.count += 1;
      byKey.set(key, t);
    }
    return Array.from(byKey, ([key, t]) => ({ key, ...t })).sort((a, b) => a.label.localeCompare(b.label));
  }, [docState.objects, docState.customIcons]);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  // The filtered type was removed from the plan: back to all devices.
  const filter = deviceTypes.some(t => t.key === typeFilter) ? typeFilter : ALL;
  const filterLabel = deviceTypes.find(t => t.key === filter)?.label;

  const summary = useMemo(
    () => open
      ? buildCableSummary(docState.objects, docState.cableRoutes, docState.measureCalibration, s,
        filter === ALL ? undefined : (o) => typeKey(o) === filter)
      : null,
    [open, docState.objects, docState.cableRoutes, docState.measureCalibration, s, filter],
  );

  const rackColors = useMemo(() => rackColorMap(docState.objects), [docState.objects]);
  const close = () => dispatch({ type: 'SET_CABLE_SUMMARY_OPEN', payload: false });
  const select = (ids: string[]) => {
    dispatch({ type: 'SET_SELECTION', payload: ids });
    close();
  };

  // Only the cable types the project uses.
  const types: CableType[] = summary
    ? CABLE_TYPES.map(t => t.id).filter(t => summary.total.cables[t].count > 0 || summary.removed[t].count > 0)
    : [];
  const hasRacks = !!summary && summary.racks.some(r => r.rackId !== null);

  const rackRow = (r: RackSummary, total = false) => {
    const deviceIds = total || !summary ? [] : docState.objects
      .filter(o => summary.runs.get(o.id)?.rackId === r.rackId && o.change !== 'REMOVE' && (filter === ALL || typeKey(o) === filter))
      .map(o => o.id);
    return (
      <tr
        key={r.rackId ?? (total ? 'total' : 'none')}
        className={cn("border-t border-border", total ? "font-semibold bg-muted/40" : r.rackId && "hover:bg-muted/30 cursor-pointer")}
        onClick={r.rackId && !total ? () => select([r.rackId!, ...deviceIds]) : undefined}
        title={r.rackId && !total ? 'Select the rack and its devices' : undefined}
      >
        <td className="py-1.5 pr-2 whitespace-nowrap">
          {r.rackId && rackColors.has(r.rackId) && (
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: rackColors.get(r.rackId) }} />
          )}
          {total && filterLabel ? `${filterLabel} total` : r.name}
          {r.estimated > 0 && summary?.hasScale && (
            <span className="ml-1 text-[10px] font-normal text-amber-600" title="Devices with no cable route to the rack — length estimated">
              ({r.estimated} est.)
            </span>
          )}
        </td>
        <td className="py-1.5 px-2 text-right">{r.devices}</td>
        {types.map(t => (
          <td key={t} className="py-1.5 px-2 text-right whitespace-nowrap">
            {r.cables[t].count}
            {summary?.hasScale && r.cables[t].count > 0 && (
              <div className="text-[10px] font-normal text-muted-foreground">{ft(r.cables[t].feet)}</div>
            )}
          </td>
        ))}
        <td className="py-1.5 px-2 text-right">{r.patchPanels}</td>
        <td className="py-1.5 pl-2 text-right">
          {summary?.hasScale && r.cables.CAT6.feet > 0 ? Math.ceil(r.cables.CAT6.feet / s.boxLengthFt) : '—'}
        </td>
      </tr>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="cable-summary">
        <DialogHeader>
          <DialogTitle>Cable summary</DialogTitle>
          <DialogDescription>
            Home runs from every device to its rack along the drawn cable routes. Points marked “to be removed” are left out.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Ports / patch panel</Label>
            <Select
              value={String(s.portsPerPanel)} disabled={readOnly}
              onValueChange={(v) => dispatch({ type: 'SET_LV_SETTINGS', payload: { portsPerPanel: Number(v) as 24 | 48 } })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberSetting label="Rack service loop (ft)" value={s.serviceLoopFt} disabled={readOnly}
            onChange={(v) => dispatch({ type: 'SET_LV_SETTINGS', payload: { serviceLoopFt: v } })} />
          <NumberSetting label="Device slack + drop (ft)" value={s.deviceSlackFt} disabled={readOnly}
            onChange={(v) => dispatch({ type: 'SET_LV_SETTINGS', payload: { deviceSlackFt: v } })} />
          <NumberSetting label="Cat6 box (ft)" value={s.boxLengthFt} disabled={readOnly}
            onChange={(v) => v > 0 && dispatch({ type: 'SET_LV_SETTINGS', payload: { boxLengthFt: v } })} />
        </div>

        {summary && (!hasRacks || !summary.hasScale) && (
          <div className="flex gap-2 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              {!hasRacks && <div>No rack on the plan — place a <b>Rack / IDF</b> icon (Low Voltage icons) to get patch panels and lengths per rack.</div>}
              {!summary.hasScale && <div>No measuring scale — set it with the probe to get cable lengths.</div>}
            </div>
          </div>
        )}

        {summary && deviceTypes.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-[10px] uppercase text-muted-foreground whitespace-nowrap">Device type</Label>
            <Select value={filter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-56" data-testid="cable-summary-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All devices</SelectItem>
                {deviceTypes.map(t => (
                  <SelectItem key={t.key} value={t.key}>{t.label} ({t.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {summary && (
          <>
            <section className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Per rack{filterLabel && <span className="normal-case font-normal"> — {filterLabel} only</span>}
              </h4>
              {types.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No cables yet — set them on the devices (Object Properties → Cables).</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="cable-summary-racks">
                    <thead className="text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium pb-1 pr-2">Rack</th>
                        <th className="text-right font-medium pb-1 px-2">Devices</th>
                        {types.map(t => <th key={t} className="text-right font-medium pb-1 px-2">{CABLE_LABEL[t]}</th>)}
                        <th className="text-right font-medium pb-1 px-2">Patch panels ({s.portsPerPanel}p)</th>
                        <th className="text-right font-medium pb-1 pl-2">Cat6 boxes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Filtered: only the racks serving that device type. */}
                      {summary.racks.filter(r => filter === ALL || r.devices > 0).map(r => rackRow(r))}
                      {(summary.racks.length > 1 || filter !== ALL) && rackRow(summary.total, true)}
                    </tbody>
                  </table>
                </div>
              )}
              {summary.total.cables.CAT6.count > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Switch ports: {summary.total.cables.CAT6.count} (≈ {Math.ceil(summary.total.cables.CAT6.count / 48)}× 48-port
                  or {Math.ceil(summary.total.cables.CAT6.count / 24)}× 24-port). Lengths include {s.deviceSlackFt} ft at the device and {s.serviceLoopFt} ft in the rack per cable.
                </p>
              )}
            </section>

            {types.length > 0 && (
              <section className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress (cables)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium pb-1 pr-2">Type</th>
                        {BUCKETS.map(b => <th key={b.id} className="text-right font-medium pb-1 px-2">{b.label}</th>)}
                        <th className="text-right font-medium pb-1 pl-2">Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {types.filter(t => summary.total.cables[t].count > 0).map(t => {
                        const p = summary.progress[t];
                        const all = BUCKETS.reduce((n, b) => n + p[b.id], 0);
                        return (
                          <tr key={t} className="border-t border-border">
                            <td className="py-1.5 pr-2">{CABLE_LABEL[t]}</td>
                            {BUCKETS.map(b => (
                              <td key={b.id} className={cn("py-1.5 px-2 text-right", b.id === 'issue' && p.issue > 0 && "text-red-600 font-semibold")}>
                                {p[b.id]}
                              </td>
                            ))}
                            <td className="py-1.5 pl-2 text-right font-medium">{all ? Math.round(p.tested / all * 100) : 0}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Devices without cables</h4>
              {summary.noCables.length > 0 ? (
                <Button
                  variant="outline" size="sm" data-testid="no-cables"
                  className="h-8 gap-1.5 text-xs border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                  onClick={() => select(summary.noCables)} title="Select them to set their cables in one go"
                >
                  ⚠ No cables: <span className="font-semibold">{summary.noCables.length}</span>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="no-cables">All devices have cables ✓</p>
              )}
            </section>

            <section className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan changes</h4>
              <div className="flex flex-wrap gap-2">
                {PLAN_CHANGES.map(c => {
                  const ids = summary.changes[c.id];
                  return (
                    <Button
                      key={c.id} variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                      disabled={ids.length === 0} onClick={() => select(ids)}
                      title={ids.length ? 'Select these points' : undefined}
                    >
                      <span className="font-black" style={{ color: c.color }}>{c.badge}</span>
                      {c.label}: <span className="font-semibold">{ids.length}</span>
                    </Button>
                  );
                })}
              </div>
              {types.some(t => summary.removed[t].count > 0) && (
                <p className="text-[10px] text-muted-foreground">
                  Not counted (to be removed): {types.filter(t => summary.removed[t].count > 0).map(t => `${summary.removed[t].count}× ${CABLE_LABEL[t]}`).join(', ')}
                </p>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
