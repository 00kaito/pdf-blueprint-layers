import type {PlanChange} from '@/lib/types';

/**
 * Design changes, tracked apart from the install progress (`status`): a point whose cable is
 * already pulled can still be marked to be relocated.
 */
export const PLAN_CHANGES: { id: PlanChange; label: string; badge: string; color: string }[] = [
  { id: 'RELOCATE', label: 'To be relocated', badge: '↔', color: '#f59e0b' },
  { id: 'REMOVE', label: 'To be removed', badge: '✕', color: '#dc2626' },
  { id: 'NEW', label: 'Added (revision)', badge: '+', color: '#0ea5e9' },
  { id: 'ON_HOLD', label: 'On hold', badge: '❚❚', color: '#6b7280' },
];

export const PLAN_CHANGE_BY_ID = Object.fromEntries(PLAN_CHANGES.map(c => [c.id, c])) as Record<PlanChange, typeof PLAN_CHANGES[number]>;
