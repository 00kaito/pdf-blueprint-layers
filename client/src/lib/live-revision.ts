import type {SyncedDoc} from './merge-state';

/**
 * Revision of each open project as this tab last saw it (bumped by the server on every save / op),
 * so polling fetches the plan only when someone else changed it.
 */
const revisions = new Map<string, number>();

export const getRevision = (projectId: string) => revisions.get(projectId);

export const setRevision = (projectId: string, revision: number | undefined) => {
  if (typeof revision === 'number') revisions.set(projectId, revision);
};

/**
 * The plan as this tab last had it in common with the server (opened, saved or merged) and its
 * revision: the ancestor for merging others' changes, and what a save says it is based on.
 */
const bases = new Map<string, { revision: number; doc: SyncedDoc }>();

export const getBase = (projectId: string) => bases.get(projectId);

export const setBase = (projectId: string, revision: number, doc: SyncedDoc) => {
  bases.set(projectId, { revision, doc });
  setRevision(projectId, revision);
};
