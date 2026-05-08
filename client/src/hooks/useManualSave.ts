import { useDocument, useUI } from '@/lib/editor-context';
import { useSaveProject, useCreateProject, useUploadFile } from './useProjects';
import { useToast } from './use-toast';
import { useState, useRef, useEffect } from 'react';

export function useManualSave() {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { toast } = useToast();
  
  const saveProject = useSaveProject();
  const createProject = useCreateProject();
  const uploadFile = useUploadFile();
  
  const [isSaving, setIsSaving] = useState(false);
  const activeSaveRef = useRef<boolean>(false);

  const handleSave = async (silent: boolean = false) => {
    if (!docState.pdfFile && !docState.projectId) {
      if (!silent) {
        toast({ 
          variant: "destructive", 
          title: "No project to save", 
          description: "Please upload a PDF first." 
        });
      }
      return;
    }

    if (activeSaveRef.current) return;
    
    setIsSaving(true);
    activeSaveRef.current = true;

    // Keep track of IDs across retries to avoid re-creating/re-uploading if they succeeded
    let currentProjectId = docState.projectId;
    let currentPdfFileId = docState.pdfFileId;
    let currentOverlayPdfFileId = docState.overlayPdfFileId;

    const performSave = async (retryCount = 0): Promise<void> => {
      try {
        if (!currentProjectId) {
          if (!docState.pdfFile) {
            throw new Error("PDF file is required to create a project.");
          }

          // Create new project
          const project = await createProject.mutateAsync({ name: docState.pdfFile.name || 'New Project' });
          currentProjectId = project.id;
          dispatch({ type: 'SET_PROJECT_ID', payload: project.id });
        }

        if (currentProjectId && !currentPdfFileId && docState.pdfFile) {
          // Upload main PDF
          const res = await uploadFile.mutateAsync({ file: docState.pdfFile, projectId: currentProjectId });
          currentPdfFileId = res.fileId;
          dispatch({ type: 'SET_PDF_FILE_IDS', payload: { pdfFileId: currentPdfFileId, overlayPdfFileId: currentOverlayPdfFileId } });
        }
        
        if (currentProjectId && !currentOverlayPdfFileId && docState.overlayPdfFile) {
          // Upload overlay PDF if exists
          const resOverlay = await uploadFile.mutateAsync({ file: docState.overlayPdfFile, projectId: currentProjectId });
          currentOverlayPdfFileId = resOverlay.fileId;
          dispatch({ type: 'SET_PDF_FILE_IDS', payload: { pdfFileId: currentPdfFileId, overlayPdfFileId: currentOverlayPdfFileId } });
        }

        const stateToSave = {
          layers: docState.layers,
          objects: docState.objects,
          customIcons: docState.customIcons,
          exportSettings: docState.exportSettings,
          autoNumbering: docState.autoNumbering,
          overlayOpacity: docState.overlayOpacity,
          pdfFileId: currentPdfFileId,
          overlayPdfFileId: currentOverlayPdfFileId,
          activeLayerId: uiState.activeLayerId
        };

        await saveProject.mutateAsync({ id: currentProjectId!, state: stateToSave as any });
        if (!silent) {
          toast({ 
            title: "Project saved", 
            description: "Your changes have been saved to the server." 
          });
        }
      } catch (e: any) {
        const isAbortError = e.name === 'AbortError' || e.message?.includes('aborted') || e.message?.includes('signal is aborted');
        
        if (isAbortError && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`[ManualSave] Save aborted, retrying in ${delay}ms (attempt ${retryCount + 1})...`);
          
          if (!silent && retryCount === 0) {
            toast({ 
              title: "Connection unstable", 
              description: "Retrying project save..." 
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return performSave(retryCount + 1);
        }

        const errorMessage = isAbortError 
          ? "The save request took too long or was interrupted. Please check your internet connection and try again."
          : e.message;
          
        if (!silent || isAbortError) {
          toast({ 
            variant: "destructive", 
            title: "Failed to save project", 
            description: errorMessage 
          });
        }
        throw e;
      }
    };

    try {
      await performSave();
    } catch (e) {
      console.error("[ManualSave] Final error after retries:", e);
    } finally {
      setIsSaving(false);
      activeSaveRef.current = false;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeSaveRef.current) {
        console.log("[ManualSave] Page hidden during active save, allowing it to complete...");
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return { handleSave, isSaving };
}
