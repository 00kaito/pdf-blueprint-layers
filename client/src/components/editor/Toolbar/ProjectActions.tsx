import React, {useState, useRef} from 'react';
import {Download, FolderOpen, Save, Settings, Settings2, Loader2, Share2, Archive, MoreHorizontal, ChevronDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {Slider} from '@/components/ui/slider';
import {Label} from "@/components/ui/label";
import {Separator} from '@/components/ui/separator';
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

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="gap-2 h-8 font-semibold shadow-sm">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Project</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {pdfFile && (
            <DropdownMenuItem 
              onClick={handleSave} 
              disabled={isManualSaving}
              className="gap-2 cursor-pointer"
            >
              {isManualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Project
            </DropdownMenuItem>
          )}

          {!isTech && (
            <>
              <DropdownMenuItem 
                onClick={() => setShareDialogOpen(true)} 
                className="gap-2 cursor-pointer" 
                disabled={!projectId}
              >
                <Share2 className="w-4 h-4" />
                Share Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-0">
                <label htmlFor="project-upload-menu" className="flex items-center gap-2 px-2 py-1.5 w-full cursor-pointer">
                  <FolderOpen className="w-4 h-4" />
                  Open Project File
                  <input type="file" accept=".json,.zip" className="hidden" id="project-upload-menu" onChange={onProjectUpload} />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => dirInputRef.current?.click()} className="gap-2 cursor-pointer">
                <FolderOpen className="w-4 h-4" />
                Open Project Folder
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 border-primary/20 hover:bg-primary/5">
            <Download className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleFlattenAndDownload} className="gap-2 cursor-pointer py-3">
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Merge and Export as PDF</span>
              <span className="text-[10px] text-muted-foreground">Download flattened blueprint with layers</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportProject} className="gap-2 cursor-pointer py-3">
            <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Export Project Files (.zip)</span>
              <span className="text-[10px] text-muted-foreground">Save project data for backup or transfer</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">PDF Label Font Size</Label>
                <span className="text-xs font-bold text-primary">{exportSettings.labelFontSize}px</span>
              </div>
              <Slider
                min={1} max={30} step={1}
                value={[exportSettings.labelFontSize]}
                onValueChange={([value]) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { labelFontSize: value } })}
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        type="file"
        ref={dirInputRef}
        multiple
        {...{ webkitdirectory: "", directory: "" } as any}
        onChange={onProjectUpload}
        className="hidden"
      />

      <ShareProjectDialog 
        projectId={projectId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
};
