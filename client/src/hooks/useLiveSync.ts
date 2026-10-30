import {useEffect, useRef} from 'react';
import {useDocument} from '@/lib/editor-context';
import {getRevision, setRevision} from '@/lib/live-revision';
import {useCurrentUser} from '@/hooks/useAuth';
import {useRemoteMerge} from '@/hooks/useRemoteMerge';
import type {EditorObject} from '@/lib/types';

/** Backup check for others' changes, when the live connection is down (proxy, network). */
export const LIVE_SYNC_INTERVAL_MS = 30000;

/**
 * Keeps an open plan up to date with what others do, as they save: the server announces every new
 * revision (Server-Sent Events) and the plan is fetched at once. A PM's plan merges it with their own
 * unsaved edits (useRemoteMerge); a technician — who never saves the plan — takes the whole plan.
 * Also checks on a timer and when the tab becomes visible, in case the live connection was down.
 */
export const useLiveSync = () => {
  const { state: docState, dispatch } = useDocument();
  const { data: user } = useCurrentUser();
  const mergeRemote = useRemoteMerge();
  const isTech = user?.role === 'TECH';
  const projectId = docState.projectId;
  const busyRef = useRef(false);
  /** Another announcement came while fetching: fetch once more afterwards. */
  const againRef = useRef(false);
  const mergeRef = useRef(mergeRemote);
  mergeRef.current = mergeRemote;

  useEffect(() => {
    if (!projectId || !user) return;
    let stopped = false;
    const fetchLatest = async () => {
      if (busyRef.current) { againRef.current = true; return; }
      busyRef.current = true;
      try {
        do {
          againRef.current = false;
          const rev = getRevision(projectId);
          const res = await fetch(`/api/projects/${projectId}/live?rev=${rev ?? ''}`, { credentials: 'include' });
          if (!res.ok || stopped) return;
          const data = await res.json() as { revision: number; state?: Record<string, any> };
          // Ours, or nothing new: the revision is all that came back.
          if (!data.state) continue;
          if (isTech) {
            const objects = (data.state.objects ?? []) as EditorObject[];
            const { layers, cableRoutes, lvSettings, measureCalibration, exportSettings } = data.state;
            dispatch({
              type: 'APPLY_REMOTE',
              payload: { mode: 'sync', objects, doc: { layers, cableRoutes: cableRoutes ?? [], lvSettings, measureCalibration: measureCalibration ?? null, exportSettings } },
            });
            setRevision(projectId, data.revision);
          } else {
            await mergeRef.current(projectId, data.revision, data.state);
          }
        } while (againRef.current && !stopped);
      } catch {
        // Offline for a moment: the next announcement / check tries again.
      } finally {
        busyRef.current = false;
      }
    };

    // Live: the server tells every open tab the new revision right after a save / op.
    const events = new EventSource(`/api/projects/${projectId}/events`, { withCredentials: true });
    events.onmessage = (e) => {
      try {
        const { revision } = JSON.parse(e.data) as { revision: number };
        if (revision !== getRevision(projectId)) fetchLatest();
      } catch { /* not ours */ }
    };
    // (Re)connected: catch up on what happened while the connection was down.
    events.onopen = () => { fetchLatest(); };

    const tick = () => { if (document.visibilityState === 'visible') fetchLatest(); };
    const id = setInterval(tick, LIVE_SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      stopped = true;
      events.close();
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [projectId, user, isTech, dispatch]);
};
