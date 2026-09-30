import React, {useRef, useState} from 'react';
import {
  Archive, ChevronLeft, Copy, Download, FolderOpen, Loader2, LogOut, Menu, PenTool, Save, Share2, Tablet, User,
} from 'lucide-react';
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
import {ShareProjectDialog} from '../ShareProjectDialog';
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
  const { handleFlattenAndDownload, handleExportProject } = useExport();
  const { handleFileImport } = useImport();
  const { handleSave, isSaving } = useManualSave();
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const onProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileImport(e.target.files);
    e.target.value = '';
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
          <DropdownMenuItem onClick={() => setOverlayOpen(true)} className="gap-2 cursor-pointer" data-testid="menu-overlay">
            <Copy className="w-4 h-4" />
            Overlay blueprint…
            {docState.overlayPdfFile && <span className="ml-auto text-[10px] text-muted-foreground">on</span>}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleFlattenAndDownload} className="gap-2 cursor-pointer">
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
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">PDF label font size</Label>
              <span className="text-xs font-bold text-primary">{docState.exportSettings.labelFontSize}px</span>
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

      <ShareProjectDialog projectId={docState.projectId} open={shareOpen} onOpenChange={setShareOpen} />

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
