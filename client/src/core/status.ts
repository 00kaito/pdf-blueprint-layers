import type { EditorObject } from '@/lib/types';

export type ObjectStatus = NonNullable<EditorObject['status']>;

/** Installation progress statuses, in workflow order: one list for every panel, the plan and the PDF. */
export const STATUSES: { id: ObjectStatus; label: string; short: string; dot: string; hex: string }[] = [
  { id: 'PLANNED', label: 'Planned', short: 'Planned', dot: 'bg-red-400', hex: '#f87171' },
  { id: 'CABLE_PULLED', label: 'Cable Pulled', short: 'Cable', dot: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'TERMINATED', label: 'Terminated', short: 'Term.', dot: 'bg-purple-500', hex: '#a855f7' },
  { id: 'TESTED', label: 'Tested', short: 'Tested', dot: 'bg-green-400', hex: '#4ade80' },
  { id: 'APPROVED', label: 'Approved', short: 'Approved', dot: 'bg-green-600', hex: '#16a34a' },
  { id: 'ISSUE', label: 'Issue', short: 'Issue', dot: 'bg-red-600', hex: '#dc2626' },
];

export const statusOf = (id?: string) => STATUSES.find(s => s.id === id);

/** Status change with who / when, as every status button records it. */
export const statusUpdate = (status: ObjectStatus, username?: string) => ({
  status,
  statusUpdatedAt: new Date().toISOString(),
  statusUpdatedBy: username || 'Unknown',
});
