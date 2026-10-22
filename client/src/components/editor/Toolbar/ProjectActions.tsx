import React, {useState} from 'react';
import {Download, Save, Loader2, Archive} from 'lucide-react';
import {ExportPdfDialog} from '../ExportPdfDialog';
import {Button} from '@/components/ui/button';
import {useExport} from '@/hooks/useExport';
import {useManualSave} from '@/hooks/useManualSave';
import {DocumentState} from '@/lib/types';

interface ProjectActionsProps {
  projectId: string | null;
  pdfFile: File | null;
  isTech: boolean;
  exportSettings: DocumentState['exportSettings'];
}

/** Phone layout project actions (on desktop / iPad these live in the main menu, see MainMenu). */
export const ProjectActions = ({
  projectId,
  pdfFile,
  isTech,
  exportSettings,
}: ProjectActionsProps) => {
  const { handleExportProject } = useExport();
  const [exportOpen, setExportOpen] = useState(false);
  const { handleSave, isSaving: isManualSaving } = useManualSave();

  return (
    <div className="flex items-center gap-2">
      {pdfFile && (
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
        onClick={() => setExportOpen(true)}
        className="h-10 w-10 p-0"
      >
        <Download className="w-5 h-5 text-primary" />
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleExportProject}
        className="h-10 w-10 p-0"
      >
        <Archive className="w-5 h-5 text-amber-600" />
      </Button>
      <ExportPdfDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
};
