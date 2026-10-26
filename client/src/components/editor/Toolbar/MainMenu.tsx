import React, {useRef, useState} from 'react';
import {
  Archive, Cable, ChevronLeft, Copy, Download, FileUp, FolderOpen, Loader2, LogOut, Menu, PenTool, Save, Share2, Spline, Tablet, User, Video,
} from 'lucide-react';
import {CableSummaryPanel} from '../CableSummaryPanel';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Slider} from '@/components/ui/slider';
import {Label} from '@/components/ui/label';
import {useDocument, useUI} from '@/lib/editor-context';
import {useCurrentUser, useLogout} from '@/hooks/useAuth';
import {useExport} from '@/hooks/useExport';
import {useImport} from '@/hooks/useImport';
import {useManualSave} from '@/hooks/useManualSave';
import {useUploadFile} from '@/hooks/useProjects';
import {useToast} from '@/hooks/use-toast';
import {ShareProjectDialog} from '../ShareProjectDialog';
import {ExportPdfDialog} from '../ExportPdfDialog';
import {OverlaySettings} from '../OverlaySettings';
import {cn} from '@/lib/utils';

/**
 * Everything that is used now and then rather than all the time: account, project file actions,
 * the overlay blueprint, export and device settings — one menu instead of a crowded toolbar.
 */
export const MainMenu = () => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const logout = useLogout();
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { handleExportProject } = useExport();
  const { handleFileImport } = useImport();
  const { handleSave, isSaving } = useManualSave();
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const replacePdfInputRef = useRef<HTMLInputElement>(null);
  const [replacingPdf, setReplacingPdf] = useState(false);
  const uploadFile = useUploadFile();
  const { toast } = useToast();
  const projectIdRef = useRef(docState.projectId);
  projectIdRef.current = docState.projectId;

  const onProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileImport(e.target.files);
    e.target.value = '';
  };

  /**
   * New revision of the blueprint: the file is uploaded first and swapped only once it is stored,
   * so a failed upload leaves the project as it was. Objects keep their positions.
   */
  const onReplacePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm(`Replace the blueprint with "${file.name}"? Layers and objects stay where they are; check that the new sheet lines up (and re-probe the measuring scale if its scale changed).`)) return;
    const projectId = docState.projectId;
    if (!projectId) {
      // Not saved yet: the next save uploads it.
      dispatch({ type: 'REPLACE_PDF', payload: { file, fileId: null } });
      return;
    }
    setReplacingPdf(true);
    try {
      const { fileId } = await uploadFile.mutateAsync({ file, projectId });
      if (projectIdRef.current !== projectId) return; // another project opened meanwhile
      dispatch({ type: 'REPLACE_PDF', payload: { file, fileId } });
      toast({ title: 'Blueprint replaced', description: file.name });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Blueprint upload failed', description: err.message });
    } finally {
      setReplacingPdf(false);
    }
  };

  const onLogout = () => {
    logout.mutate(undefined, { onSuccess: () => dispatch({ type: 'RESET_EDITOR' }) });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("-ml-2 shrink-0", uiState.ipadMode ? "h-10 w-10" : "h-8 w-8")}
            title="Menu"
            data-testid="main-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {user && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate">{user.username}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{user.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => dispatch({ type: 'RESET_EDITOR' })} className="gap-2 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
            All projects
          </DropdownMenuItem>
          {docState.pdfFile && (
            <DropdownMenuItem onClick={async () => await handleSave()} disabled={isSaving} className="gap-2 cursor-pointer">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save project
            </DropdownMenuItem>
          )}
          {!isTech && (
            <>
              <DropdownMenuItem onClick={() => setShareOpen(true)} disabled={!docState.projectId} className="gap-2 cursor-pointer">
                <Share2 className="w-4 h-4" />
                Share project
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <label htmlFor="project-upload-main-menu" className="flex items-center gap-2 px-2 py-1.5 w-full cursor-pointer">
                  <FolderOpen className="w-4 h-4" />
                  Open project file
                  <input type="file" accept=".json,.zip" className="hidden" id="project-upload-main-menu" onChange={onProjectUpload} />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => dirInputRef.current?.click()} className="gap-2 cursor-pointer">
                <FolderOpen className="w-4 h-4" />
                Open project folder
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          {!isTech && docState.pdfFile && (
            <DropdownMenuItem
              onClick={() => replacePdfInputRef.current?.click()}
              disabled={replacingPdf}
              className="gap-2 cursor-pointer"
              data-testid="menu-replace-pdf"
            >
              {replacingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              <div className="flex flex-col">
                <span>Replace blueprint PDF…</span>
                <span className="text-[10px] text-muted-foreground">New revision — objects stay in place</span>
              </div>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setOverlayOpen(true)} className="gap-2 cursor-pointer" data-testid="menu-overlay">
            <Copy className="w-4 h-4" />
            Overlay blueprint…
            {docState.overlayPdfFile && <span className="ml-auto text-[10px] text-muted-foreground">on</span>}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => dispatch({ type: 'SET_CABLE_SUMMARY_OPEN', payload: true })}
            className="gap-2 cursor-pointer"
            data-testid="menu-cable-summary"
          >
            <Cable className="w-4 h-4 text-blue-600" />
            <div className="flex flex-col">
              <span>Cable summary…</span>
              <span className="text-[10px] text-muted-foreground">Drops, patch panels, lengths per rack</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={uiState.showCableRoutes}
            onCheckedChange={() => dispatch({ type: 'TOGGLE_CABLE_ROUTES' })}
            className="cursor-pointer"
            data-testid="menu-show-routes"
          >
            <Spline className="w-4 h-4 mr-2" />
            Show cable routes
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={uiState.showCameraCoverage}
            onCheckedChange={() => {
              // Coverage is drawn in feet: without the measuring scale there is nothing to draw yet.
              if (!uiState.showCameraCoverage && !docState.measureCalibration) {
                toast({ title: 'Set the scale first', description: 'Camera coverage appears once the plan is calibrated (measure tool).' });
              }
              dispatch({ type: 'TOGGLE_CAMERA_COVERAGE' });
            }}
            className="cursor-pointer"
            data-testid="menu-camera-coverage"
          >
            <Video className="w-4 h-4 mr-2" />
            Show camera coverage
          </DropdownMenuCheckboxItem>
          {uiState.showCameraCoverage && (
            <DropdownMenuCheckboxItem
              checked={uiState.coverageSolid}
              onCheckedChange={() => dispatch({ type: 'TOGGLE_COVERAGE_SOLID' })}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer pl-14"
              data-testid="menu-coverage-solid"
            >
              <div className="flex flex-col">
                <span>One colour</span>
                <span className="text-[10px] text-muted-foreground">No 15 ft ring, plain field of view</span>
              </div>
            </DropdownMenuCheckboxItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => dispatch({ type: 'SET_EXPORT_STEP', payload: 'dialog' })} className="gap-2 cursor-pointer" data-testid="menu-export-pdf">
            <Download className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span>Export PDF</span>
              <span className="text-[10px] text-muted-foreground">Flattened blueprint with layers</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportProject} className="gap-2 cursor-pointer">
            <Archive className="w-4 h-4 text-amber-600" />
            <div className="flex flex-col">
              <span>Export project files (.zip)</span>
              <span className="text-[10px] text-muted-foreground">Backup or transfer</span>
            </div>
          </DropdownMenuItem>
          {/* Not a menu item: dragging the slider must not close the menu. */}
          <div className="px-2 pt-1 pb-2 space-y-2" onKeyDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Label size (plan &amp; PDF)</Label>
              <span className="text-xs font-bold text-primary">{docState.exportSettings.labelFontSize}</span>
            </div>
            <Slider
              min={1} max={30} step={1}
              value={[docState.exportSettings.labelFontSize]}
              onValueChange={([value]) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { labelFontSize: value } })}
            />
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={uiState.ipadMode}
            onCheckedChange={(checked) => dispatch({ type: 'SET_IPAD_MODE', payload: !!checked })}
            className="cursor-pointer"
            data-testid="menu-ipad-mode"
          >
            <Tablet className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>Touch layout</span>
              <span className="text-[10px] text-muted-foreground">Bigger buttons, gesture hints</span>
            </div>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={uiState.stylusOnly}
            onCheckedChange={(checked) => dispatch({ type: 'SET_STYLUS_ONLY', payload: !!checked })}
            className="cursor-pointer"
            data-testid="menu-stylus-only"
          >
            <PenTool className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>Stylus only</span>
              <span className="text-[10px] text-muted-foreground">The stylus uses the tools; fingers pan, zoom and tap</span>
            </div>
          </DropdownMenuCheckboxItem>

          {user && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} disabled={logout.isPending} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </>
          )}
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
      <input
        type="file"
        ref={replacePdfInputRef}
        accept="application/pdf"
        onChange={onReplacePdf}
        className="hidden"
        data-testid="replace-pdf-input"
      />

      <ShareProjectDialog projectId={docState.projectId} open={shareOpen} onOpenChange={setShareOpen} />
      <ExportPdfDialog />
      <CableSummaryPanel />

      <Dialog open={overlayOpen} onOpenChange={setOverlayOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Overlay blueprint</DialogTitle>
            <DialogDescription>A second PDF shown semi-transparently over the main blueprint.</DialogDescription>
          </DialogHeader>
          <OverlaySettings onStartDrag={() => setOverlayOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};
