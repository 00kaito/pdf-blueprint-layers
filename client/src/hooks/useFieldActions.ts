import {useCallback} from 'react';
import {useDocument, useUIDispatch} from '@/lib/editor-context';
import {useCurrentUser} from '@/hooks/useAuth';
import {useProjectOps} from '@/hooks/useProjectOps';
import {statusUpdate} from '@/core/status';
import type {EditorObject} from '@/lib/types';
import {useToast} from '@/hooks/use-toast';
import {applyChanges, hasChanges, splitChanges, type RequestChanges, type TechField, type TechOp} from '@shared/tech-ops';

type Status = NonNullable<EditorObject['status']>;
type LabelUpdates = Pick<EditorObject, 'labelPosition' | 'labelOffset'>;

/**
 * What both roles can do to objects on site, in one place: a PM edits the plan (saved with it);
 * a technician's status and label position show at once and go to the server as ops, and their
 * moves / renames / IDF changes become a request for the PM (after "send as request?").
 */
export const useFieldActions = () => {
  const { state: docState, dispatch } = useDocument();
  const { toast } = useToast();
  const permissions = docState.lvSettings.techPermissions;
  const objects = docState.objects;
  const uiDispatch = useUIDispatch();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const send = useProjectOps();

  /** `issueDescription` (optional) is saved together with the status, e.g. the phone's Issue popup. */
  const setStatus = useCallback((ids: string[], status: Status, issueDescription?: string) => {
    const updates = { ...statusUpdate(status, user?.username), ...(issueDescription !== undefined ? { issueDescription } : {}) };
    dispatch({ type: 'UPDATE_OBJECTS', payload: { ids, updates } });
    if (isTech) send(ids.map(objectId => ({ type: 'status' as const, objectId, status, issueDescription })));
  }, [dispatch, isTech, send, user?.username]);

  /** Issue text while typing (shown at once); a technician's goes to the server in `commitIssue`. */
  const setIssue = useCallback((ids: string[], issueDescription: string) => {
    dispatch({ type: 'UPDATE_OBJECTS', payload: { ids, updates: { issueDescription } } });
  }, [dispatch]);

  const commitIssue = useCallback((objects: EditorObject[], issueDescription: string) => {
    if (!isTech) return;
    send(objects.map(o => ({ type: 'status' as const, objectId: o.id, status: o.status ?? 'ISSUE', issueDescription })));
  }, [isTech, send]);

  const setLabelPosition = useCallback((ids: string[], updates: LabelUpdates) => {
    dispatch({ type: 'UPDATE_OBJECTS', payload: { ids, updates } });
    if (isTech && updates.labelPosition) {
      send(ids.map(objectId => ({ type: 'label' as const, objectId, labelPosition: updates.labelPosition! })));
    }
  }, [dispatch, isTech, send]);

  /** What this project lets a technician do with a field: 'off', 'request' (PM approves) or 'direct'. */
  const techMode = useCallback((field: TechField) => (isTech ? permissions[field] : 'direct'), [isTech, permissions]);

  /**
   * Sends a technician's changes as the project allows: what may change directly is changed (shown
   * at once, put back if the server refuses) and what needs approval becomes a request (with `note`).
   * Not allowed parts are refused with a message. The server checks the setting again.
   */
  const sendTechChanges = useCallback(async (objectId: string, changes: RequestChanges, note?: string): Promise<boolean> => {
    const split = splitChanges(changes, permissions);
    if (hasChanges(split.off)) toast({ variant: 'destructive', title: 'Not allowed', description: 'This project does not let technicians change that.' });
    const direct = hasChanges(split.direct);
    const ops: TechOp[] = [];
    if (direct) ops.push({ type: 'edit', objectId, changes: split.direct });
    if (hasChanges(split.request)) ops.push({ type: 'request', objectId, changes: split.request, note });
    if (!ops.length) return false;
    // The fields a technician can change (position, label, IDF, cables), as on `o`.
    const before = objects.find(x => x.id === objectId);
    const show = (o: Record<string, any>) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: objectId, updates: { x: o.x, y: o.y, name: o.name, metadata: o.metadata, cables: o.cables } } });
    if (direct && before) show(applyChanges(before, split.direct));
    const ok = await send(ops);
    if (!ok && direct && before) show(before);
    return ok;
  }, [permissions, objects, send, toast, dispatch]);

  /** A technician's move / rename / IDF change: handled by TechRequestDialog (applies / asks "send as request?"). */
  const requestChange = useCallback((objectId: string, changes: RequestChanges) => {
    uiDispatch({ type: 'SET_TECH_REQUEST_DRAFT', payload: { objectId, changes } });
  }, [uiDispatch]);

  return { isTech, setStatus, setIssue, commitIssue, setLabelPosition, requestChange, techMode, sendTechChanges, permissions, send };
};
