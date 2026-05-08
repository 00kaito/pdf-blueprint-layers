import { useDocument, useUI } from '@/lib/editor-context';
import { useSaveProject, useCreateProject, useUploadFile } from './useProjects';
import { useToast } from './use-toast';
import { useState } from 'react';

export function useManualSave() {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { toast } = useToast();
  
  const saveProject = useSaveProject();
  const createProject = useCreateProject();
  const uploadFile = useUploadFile();
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (silent: boolean = false) => {
    if (!docState.pdfFile && !docState.projectId) {
      toast({ variant: "destructive", title: "No project to save", description: "Please upload a PDF first." });
      return;
    }

    setIsSaving(true);
    try {
      let projectId = docState.projectId;
      let pdfFileId = docState.pdfFileId;
      let overlayPdfFileId = docState.overlayPdfFileId;

      if (!projectId) {
        if (!docState.pdfFile) {
          throw new Error("PDF file is required to create a project.");
        }

        // Create new project
        const project = await createProject.mutateAsync({ name: docState.pdfFile.name || 'New Project' });
        projectId = project.id;
        
        // Upload main PDF
        const res = await uploadFile.mutateAsync({ file: docState.pdfFile, projectId: project.id });
        pdfFileId = res.fileId;
        
        // Upload overlay PDF if exists
        if (docState.overlayPdfFile) {
          const resOverlay = await uploadFile.mutateAsync({ file: docState.overlayPdfFile, projectId: project.id });
          overlayPdfFileId = resOverlay.fileId;
        }

        dispatch({ type: 'SET_PROJECT_ID', payload: project.id });
        dispatch({ type: 'SET_PDF_FILE_IDS', payload: { pdfFileId, overlayPdfFileId } });
      }

      const stateToSave = {
        layers: docState.layers,
        objects: docState.objects,
        customIcons: docState.customIcons,
        exportSettings: docState.exportSettings,
        autoNumbering: docState.autoNumbering,
        overlayOpacity: docState.overlayOpacity,
        pdfFileId,
        overlayPdfFileId,
        // We include activeLayerId even if not in the list, as the plan's risk section mentions it
        activeLayerId: uiState.activeLayerId
      };

      await saveProject.mutateAsync({ id: projectId!, state: stateToSave as any });
      if (!silent) toast({ title: "Project saved", description: "Your changes have been saved to the server." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to save project", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return { handleSave, isSaving };
}
