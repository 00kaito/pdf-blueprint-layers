import React, {useState, useRef} from 'react';
import {Download, FolderOpen, Save, Settings2, Loader2, Share2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Input} from "@/components/ui/input";
import {Slider} from '@/components/ui/slider';
import {Label} from "@/components/ui/label";
import {useDocumentDispatch} from '@/lib/editor-context';
import {useExport} from '@/hooks/useExport';
import {useImport} from '@/hooks/useImport';
import {useManualSave} from '@/hooks/useManualSave';
import {ShareProjectDialog} from '../ShareProjectDialog';
import {DocumentState} from '@/lib/types';

interface ProjectActionsProps {
  projectId: string | null;
  pdfFile: File | null;
  isTech: boolean;
  exportSettings: DocumentState['exportSettings'];
}

export const ProjectActions = ({
  projectId,
  pdfFile,
  isTech,
  exportSettings,
}: ProjectActionsProps) => {
  const dispatch = useDocumentDispatch();
  const { handleFlattenAndDownload, handleExportProject } = useExport();
  const { handleFileImport } = useImport();
  const { handleSave, isSaving: isManualSaving } = useManualSave();
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const onProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileImport(e.target.files);
    e.target.value = '';
  };

  if (isTech) return (
    <Button size="sm" onClick={handleFlattenAndDownload}>
      <Download className="w-4 h-4 mr-2" />
      Merge Layers and Export as PDF
    </Button>
  );

  return (
    <div className="flex items-center gap-2">
      {projectId && (
        <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      )}

      {pdfFile && (
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isManualSaving}>
          {isManualSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={handleExportProject}>
        <Save className="w-4 h-4 mr-2" />
        Export Project Files
      </Button>
      
      <Button variant="outline" size="sm" asChild>
        <label htmlFor="project-upload" className="cursor-pointer">
          <FolderOpen className="w-4 h-4 mr-2" />Open
          <input type="file" accept=".json,.zip" className="hidden" id="project-upload" onChange={onProjectUpload} />
        </label>
      </Button>
      
      <Button variant="outline" size="sm" onClick={() => dirInputRef.current?.click()}>
        <FolderOpen className="w-4 h-4 mr-2" />Open Folder
      </Button>
      
      <input
        type="file"
        ref={dirInputRef}
        multiple
        {...{ webkitdirectory: "", directory: "" } as any}
        onChange={onProjectUpload}
        className="hidden"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2">
            <Settings2 className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Export Settings</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Label Font Size (PDF)</Label>
                <span className="text-sm text-muted-foreground">{exportSettings.labelFontSize}px</span>
              </div>
              <Slider
                min={1} max={30} step={1}
                value={[exportSettings.labelFontSize]}
                onValueChange={([value]) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { labelFontSize: value } })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button size="sm" onClick={handleFlattenAndDownload}>
        <Download className="w-4 h-4 mr-2" />
        Merge Layers and Export as PDF
      </Button>

      <ShareProjectDialog 
        projectId={projectId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
};
