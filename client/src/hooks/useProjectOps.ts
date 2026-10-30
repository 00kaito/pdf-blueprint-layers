import {useCallback} from 'react';
import {useDocument} from '@/lib/editor-context';
import {apiRequest} from '@/lib/queryClient';
import {setRevision} from '@/lib/live-revision';
import {useToast} from '@/hooks/use-toast';
import {useCurrentUser} from '@/hooks/useAuth';
import {applyChanges, isManager, type TechOp} from '@shared/tech-ops';
import type {EditorObject} from '@/lib/types';

/** "409: {"message":"…"}" → "…". */
const messageOf = (e: unknown) => {
  const raw = e instanceof Error ? e.message : String(e);
  const json = raw.replace(/^\d+:\s*/, '');
  try { return JSON.parse(json).message ?? json; } catch { return json; }
};

/**
 * Sends ops (shared/tech-ops) to the server and takes the changed objects back. A technician takes
 * them whole; a PM only the server's fields (their own unsaved edits stay), plus the changes of the
 * requests they approved, applied as a normal (undoable, saved) edit.
 * Resolves to true when the server accepted the ops.
 */
export const useProjectOps = () => {
  const { state: docState, dispatch } = useDocument();
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const projectId = docState.projectId;
  const objects = docState.objects;
  const manager = isManager(user?.role);

  return useCallback(async (ops: TechOp[]): Promise<boolean> => {
    if (!projectId) {
      toast({ variant: 'destructive', title: 'Not available', description: 'Open a project saved on the server first.' });
      return false;
    }
    if (ops.length === 0) return true;
    // Approved requests: what to apply to this plan once the server agreed.
    const approved = ops.flatMap(op => {
      if (op.type !== 'resolve' || !op.approve) return [];
      const o = objects.find(obj => obj.id === op.objectId);
      return o?.techRequest ? [{ o, changes: o.techRequest.changes }] : [];
    });
    try {
      const res = await apiRequest('POST', `/api/projects/${projectId}/ops`, { ops });
      const data = await res.json() as { revision: number; objects: EditorObject[] };
      setRevision(projectId, data.revision);
      dispatch({ type: 'APPLY_REMOTE', payload: { mode: manager ? 'fieldwork' : 'patch', objects: data.objects } });
      for (const { o, changes } of approved) {
        const next = applyChanges(o, changes);
        dispatch({ type: 'UPDATE_OBJECT', payload: { id: o.id, updates: { x: next.x, y: next.y, name: next.name, metadata: next.metadata } } });
      }
      return true;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not send', description: messageOf(e) });
      return false;
    }
  }, [projectId, objects, manager, dispatch, toast]);
};
