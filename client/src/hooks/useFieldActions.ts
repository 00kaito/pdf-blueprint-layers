import {useCallback} from 'react';
import {useDocument, useUIDispatch} from '@/lib/editor-context';
import {useCurrentUser} from '@/hooks/useAuth';
import {useProjectOps} from '@/hooks/useProjectOps';
import {statusUpdate} from '@/core/status';
import type {EditorObject} from '@/lib/types';
import type {RequestChanges} from '@shared/tech-ops';

type Status = NonNullable<EditorObject['status']>;
type LabelUpdates = Pick<EditorObject, 'labelPosition' | 'labelOffset'>;

/**
 * What both roles can do to objects on site, in one place: a PM edits the plan (saved with it);
 * a technician's status and label position show at once and go to the server as ops, and their
 * moves / renames / IDF changes become a request for the PM (after "send as request?").
 */
export const useFieldActions = () => {
  const { dispatch } = useDocument();
  const uiDispatch = useUIDispatch();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const send = useProjectOps();

  const setStatus = useCallback((ids: string[], status: Status) => {
    dispatch({ type: 'UPDATE_OBJECTS', payload: { ids, updates: statusUpdate(status, user?.username) } });
    if (isTech) send(ids.map(objectId => ({ type: 'status' as const, objectId, status })));
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

  /** A technician's move / rename / IDF change: asks "send as request?" (TechRequestDialog). */
  const requestChange = useCallback((objectId: string, changes: RequestChanges) => {
    uiDispatch({ type: 'SET_TECH_REQUEST_DRAFT', payload: { objectId, changes } });
  }, [uiDispatch]);

  return { isTech, setStatus, setIssue, commitIssue, setLabelPosition, requestChange, send };
};
