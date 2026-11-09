import React from 'react';
import {useDocument} from '@/lib/editor-context';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {TECH_FIELDS, type TechField, type TechFieldMode} from '@shared/tech-ops';

const FIELD_LABELS: Record<TechField, { label: string; hint: string }> = {
  move: { label: 'Location', hint: 'Move objects on the plan' },
  label: { label: 'Label', hint: 'Object name shown on the plan' },
  cables: { label: 'Cables', hint: 'Cable types and counts of a device' },
  idf: { label: 'IDF', hint: 'Which IDF / rack a device home-runs to' },
};

const MODES: { id: TechFieldMode; label: string }[] = [
  { id: 'off', label: 'Not allowed' },
  { id: 'request', label: 'Change request' },
  { id: 'direct', label: 'Without approval' },
];

/**
 * Project setting (PM / admin): what technicians may change in this project and whether it needs
 * the PM's approval. Saved with the plan; the server enforces it on every technician change.
 */
export const TechPermissionsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { state: docState, dispatch } = useDocument();
  const permissions = docState.lvSettings.techPermissions;
  const set = (field: TechField, mode: TechFieldMode) =>
    dispatch({ type: 'SET_LV_SETTINGS', payload: { techPermissions: { ...permissions, [field]: mode } } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="tech-permissions-dialog">
        <DialogHeader>
          <DialogTitle>Technician permissions</DialogTitle>
          <DialogDescription>
            What technicians may change in this project. A change request waits for a PM's (or admin's)
            approval; without approval the change goes straight into the plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {TECH_FIELDS.map(field => (
            <div key={field} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{FIELD_LABELS[field].label}</span>
                <span className="text-[11px] text-muted-foreground">{FIELD_LABELS[field].hint}</span>
              </div>
              <div className="grid grid-cols-3 rounded-md border overflow-hidden" role="radiogroup" aria-label={FIELD_LABELS[field].label}>
                {MODES.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={permissions[field] === m.id}
                    onClick={() => set(field, m.id)}
                    className={cn(
                      "px-2 py-1.5 text-xs border-r last:border-r-0 transition-colors",
                      permissions[field] === m.id ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted",
                    )}
                    data-testid={`tech-perm-${field}-${m.id}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Status, photos, comments and label position on the plan are always open to technicians.
          Requests already waiting stay until approved or rejected.
        </p>
      </DialogContent>
    </Dialog>
  );
};
