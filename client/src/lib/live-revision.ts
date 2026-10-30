/**
 * Revision of each open project as this tab last saw it (bumped by the server on every save / op),
 * so polling fetches the plan only when someone else changed it.
 */
const revisions = new Map<string, number>();

export const getRevision = (projectId: string) => revisions.get(projectId);

export const setRevision = (projectId: string, revision: number | undefined) => {
  if (typeof revision === 'number') revisions.set(projectId, revision);
};
