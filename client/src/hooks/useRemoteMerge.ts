import {useCallback, useRef} from 'react';
import {useDocument} from '@/lib/editor-context';
import {getBase, getRevision, setBase} from '@/lib/live-revision';
import {mergeDoc, toSyncedDoc, type SyncedDoc} from '@/lib/merge-state';

/** A stored file of the project (a PDF someone else replaced) as a File. */
const fetchFile = async (fileId: string, name: string) => {
  const res = await fetch(`/api/files/${fileId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new File([await res.blob()], name, { type: 'application/pdf' });
};

/**
 * Takes the server's plan (newer revision) into the open plan without losing this tab's edits:
 * three-way merge against the last common plan (see merge-state). A blueprint / overlay PDF
 * someone else replaced is downloaded and swapped in.
 */
export const useRemoteMerge = () => {
  const { state: docState, dispatch } = useDocument();
  const docRef = useRef(docState);
  docRef.current = docState;
  /** The last merge, until the plan re-renders with it (two merges in a row must build on each other). */
  const lastMergeRef = useRef<{ from: typeof docState; merged: SyncedDoc } | null>(null);

  return useCallback(async (projectId: string, revision: number, serverState: Record<string, any>) => {
    const local = docRef.current;
    if (local.projectId !== projectId) return;
    // Older than what this tab has (a fetch that crossed our own save): nothing new in it.
    const known = getRevision(projectId);
    if (known !== undefined && revision < known) return;
    const remote = toSyncedDoc(serverState);
    const base = getBase(projectId)?.doc ?? remote;
    const pending = lastMergeRef.current;
    const current = pending && pending.from === local ? pending.merged : toSyncedDoc(local);
    const merged = mergeDoc(base, current, remote);
    lastMergeRef.current = { from: local, merged };
    setBase(projectId, revision, remote);
    dispatch({ type: 'APPLY_REMOTE_MERGE', payload: { doc: merged, base, remote } });

    try {
      if (merged.pdfFileId && merged.pdfFileId !== local.pdfFileId) {
        dispatch({ type: 'REPLACE_PDF', payload: { file: await fetchFile(merged.pdfFileId, 'blueprint.pdf'), fileId: merged.pdfFileId } });
      }
      if (merged.overlayPdfFileId !== local.overlayPdfFileId) {
        const overlay = merged.overlayPdfFileId ? await fetchFile(merged.overlayPdfFileId, 'overlay.pdf') : null;
        dispatch({ type: 'SET_OVERLAY_PDF', payload: overlay });
        // SET_OVERLAY_PDF clears the id (a new local overlay is uploaded) — this one is stored already.
        dispatch({ type: 'SET_PDF_FILE_IDS', payload: { pdfFileId: merged.pdfFileId, overlayPdfFileId: merged.overlayPdfFileId } });
      }
    } catch (e) {
      console.error('[LiveSync] Could not load a replaced PDF', e);
    }
  }, [dispatch]);
};
