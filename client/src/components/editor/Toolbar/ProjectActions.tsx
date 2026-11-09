import React from 'react';
import {Download, Save, Loader2, Archive} from 'lucide-react';
import {ExportPdfDialog} from '../ExportPdfDialog';
import {Button} from '@/components/ui/button';
import {useExport} from '@/hooks/useExport';
import {useManualSave} from '@/hooks/useManualSave';
import {DocumentState} from '@/lib/types';
import {useUI} from '@/lib/editor-context';

interface ProjectActionsProps {
  projectId: string | null;
  pdfFile: File | null;
  isTech: boolean;
  exportSettings: DocumentState['exportSettings'];
}

/**
 * Phone layout project actions (on desktop / iPad these live in the main menu, see MainMenu).
 * No save button: a project on the server saves itself (PM) or sends every change at once
 * (technician) — only a plan opened from a file and not saved yet has one. Technicians get no
 * project ZIP download (that is for PMs / admins moving or backing up projects).
 */
export const ProjectActions = ({
  projectId,
  pdfFile,
  isTech,
  exportSettings,
}: ProjectActionsProps) => {
  const { handleExportProject } = useExport();
  const { dispatch } = useUI();
  const { handleSave, isSaving: isManualSaving } = useManualSave();

  return (
    <div className="flex items-center gap-2">
      {pdfFile && !projectId && !isTech && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={async () => await handleSave()} 
          disabled={isManualSaving}
          className="h-10 w-10 p-0"
        >
          {isManualSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        </Button>
      )}
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => dispatch({ type: 'SET_EXPORT_STEP', payload: 'dialog' })}
        className="h-10 w-10 p-0"
      >
        <Download className="w-5 h-5 text-primary" />
      </Button>

      {!isTech && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleExportProject}
          className="h-10 w-10 p-0"
          aria-label="Download project files (.zip)"
        >
          <Archive className="w-5 h-5 text-amber-600" />
        </Button>
      )}
      <ExportPdfDialog />
    </div>
  );
};
