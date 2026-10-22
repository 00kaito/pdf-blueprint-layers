import React, {useEffect, useState} from 'react';
import {Download, Loader2} from 'lucide-react';
import {useExport} from '@/hooks/useExport';
import {useDocument} from '@/lib/editor-context';
import {Slider} from '@/components/ui/slider';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';

/** Asks for the PDF's file name (the project name by default), then exports. */
export const ExportPdfDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { handleFlattenAndDownload, projectName } = useExport();
  const { state: docState, dispatch } = useDocument();
  const labelFontSize = docState.exportSettings.labelFontSize;
  const [name, setName] = useState(projectName);
  const [busy, setBusy] = useState(false);
  // Every opening starts from the project name.
  useEffect(() => { if (open) setName(projectName); }, [open, projectName]);

  const exportPdf = async () => {
    setBusy(true);
    try {
      await handleFlattenAndDownload(name.trim() || projectName);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
          <DialogDescription>Flattened blueprint with its layers and the cable summary pages.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!busy) exportPdf(); }} className="space-y-2">
          <Label htmlFor="export-file-name" className="text-xs">File name</Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="export-file-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder={projectName || 'edited-document'}
              autoFocus
              data-testid="export-file-name"
            />
            <span className="text-sm text-muted-foreground">.pdf</span>
          </div>
          <div className="space-y-2 pt-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Label size</Label>
              <span className="text-xs font-bold text-primary" data-testid="export-label-size-value">{labelFontSize}</span>
            </div>
            <Slider
              min={1} max={30} step={1}
              value={[labelFontSize]}
              onValueChange={([value]) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { labelFontSize: value } })}
              data-testid="export-label-size"
            />
            <p className="text-[10px] text-muted-foreground">
              Labels on the plan grow with it in the same proportion as in the PDF — check them for overlaps before exporting.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gap-1.5" data-testid="export-pdf-confirm">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
