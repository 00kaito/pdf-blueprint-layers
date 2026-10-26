import React, {useEffect, useRef, useState} from 'react';
import {Crop, Download, Loader2, RectangleHorizontal, RectangleVertical} from 'lucide-react';
import {useExport} from '@/hooks/useExport';
import {useDocument, useUI} from '@/lib/editor-context';
import {Slider} from '@/components/ui/slider';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {CANVAS_BASE_WIDTH} from '@/core/constants';
import {cropForPaper, PAPER_SIZES, type PaperId, pageOrientation} from '@/core/paper';
import type {ExportCrop} from '@/lib/types';

const WHOLE_PAGE = 'page';

/** Paper size and orientation of the export crop; "Whole page" (when allowed) = no crop. */
export const PaperPicker = ({ crop, pageW, pageH, onChange, allowWholePage = true }: {
  crop: ExportCrop | null | undefined;
  /** Page size in unscaled canvas units. */
  pageW: number;
  pageH: number;
  onChange: (crop: ExportCrop | null) => void;
  allowWholePage?: boolean;
}) => {
  const orientation = crop?.orientation ?? pageOrientation(pageW, pageH);
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={crop?.paper ?? WHOLE_PAGE}
        onValueChange={(value) => onChange(value === WHOLE_PAGE
          ? null
          : cropForPaper(value as PaperId, orientation, pageW, pageH, crop))}
      >
        <SelectTrigger className="h-8 w-44 text-xs" data-testid="export-paper">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowWholePage && <SelectItem value={WHOLE_PAGE} className="text-xs">Whole page (no crop)</SelectItem>}
          {(Object.keys(PAPER_SIZES) as PaperId[]).map(id => (
            <SelectItem key={id} value={id} className="text-xs">{PAPER_SIZES[id].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {crop && (
        <Button
          type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
          onClick={() => onChange(cropForPaper(crop.paper, orientation === 'landscape' ? 'portrait' : 'landscape', pageW, pageH, crop))}
          title="Switch orientation"
          data-testid="export-orientation"
        >
          {orientation === 'landscape' ? <RectangleHorizontal className="h-4 w-4" /> : <RectangleVertical className="h-4 w-4" />}
          {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
        </Button>
      )}
    </div>
  );
};

/** Asks for the PDF's file name (the project name by default) and the print paper, then exports. */
export const ExportPdfDialog = () => {
  const { handleFlattenAndDownload, projectName } = useExport();
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const open = uiState.exportStep === 'dialog';
  const setStep = (step: typeof uiState.exportStep) => dispatch({ type: 'SET_EXPORT_STEP', payload: step });
  const { labelFontSize, crop, includeCableSummary } = docState.exportSettings;
  const pageW = CANVAS_BASE_WIDTH;
  const pageH = docState.pdfCanvasHeight;
  const setCrop = (value: ExportCrop | null) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { crop: value } });
  const [name, setName] = useState(projectName);
  const [busy, setBusy] = useState(false);
  // Every opening starts from the project name — coming back from adjusting the crop keeps the typed one.
  const prevStepRef = useRef(uiState.exportStep);
  useEffect(() => {
    if (uiState.exportStep === 'dialog' && prevStepRef.current === 'closed') setName(projectName);
    prevStepRef.current = uiState.exportStep;
  }, [uiState.exportStep, projectName]);

  const exportPdf = async () => {
    setBusy(true);
    try {
      await handleFlattenAndDownload(name.trim() || projectName);
      setStep('closed');
    } finally {
      setBusy(false);
    }
  };

  const adjustCrop = () => {
    // The crop frame takes over the plan, so no tool stays half-used underneath.
    dispatch({ type: 'SET_TOOL', payload: 'select' });
    setStep('crop');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => setStep(o ? 'dialog' : 'closed')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
          <DialogDescription>Flattened blueprint with its layers.</DialogDescription>
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
            <Label className="text-xs">Print paper</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <PaperPicker crop={crop} pageW={pageW} pageH={pageH} onChange={setCrop} />
              {crop && (
                <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" onClick={adjustCrop} data-testid="export-adjust-crop">
                  <Crop className="h-4 w-4" /> Adjust area
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {crop
                ? 'The framed part of the plan fills the sheet exactly — print at 100% / actual size.'
                : 'The plan page keeps its own size. Pick a paper to crop a part of the plan onto it.'}
            </p>
          </div>
          <div className="flex items-start gap-2 pt-3">
            <Checkbox
              id="export-cable-summary"
              checked={!!includeCableSummary}
              onCheckedChange={(checked) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { includeCableSummary: checked === true } })}
              data-testid="export-cable-summary"
            />
            <div className="space-y-0.5">
              <Label htmlFor="export-cable-summary" className="text-xs cursor-pointer">Include cable summary</Label>
              <p className="text-[10px] text-muted-foreground">Cable totals, legend and device schedule pages after the plan.</p>
            </div>
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
            <Button type="button" variant="outline" onClick={() => setStep('closed')}>Cancel</Button>
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
