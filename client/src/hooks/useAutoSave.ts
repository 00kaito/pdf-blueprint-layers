import { useEffect, useRef, useState } from "react";
import { useDocument, useUI } from "@/lib/editor-context";
import { useSaveProject } from "./useProjects";

export function useAutoSave() {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();
  const saveProject = useSaveProject();
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!docState.projectId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
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
        await saveProject.mutateAsync({ id: docState.projectId!, state: payload as any });
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

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
    docState.overlayPdfFileId
  ]);

  return { isSaving: isSaving || saveProject.isPending };
}
