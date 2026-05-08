import { useEffect, useRef, useState } from "react";
import { useDocument, useUI } from "@/lib/editor-context";
import { useSaveProject } from "./useProjects";

export function useAutoSave() {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();
  const saveProject = useSaveProject();
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<any>(null);
  const lastStateRef = useRef<string>("");
  const activeSaveRef = useRef<boolean>(false);

  const doSave = async (retryCount = 0) => {
    if (!docState.projectId) return;
    if (activeSaveRef.current && retryCount === 0) return;
    
    const payload = {
      layers: docState.layers,
      objects: docState.objects,
      customIcons: docState.customIcons,
      exportSettings: docState.exportSettings,
      autoNumbering: docState.autoNumbering,
      overlayOpacity: docState.overlayOpacity,
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

    timeoutRef.current = setTimeout(() => doSave(), 2000);

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
    docState.projectId,
    docState.pdfFileId,
    docState.overlayPdfFileId,
    uiState.activeLayerId
  ]);

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

  return { isSaving: isSaving || saveProject.isPending };
}
