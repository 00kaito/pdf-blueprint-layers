import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {useDocument, useUI} from '@/lib/editor-context';
import {Document, Page, pdfjs} from 'react-pdf';
import {debounce} from '@/lib/utils';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';
import {getVisualDimensions} from '@/core/pdf-math';
import {Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useDrawing} from '@/hooks/useDrawing';
import {usePinchZoom} from '@/hooks/usePinchZoom';
import {useMeasure} from '@/hooks/useMeasure';
import {useSpacePan} from '@/hooks/useSpacePan';
import {useFingerPan} from '@/hooks/useFingerPan';
import {useStylusGuidance} from '@/hooks/useStylusGuidance';
import {MARQUEE_IGNORE, useMarquee} from '@/hooks/useMarquee';
import type {UIState} from '@/lib/types';
import {isStrokeTool, isTapTool} from '@/core/pointer-input';
import {feetPerUnit, formatFeet} from '@/core/measure';
import type {Box} from '@/core/snapping';
import {ObjectRenderer} from './Canvas/ObjectRenderer';
import {DrawingLayer} from './Canvas/DrawingLayer';
import {MeasureLayer} from './Canvas/MeasureLayer';
import {GuidesLayer} from './Canvas/GuidesLayer';
import {OverlayDocument} from './Canvas/OverlayDocument';
import {useCurrentUser} from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {useToast} from '@/hooks/use-toast';
import {floodFillRegion} from '@/core/flood-fill';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker URL to local Vite asset using the standard URL constructor
/** Single-key tool shortcuts (shown in the toolbar tooltips). */
export const TOOL_SHORTCUTS: Record<string, UIState['tool']> = {
  v: 'select',
  p: 'draw',
  b: 'fill',
  m: 'measure',
  k: 'calibrate',
};

/** Shift-drag moves objects in steps of this many feet. */
const DRAG_STEP_FEET = 0.5;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const Canvas = () => {
  const { data: user } = useCurrentUser();
  const isMobile = useIsMobile();
  const isTech = user?.role === 'TECH';
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { drawingPath, isDrawing, onPointerDown } = useDrawing(containerRef as React.RefObject<HTMLDivElement>);
  const measure = useMeasure(containerRef as React.RefObject<HTMLDivElement>);
  const marquee = useMarquee(containerRef as React.RefObject<HTMLDivElement>);
  const spacePan = useSpacePan(scrollRef as React.RefObject<HTMLDivElement>);
  const { lastPointerTypeRef } = useStylusGuidance(scrollRef as React.RefObject<HTMLDivElement>);
  const shortcutStateRef = useRef({ tool: uiState.tool, hasCalibration: !!docState.measureCalibration });
  shortcutStateRef.current = { tool: uiState.tool, hasCalibration: !!docState.measureCalibration };

  // Stable for the memoised ObjectRenderers; reads the current objects only when a drag needs them.
  const snapSourceRef = useRef({ objects: docState.objects, layers: docState.layers });
  snapSourceRef.current = { objects: docState.objects, layers: docState.layers };
  /** Shift-drag step: 0.5 ft (needs the measuring scale), following the tape when there is one. */
  const ftPerUnitValue = feetPerUnit(docState.measureCalibration);
  const dragStep = useMemo(
    () => ftPerUnitValue ? { step: DRAG_STEP_FEET / ftPerUnitValue, tape: uiState.measureTape } : null,
    [ftPerUnitValue, uiState.measureTape],
  );

  const getSnapTargets = useCallback((excludeId: string): Box[] => {
    const { objects, layers } = snapSourceRef.current;
    const visible = new Set(layers.filter(l => l.visible).map(l => l.id));
    return objects
      .filter(o => o.id !== excludeId && o.type !== 'path' && !o.isFill && visible.has(o.layerId))
      .map(o => ({ x: o.x, y: o.y, width: o.width, height: o.height }));
  }, []);
  const [, setNumPages] = useState<number>(0);

  useEffect(() => {
    if (isTech && uiState.tool !== 'select') {
      dispatch({ type: 'SET_TOOL', payload: 'select' });
    }
  }, [isTech, uiState.tool, dispatch]);

  const state = { ...docState, ...uiState };

  // Gesture guard shared by Pencil drawing, finger panning and two-finger zoom.
  const drawGuardRef = useRef({ tool: state.tool, stylusOnly: state.stylusOnly, isDrawing });
  drawGuardRef.current = { tool: state.tool, stylusOnly: state.stylusOnly, isDrawing: isDrawing || measure.isMeasuring || marquee.isSelecting };
  const fingerPan = useFingerPan(
    scrollRef as React.RefObject<HTMLDivElement>,
    state.stylusOnly && isStrokeTool(state.tool),
    () => drawGuardRef.current.isDrawing,
  );
  usePinchZoom(
    scrollRef as React.RefObject<HTMLDivElement>,
    containerRef as React.RefObject<HTMLDivElement>,
    () => drawGuardRef.current.isDrawing,
  );
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // `touchType` is Safari-only and missing from the DOM typings.
    const isStylus = (e: TouchEvent) =>
      Array.from(e.changedTouches).some(t => (t as Touch & { touchType?: string }).touchType === 'stylus');
    // Safety net for iPadOS Safari, which may still scroll / zoom a scrolling container despite
    // `touch-action: none` — and then cancels the pointer (pointercancel), dropping the stroke.
    // Cancelling the touch events does not stop pointer events, so the tools keep working.
    const onTouchStart = (e: TouchEvent) => {
      const { tool, stylusOnly } = drawGuardRef.current;
      // Controls on the plan (calibration length dialog, tape ✕) keep their taps and focus.
      if ((e.target as Element).closest('button, input, textarea, select, a, [role="dialog"], [data-no-marquee]')) return;
      if (isStrokeTool(tool)) {
        // A stylus always draws; a single finger draws unless stylus-only (then useFingerPan pans).
        // Two fingers are usePinchZoom's (it cancels its own touchmoves).
        if (isStylus(e) || (!stylusOnly && e.touches.length === 1)) e.preventDefault();
        return;
      }
      // Select tool: a stylus on empty canvas draws a selection rectangle — objects and buttons keep their taps.
      if (tool === 'select' && isStylus(e) && !(e.target as Element).closest(MARQUEE_IGNORE)) e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (drawGuardRef.current.isDrawing && e.cancelable) e.preventDefault();
    };
    scroller.addEventListener('touchstart', onTouchStart, { passive: false });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Calculate coordinates relative to the canvas, accounting for scale
      mousePosRef.current = {
        x: (e.clientX - rect.left) / state.scale,
        y: (e.clientY - rect.top) / state.scale
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [state.scale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Leave shortcuts (delete, undo…) to the field if user is typing in an input or contentEditable
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'UNDO' });
          return;
        }
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          dispatch({ type: 'REDO' });
          return;
        }
      }

      if (isTech) return;

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const { tool, hasCalibration } = shortcutStateRef.current;
        const shortcut = TOOL_SHORTCUTS[e.key.toLowerCase()];
        if (shortcut && !e.repeat) {
          e.preventDefault();
          // The tape needs a scale first, like the toolbar button.
          dispatch({ type: 'SET_TOOL', payload: shortcut === 'measure' && !hasCalibration ? 'calibrate' : shortcut });
          return;
        }
        // Esc = back to selecting (the overlay hand tool handles its own Esc).
        if (e.key === 'Escape' && tool !== 'select' && tool !== 'pan-overlay') {
          dispatch({ type: 'SET_TOOL', payload: 'select' });
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedObjectIds.length > 0) {
        dispatch({ type: 'DELETE_OBJECTS', payload: state.selectedObjectIds });
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'c') {
          e.preventDefault();
          console.log('[Canvas] CTRL+C detected');
          dispatch({ type: 'COPY_OBJECT' });
        } else if (key === 'v') {
          e.preventDefault();
          const isIncremental = e.shiftKey;
          console.log('[Canvas] CTRL+V detected. Shift (isIncremental):', isIncremental, 'Pos:', mousePosRef.current);
          dispatch({ 
            type: 'PASTE_OBJECT', 
            payload: { ...mousePosRef.current, isIncremental } 
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedObjectIds, dispatch, isTech]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isTech) return;
    if (state.tool === 'select') marquee.onPointerDown(e);
    else if (state.tool === 'draw') onPointerDown(e);
    else if (state.tool === 'measure' || state.tool === 'calibrate') measure.onPointerDown(e);
  };

  // Click (not pointerdown) so that a finger that starts scrolling never fills, stamps or deselects.
  const handleClick = (e: React.MouseEvent) => {
    if (isTech) {
      dispatch({ type: 'SELECT_OBJECT', payload: null });
      return;
    }
    if (isStrokeTool(state.tool)) return;
    // Stylus only: a finger tap does not fill or stamp (it may still deselect).
    if (state.stylusOnly && isTapTool(state.tool) && lastPointerTypeRef.current === 'touch') return;
    if (state.tool === 'fill') { handleFill(e); }
    else if (state.tool === 'stamp' && state.activeLayerId && state.autoNumbering.enabled && state.autoNumbering.template) {
       const rect = containerRef.current?.getBoundingClientRect();
       if (rect) {
          const x = (e.clientX - rect.left) / state.scale, y = (e.clientY - rect.top) / state.scale;
          const template = state.autoNumbering.template;
          const size = 50 / state.scale;
          const name = `${state.autoNumbering.prefix}${state.autoNumbering.counter.toString().padStart(2, '0')}`;
          dispatch({
            type: 'ADD_OBJECT',
            payload: { 
              id: uuidv4(), 
              type: template.type, 
              name, 
              x: x - size/2, 
              y: y - size/2, 
              width: size, 
              height: size, 
              layerId: state.activeLayerId, 
              content: template.content, 
              color: template.color, 
              rotation: 0,
              status: 'PLANNED'
            }
          });
          dispatch({ type: 'INCREMENT_COUNTER' });
       }
    } else { dispatch({ type: 'SELECT_OBJECT', payload: null }); }
  };

  /** Paint-bucket: fills the enclosed area of the main blueprint under the cursor. */
  const handleFill = (e: React.MouseEvent) => {
    const source = pageCanvasRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!source || !rect || !state.pdfFile) return;
    const x = (e.clientX - rect.left) / state.scale;
    const y = (e.clientY - rect.top) / state.scale;
    const result = floodFillRegion(source, x, y, state.fillColor);
    if (!result) {
      toast({ title: 'Nothing to fill', description: 'Click inside an area enclosed by lines, not on a line.' });
      return;
    }
    if (result.coverage > 0.5 && !window.confirm(
      `This fill covers ${Math.round(result.coverage * 100)}% of the page — the area is probably not closed. Fill anyway?`
    )) {
      return;
    }
    dispatch({
      type: 'ADD_FILL',
      payload: {
        newLayerId: uuidv4(),
        object: {
          id: uuidv4(),
          type: 'image',
          isFill: true,
          name: '',
          x: result.x,
          y: result.y,
          width: result.width,
          height: result.height,
          layerId: '', // set by the reducer to the Colors layer
          content: result.dataUrl,
          color: state.fillColor,
          opacity: state.fillOpacity,
          rotation: 0,
        },
      },
    });
  };

  const debouncedScroll = useMemo(() => debounce((scroll: { x: number, y: number }) => {
    dispatch({ type: 'SET_SCROLL', payload: scroll });
  }, 16), [dispatch]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    debouncedScroll({ x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isTech) return;
    const type = e.dataTransfer.getData('application/editor-object');
    const content = e.dataTransfer.getData('application/editor-content');
    if (type && state.activeLayerId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / state.scale, y = (e.clientY - rect.top) / state.scale;
        let baseW = 50, baseH = 50;
        if (type === 'text') { baseW = 200; baseH = 50; } else if (type === 'image') { baseW = 200; baseH = 200; }
        const width = baseW / state.scale, height = baseH / state.scale;
        dispatch({
          type: 'ADD_OBJECT',
          payload: { 
            id: uuidv4(), 
            type: type as any, 
            name: '', 
            x: x - width/2, 
            y: y - height/2, 
            width, 
            height, 
            layerId: state.activeLayerId, 
            content: content || (type === 'text' ? 'Double click to edit' : ''), 
            color: type === 'icon' ? '#ef4444' : '#000000', 
            rotation: 0, 
            fontSize: 16 / state.scale,
            status: 'PLANNED'
          }
        });
        dispatch({ type: 'SET_TOOL', payload: 'select' });
      }
    }
  };

  return (
    <div ref={scrollRef} data-canvas-scroller className={`flex-1 bg-muted/30 overflow-auto relative select-none${
      spacePan.panning || fingerPan.panning ? ' cursor-grabbing' : spacePan.spaceDown ? ' cursor-grab' : state.tool === 'fill' || isStrokeTool(state.tool) ? ' cursor-crosshair' : ''
    }`} 
      // Stroke tools suppress native Safari gestures for pen and touch. In stylus-only mode,
      // useFingerPan restores one-finger panning and usePinchZoom handles two fingers.
      style={{ touchAction: isStrokeTool(state.tool) ? 'none' : 'pan-x pan-y', WebkitTouchCallout: 'none' }}
      onPointerDown={handlePointerDown} onClick={handleClick} onScroll={handleScroll}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={handleDrop}
    >
      <div className="min-w-full min-h-full flex p-8">
        <div ref={containerRef} data-canvas-page className="relative shadow-lg origin-top-left bg-white m-auto" style={{ width: CANVAS_BASE_WIDTH * state.scale, minHeight: docState.pdfCanvasHeight * state.scale }}>
          {state.pdfFile ? (
            <Document file={state.pdfFile} onLoadSuccess={({numPages}) => setNumPages(numPages)} className="border border-border bg-white">
              <Page 
                canvasRef={pageCanvasRef}
                pageNumber={state.currentPage} 
                renderTextLayer={false} 
                renderAnnotationLayer={false} 
                width={CANVAS_BASE_WIDTH} 
                scale={state.scale} 
                onLoadSuccess={(page) => {
                  const [x1, y1, x2, y2] = page.view;
                  const pdfW = x2 - x1;
                  const pdfH = y2 - y1;
                  const rotation = page.rotate || 0;
                  const { vW, vH } = getVisualDimensions(pdfW, pdfH, rotation);
                  dispatch({ type: 'SET_PDF_DIMENSIONS', payload: { width: vW, height: vH } });
                }}
              />
            </Document>
          ) : (
             <div className="bg-white flex flex-col gap-4 items-center justify-center text-muted-foreground border border-dashed border-border relative" style={{ width: CANVAS_BASE_WIDTH * state.scale, height: CANVAS_BASE_HEIGHT * state.scale }}>
               <p>No PDF Loaded</p>
               {!isTech && (
                 <>
                   <input type="file" accept="application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) dispatch({ type: 'SET_PDF', payload: file }); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                   <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Upload PDF</Button>
                 </>
               )}
             </div>
          )}

          <OverlayDocument />
          <DrawingLayer 
            drawingPath={drawingPath} 
            isDrawing={isDrawing} 
            objects={state.objects}
            layers={state.layers}
            scale={state.scale}
            selectedObjectIds={state.selectedObjectIds}
            drawColor={state.drawColor}
            drawStrokeWidth={state.drawStrokeWidth}
          />
          <MeasureLayer
            tool={state.tool}
            scale={state.scale}
            calibration={state.measureCalibration}
            line={measure.line}
            tape={state.measureTape}
            onRemoveTape={() => dispatch({ type: 'SET_MEASURE_TAPE', payload: null })}
            pendingCalibration={measure.pendingCalibration}
            onCancelCalibration={measure.clearPendingCalibration}
            onCalibrate={(calibration) => {
              dispatch({ type: 'SET_MEASURE_CALIBRATION', payload: calibration });
              measure.clearPendingCalibration();
              dispatch({ type: 'SET_TOOL', payload: 'measure' });
              toast({ title: 'Scale set', description: `Reference line = ${formatFeet(calibration.feet)}${docState.projectId ? ', saved with the project' : ''}. Drag to measure any distance.` });
            }}
          />
          {marquee.rect && (
            <div
              className="absolute pointer-events-none border border-primary bg-primary/10 rounded-[1px]"
              style={{
                left: marquee.rect.x * state.scale,
                top: marquee.rect.y * state.scale,
                width: marquee.rect.width * state.scale,
                height: marquee.rect.height * state.scale,
                zIndex: 45,
              }}
              data-testid="selection-rect"
            />
          )}
          <GuidesLayer scale={state.scale} tape={state.measureTape} ftPerUnit={feetPerUnit(state.measureCalibration)} />

          {state.objects.map((obj) => {
            const layer = state.layers.find(l => l.id === obj.layerId);
            if (!layer?.visible || obj.type === 'path') return null;
            const disableMovement = isMobile && user?.role === 'PM';
            return (
              <ObjectRenderer 
                key={obj.id} 
                obj={obj} 
                layer={layer} 
                scale={state.scale}
                tool={state.tool}
                selectedObjectIds={state.selectedObjectIds}
                showStatusColors={state.showStatusColors}
                disableMovement={disableMovement}
                snapEnabled={state.snapEnabled}
                getSnapTargets={getSnapTargets}
                pageHeight={docState.pdfCanvasHeight}
                dragStep={dragStep}
                touchLayout={state.ipadMode}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
