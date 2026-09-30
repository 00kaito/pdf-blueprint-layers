import { useEffect, useRef, useState } from "react";
import { useDocument, useUI } from "@/lib/editor-context";
import { useSaveProject, useUploadFile } from "./useProjects";

export function useAutoSave() {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const saveProject = useSaveProject();
  const uploadFile = useUploadFile();
  const [isUploadingOverlay, setIsUploadingOverlay] = useState(false);
  /** Overlay whose upload failed — not retried in a loop (a manual save uploads it again). */
  const failedOverlayRef = useRef<File | null>(null);
  /** Current overlay / main file, to drop an upload result the user has replaced meanwhile. */
  const filesRef = useRef({ overlay: docState.overlayPdfFile, pdfFileId: docState.pdfFileId, projectId: docState.projectId });
  filesRef.current = { overlay: docState.overlayPdfFile, pdfFileId: docState.pdfFileId, projectId: docState.projectId };
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<any>(null);
  const lastStateRef = useRef<string>("");
  const activeSaveRef = useRef<boolean>(false);
  /** Calibration + project it belongs to, to save a new measuring scale right away. */
  const lastCalibrationRef = useRef({ projectId: docState.projectId, calibration: docState.measureCalibration });

  const doSave = async (retryCount = 0) => {
    if (!docState.projectId) return;
    if (activeSaveRef.current && retryCount === 0) {
      // Don't drop this change — try again once the running save is done.
      timeoutRef.current = setTimeout(() => doSave(), 500);
      return;
    }
    
    const payload = {
      layers: docState.layers,
      objects: docState.objects,
      customIcons: docState.customIcons,
      exportSettings: docState.exportSettings,
      autoNumbering: docState.autoNumbering,
      overlayOpacity: docState.overlayOpacity,
      overlayOffset: docState.overlayOffset,
      measureCalibration: docState.measureCalibration,
      pdfFileId: docState.pdfFileId,
      overlayPdfFileId: docState.overlayPdfFileId,
      activeLayerId: uiState.activeLayerId
    };

    const stateString = JSON.stringify(payload);
    if (stateString === lastStateRef.current && retryCount === 0) return;

    setIsSaving(true);
    activeSaveRef.current = true;
    console.log(`[AutoSave] Saving project ${docState.projectId}... (attempt ${retryCount + 1})`);
    
    try {
      await saveProject.mutateAsync({ id: docState.projectId!, state: payload as any });
      lastStateRef.current = stateString;
      console.log(`[AutoSave] Save successful for ${docState.projectId}`);
    } catch (e: any) {
      console.error("[AutoSave] Save failed", e);
      const isAbortError = e.name === 'AbortError' || e.message?.includes('aborted') || e.message?.includes('signal is aborted');
      
      if (isAbortError && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[AutoSave] Save aborted, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return doSave(retryCount + 1);
      }
    } finally {
      setIsSaving(false);
      activeSaveRef.current = false;
    }
  };

  useEffect(() => {
    if (!docState.projectId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // A new (or cleared) measuring scale is saved at once — it is set rarely and must not be lost
    // to a reload within the debounce. Opening another project is not a change of its scale.
    const last = lastCalibrationRef.current;
    const calibrationChanged = last.projectId === docState.projectId && last.calibration !== docState.measureCalibration;
    lastCalibrationRef.current = { projectId: docState.projectId, calibration: docState.measureCalibration };

    timeoutRef.current = setTimeout(() => doSave(), calibrationChanged ? 0 : 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    docState.layers, 
    docState.objects, 
    docState.customIcons, 
    docState.exportSettings, 
    docState.autoNumbering, 
    docState.overlayOpacity,
    docState.overlayOffset,
    docState.measureCalibration,
    docState.projectId,
    docState.pdfFileId,
    docState.overlayPdfFileId,
    uiState.activeLayerId
  ]);

  // An overlay added (or replaced) in an opened project is uploaded right away and its id stored,
  // so the next autosave keeps it. Without this only a manual save uploaded it.
  useEffect(() => {
    const overlay = docState.overlayPdfFile;
    const projectId = docState.projectId;
    if (!projectId || !overlay || docState.overlayPdfFileId || isUploadingOverlay || failedOverlayRef.current === overlay) return;
    setIsUploadingOverlay(true);
    uploadFile.mutateAsync({ file: overlay, projectId })
      .then(({ fileId }) => {
        // Replaced, removed or another project opened meanwhile: this upload is stale (a replacement
        // is uploaded by the next run of this effect, once this one has finished).
        const current = filesRef.current;
        if (current.overlay !== overlay || current.projectId !== projectId) return;
        dispatch({ type: 'SET_PDF_FILE_IDS', payload: { pdfFileId: filesRef.current.pdfFileId, overlayPdfFileId: fileId } });
      })
      .catch((e) => {
        failedOverlayRef.current = overlay;
        console.error("[AutoSave] Overlay upload failed", e);
      })
      .finally(() => setIsUploadingOverlay(false));
  }, [docState.overlayPdfFile, docState.overlayPdfFileId, docState.projectId, isUploadingOverlay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && docState.projectId) {
        console.log("[AutoSave] Page hidden, triggering immediate save...");
        doSave();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [docState, uiState]);

  return { isSaving: isSaving || saveProject.isPending || isUploadingOverlay };
}
