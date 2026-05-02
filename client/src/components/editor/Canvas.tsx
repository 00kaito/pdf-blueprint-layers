import React, {useEffect, useMemo, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {useDocument, useUI} from '@/lib/editor-context';
import {Document, Page, pdfjs} from 'react-pdf';
import {debounce} from '@/lib/utils';
import {CANVAS_BASE_HEIGHT, CANVAS_BASE_WIDTH} from '@/core/constants';
import {getVisualDimensions} from '@/core/pdf-math';
import {Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useDrawing} from '@/hooks/useDrawing';
import {useTouchGestures} from '@/hooks/useTouchGestures';
import {ObjectRenderer} from './Canvas/ObjectRenderer';
import {DrawingLayer} from './Canvas/DrawingLayer';
import {OverlayDocument} from './Canvas/OverlayDocument';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker URL to local Vite asset
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

export const Canvas = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const { drawingPath, isDrawing, onMouseDown, onMouseMove, onMouseUp } = useDrawing(containerRef as React.RefObject<HTMLDivElement>);
  const [, setNumPages] = useState<number>(0);

  const touchGestures = useTouchGestures({
    onTap: () => {
      dispatch({ type: 'SELECT_OBJECT', payload: null });
    }
  });

  const state = { ...docState, ...uiState };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if user is typing in an input or contentEditable
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedObjectIds.length > 0) {
        dispatch({ type: 'DELETE_OBJECTS', payload: state.selectedObjectIds });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedObjectIds, dispatch]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (state.tool === 'draw') { onMouseDown(e); }
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

  const debouncedScroll = useMemo(() => debounce((scroll: { x: number, y: number }) => {
    dispatch({ type: 'SET_SCROLL', payload: scroll });
  }, 16), [dispatch]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    debouncedScroll({ x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
    <div className="flex-1 bg-muted/30 overflow-auto relative select-none" 
      onMouseDown={handleMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onScroll={handleScroll}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={handleDrop}
      {...touchGestures}
    >
      <div className="min-w-full min-h-full flex p-8">
        <div ref={containerRef} className="relative shadow-lg origin-top-left bg-white m-auto" style={{ width: CANVAS_BASE_WIDTH * state.scale, minHeight: docState.pdfCanvasHeight * state.scale }}>
          {state.pdfFile ? (
            <Document file={state.pdfFile} onLoadSuccess={({numPages}) => setNumPages(numPages)} className="border border-border bg-white">
              <Page 
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
               <input type="file" accept="application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) dispatch({ type: 'SET_PDF', payload: file }); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
               <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Upload PDF</Button>
             </div>
          )}

          <OverlayDocument />
          <DrawingLayer drawingPath={drawingPath} isDrawing={isDrawing} />

          {state.objects.map((obj) => {
            const layer = state.layers.find(l => l.id === obj.layerId);
            if (!layer?.visible || obj.type === 'path') return null;
            return <ObjectRenderer key={obj.id} obj={obj} layer={layer} />;
          })}
        </div>
      </div>
    </div>
  );
};
