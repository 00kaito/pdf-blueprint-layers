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

  const doSave = async () => {
    if (!docState.projectId) return;
    
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
    if (stateString === lastStateRef.current) return;

    setIsSaving(true);
    console.log(`[AutoSave] Saving project ${docState.projectId}...`);
    try {
      await saveProject.mutateAsync({ id: docState.projectId!, state: payload as any });
      lastStateRef.current = stateString;
      console.log(`[AutoSave] Save successful for ${docState.projectId}`);
    } catch (e) {
      console.error("[AutoSave] Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!docState.projectId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(doSave, 1000);

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
      if (document.visibilityState === 'hidden') {
        console.log("[AutoSave] Page hidden, triggering immediate save...");
        doSave();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [docState, uiState]);

  return { isSaving: isSaving || saveProject.isPending };
}
