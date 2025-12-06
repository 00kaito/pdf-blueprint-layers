import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { pdfjs, Document, Page } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker URL dynamically to match version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const Canvas = () => {
  const { state, dispatch } = useEditor();
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawingPath, setDrawingPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (state.tool === 'draw' && state.activeLayerId) {
      setIsDrawing(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / state.scale;
        const y = (e.clientY - rect.top) / state.scale;
        setDrawingPath(`M ${x} ${y}`);
      }
    } else {
      dispatch({ type: 'SELECT_OBJECT', payload: null });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && state.tool === 'draw') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / state.scale;
        const y = (e.clientY - rect.top) / state.scale;
        setDrawingPath((prev) => `${prev} L ${x} ${y}`);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && state.activeLayerId) {
      setIsDrawing(false);
      if (drawingPath.length > 10) {
        dispatch({
          type: 'ADD_OBJECT',
          payload: {
            id: uuidv4(),
            type: 'path',
            x: 0,
            y: 0,
            width: 600, 
            height: 800,
            layerId: state.activeLayerId,
            pathData: drawingPath,
            color: '#000000'
          }
        });
      }
      setDrawingPath('');
    }
  };

  return (
    <div 
      className="flex-1 bg-muted/30 overflow-auto flex justify-center p-8 relative select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        ref={containerRef}
        className="relative shadow-lg"
        style={{ 
          transform: `scale(${state.scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.1s ease-out'
        }}
      >
        {state.pdfFile ? (
          <Document
            file={state.pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            className="border border-border bg-white"
            loading={
              <div className="w-[600px] h-[800px] flex items-center justify-center bg-white text-muted-foreground">
                Loading PDF...
              </div>
            }
            error={
               <div className="w-[600px] h-[800px] flex items-center justify-center bg-white text-destructive">
                Failed to load PDF
              </div>
            }
          >
            <Page 
              pageNumber={state.currentPage} 
              renderTextLayer={false} 
              renderAnnotationLayer={false}
              width={600} 
            />
          </Document>
        ) : (
           <div className="w-[600px] h-[800px] bg-white flex items-center justify-center text-muted-foreground border border-dashed border-border">
             No PDF Loaded
           </div>
        )}

        <svg 
          className="absolute inset-0 pointer-events-none overflow-visible" 
          style={{ width: '100%', height: '100%', zIndex: 10 }}
        >
          {state.objects.map(obj => {
             const layer = state.layers.find(l => l.id === obj.layerId);
             if (obj.type === 'path' && obj.pathData && layer?.visible) {
               return (
                 <path 
                   key={obj.id} 
                   d={obj.pathData} 
                   stroke={obj.color || "black"} 
                   strokeWidth="2" 
                   fill="none"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   className={cn(
                     "cursor-pointer pointer-events-auto transition-colors",
                     state.selectedObjectId === obj.id ? "stroke-primary" : "stroke-black hover:stroke-primary/50"
                   )}
                   onClick={(e) => {
                      e.stopPropagation();
                      if (state.tool === 'select') {
                        dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
                      }
                   }}
                 />
               )
             }
             return null;
          })}
          {isDrawing && (
             <path 
               d={drawingPath} 
               stroke="black" 
               strokeWidth="2" 
               fill="none" 
               strokeLinecap="round"
               strokeLinejoin="round"
             />
          )}
        </svg>

        {state.objects.map((obj) => {
          const layer = state.layers.find(l => l.id === obj.layerId);
          if (!layer?.visible || obj.type === 'path') return null;

          return (
            <Rnd
              key={obj.id}
              size={{ width: obj.width, height: obj.height }}
              position={{ x: obj.x, y: obj.y }}
              onDragStop={(e: any, d) => {
                dispatch({
                  type: 'UPDATE_OBJECT',
                  payload: { id: obj.id, updates: { x: d.x, y: d.y } }
                });
              }}
              onResizeStop={(e: any, direction, ref, delta, position) => {
                dispatch({
                  type: 'UPDATE_OBJECT',
                  payload: {
                    id: obj.id,
                    updates: {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    }
                  }
                });
              }}
              bounds="parent"
              disableDragging={layer.locked || state.tool !== 'select'}
              enableResizing={!layer.locked && state.tool === 'select'}
              onClick={(e) => {
                 e.stopPropagation();
                 dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
              }}
              className={cn(
                "group z-20",
                state.selectedObjectId === obj.id ? "ring-1 ring-primary ring-offset-1" : "",
                layer.locked ? "pointer-events-none" : "cursor-move"
              )}
            >
              {obj.type === 'text' ? (
                <div 
                  className={cn(
                    "w-full h-full p-1 outline-none transition-colors",
                    state.selectedObjectId === obj.id ? "bg-primary/5" : "hover:bg-primary/5"
                  )}
                  contentEditable={state.tool === 'text'}
                  suppressContentEditableWarning
                  onBlur={(e) => dispatch({
                    type: 'UPDATE_OBJECT',
                    payload: { id: obj.id, updates: { content: e.currentTarget.textContent || '' } }
                  })}
                  style={{ fontSize: obj.fontSize, color: obj.color }}
                >
                  {obj.content}
                </div>
              ) : obj.type === 'image' ? (
                 <img src={obj.content} alt="uploaded" className="w-full h-full object-contain pointer-events-none" />
              ) : (
                 <div className="w-full h-full bg-red-500 rounded-md shadow-sm" style={{ backgroundColor: obj.color }} />
              )}
            </Rnd>
          );
        })}
      </div>
    </div>
  );
};
