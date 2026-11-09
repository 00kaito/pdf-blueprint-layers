import type { EditorObject } from '@/lib/types';

export type ObjectStatus = NonNullable<EditorObject['status']>;

/**
 * Installation progress statuses, in workflow order: one list for every panel, the plan and the PDF.
 * `APPROVED` is shown as "Done" (the id stays so saved projects keep working).
 */
export const STATUSES: { id: ObjectStatus; label: string; short: string; dot: string; text: string; hex: string }[] = [
  { id: 'PLANNED', label: 'Planned', short: 'Planned', dot: 'bg-red-400', text: 'text-red-400', hex: '#f87171' },
  { id: 'CABLE_PULLED', label: 'Cable Pulled', short: 'Pulled', dot: 'bg-blue-500', text: 'text-blue-500', hex: '#3b82f6' },
  { id: 'TERMINATED', label: 'Terminated', short: 'Terminated', dot: 'bg-purple-500', text: 'text-purple-500', hex: '#a855f7' },
  { id: 'TESTED', label: 'Tested', short: 'Tested', dot: 'bg-green-400', text: 'text-green-500', hex: '#4ade80' },
  { id: 'APPROVED', label: 'Done', short: 'Done', dot: 'bg-green-700', text: 'text-green-700', hex: '#15803d' },
  { id: 'ISSUE', label: 'Issue', short: 'Issue', dot: 'bg-red-600', text: 'text-red-600', hex: '#dc2626' },
];

export const statusOf = (id?: string) => STATUSES.find(s => s.id === id);

/** Status change with who / when, as every status button records it. */
export const statusUpdate = (status: ObjectStatus, username?: string) => ({
  status,
  statusUpdatedAt: new Date().toISOString(),
  statusUpdatedBy: username || 'Unknown',
});
