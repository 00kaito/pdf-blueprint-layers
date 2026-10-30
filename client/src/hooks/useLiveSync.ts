import {useEffect, useRef} from 'react';
import {useDocument} from '@/lib/editor-context';
import {getRevision, setRevision} from '@/lib/live-revision';
import {useCurrentUser} from '@/hooks/useAuth';
import type {EditorObject} from '@/lib/types';

/** How often an open plan checks the server for others' changes. */
export const LIVE_SYNC_INTERVAL_MS = 15000;

/**
 * Keeps an open plan up to date with what others do: a PM picks up technicians' requests, comments,
 * photos and statuses (their own edits stay); a technician — who never saves the plan — takes the
 * whole plan (PM's edits and decisions). Polls while the tab is visible, and right when it becomes visible.
 */
export const useLiveSync = () => {
  const { state: docState, dispatch } = useDocument();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const projectId = docState.projectId;
  const busyRef = useRef(false);

  useEffect(() => {
    if (!projectId || !user) return;
    let stopped = false;
    const tick = async () => {
      if (busyRef.current || document.visibilityState !== 'visible') return;
      busyRef.current = true;
      try {
        const rev = getRevision(projectId);
        const res = await fetch(`/api/projects/${projectId}/live?rev=${rev ?? ''}`, { credentials: 'include' });
        if (!res.ok || stopped) return;
        const data = await res.json() as { revision: number; state?: Record<string, any> };
        // Ours, or nothing new: the revision is all that came back.
        if (!data.state) { setRevision(projectId, data.revision); return; }
        const objects = (data.state.objects ?? []) as EditorObject[];
        if (isTech) {
          const { layers, cableRoutes, lvSettings, measureCalibration, exportSettings } = data.state;
          dispatch({
            type: 'APPLY_REMOTE',
            payload: { mode: 'sync', objects, doc: { layers, cableRoutes: cableRoutes ?? [], lvSettings, measureCalibration: measureCalibration ?? null, exportSettings } },
          });
        } else {
          dispatch({ type: 'APPLY_REMOTE', payload: { mode: 'fieldwork', objects } });
        }
        setRevision(projectId, data.revision);
      } catch {
        // Offline for a moment: the next tick tries again.
      } finally {
        busyRef.current = false;
      }
    };
    const id = setInterval(tick, LIVE_SYNC_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [projectId, user, isTech, dispatch]);
};
