import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { pdfjs, Document, Page } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Heart, 
  Hexagon, 
  ArrowRight,
  RotateCw,
  Camera,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker URL dynamically to match version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const IconRenderer = ({ iconType, color }: { iconType: string, color?: string }) => {
  const props = { className: "w-full h-full", style: { color } };
  
  switch (iconType) {
    case 'circle': return <Circle {...props} />;
    case 'triangle': return <Triangle {...props} />;
    case 'star': return <Star {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'hexagon': return <Hexagon {...props} />;
    case 'arrow-right': return <ArrowRight {...props} />;
    case 'camera': return <Camera {...props} />;
    case 'square':
    default: return <Square {...props} />;
  }
};

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
        let x = (e.clientX - rect.left) / state.scale;
        let y = (e.clientY - rect.top) / state.scale;
        
        if (e.shiftKey) {
          // Constrain to vertical or horizontal based on previous point
          // The drawingPath is "M x y L x y ...".
          // We need to find the last point.
          // Since we are appending " L x y", we can parse the string or just store last point in state.
          // Parsing is safer to sync with path string.
          const parts = drawingPath.trim().split(' ');
          // parts structure: ["M", x, y, "L", x, y, ...]
          if (parts.length >= 3) {
             const lastY = parseFloat(parts[parts.length - 1]);
             const lastX = parseFloat(parts[parts.length - 2]);
             
             const dx = Math.abs(x - lastX);
             const dy = Math.abs(y - lastY);
             
             if (dx > dy) {
                // Horizontal
                y = lastY;
             } else {
                // Vertical
                x = lastX;
             }
          }
        }

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
            name: 'Drawing',
            x: 0,
            y: 0,
            width: 600, 
            height: 800,
            layerId: state.activeLayerId,
            pathData: drawingPath,
            color: '#000000',
            strokeWidth: 2
          }
        });
      }
      setDrawingPath('');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // We update scroll position in state so Toolbar can use it for placement
    // Debouncing would be better in a real app, but for prototype direct dispatch is OK
    dispatch({
      type: 'SET_SCROLL',
      payload: { x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop }
    });
  };

  return (
    <div 
      className="flex-1 bg-muted/30 overflow-auto relative select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onScroll={handleScroll}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/editor-object');
        const content = e.dataTransfer.getData('application/editor-content');
        
        if (type && state.activeLayerId) {
           // We need to calculate position relative to the Canvas content, not the viewport
           // The rect should be the containerRef (the white canvas)
           const rect = containerRef.current?.getBoundingClientRect();
           if (rect) {
              // Calculate position relative to canvas, accounting for scale
              const x = (e.clientX - rect.left) / state.scale;
              const y = (e.clientY - rect.top) / state.scale;
              
              // Calculate dimensions based on scale
              // We want visual size to be consistent regardless of zoom
              // e.g. at scale 10, a 200px object covers 2000px screen pixels.
              // We want it to look like ~200px screen pixels.
              // So width = 200 / scale
              let width = 50 / state.scale;
              let height = 50 / state.scale;
              if (type === 'text') { width = 200 / state.scale; height = 50 / state.scale; }
              if (type === 'image') { width = 200 / state.scale; height = 200 / state.scale; }
              
              // Center the object on the cursor
              const finalX = x - width / 2;
              const finalY = y - height / 2;

              dispatch({
                type: 'ADD_OBJECT',
                payload: {
                  id: uuidv4(),
                  type: type as any,
                  name: type === 'text' ? 'Text' : (type === 'image' ? 'Image' : 'Object'),
                  x: finalX,
                  y: finalY,
                  width,
                  height,
                  layerId: state.activeLayerId,
                  content: content || (type === 'text' ? 'Double click to edit' : ''),
                  color: type === 'icon' ? '#ef4444' : '#000000',
                  rotation: 0,
                  fontSize: 16 / state.scale // Also scale font size for text so it's not huge
                }
              });
              dispatch({ type: 'SET_TOOL', payload: 'select' });
           }
        }
      }}
    >
      <div className="min-w-full min-h-full flex p-8">
      <div 
        ref={containerRef}
        className="relative shadow-lg origin-top-left bg-white m-auto"
        // Removing transform scale here to allow native scroll
        style={{ 
          // We don't scale the container with CSS transform anymore to allow proper scrolling
          // transform: `scale(${state.scale})`, 
          // transformOrigin: 'top center',
          // transition: 'transform 0.1s ease-out',
          width: 600 * state.scale,
          // Height will be determined by content or aspect ratio if needed, but let's assume height grows too
          minHeight: 800 * state.scale
        }}
      >
        {state.pdfFile ? (
          <Document
            file={state.pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            className="border border-border bg-white"
            loading={
              <div className="flex items-center justify-center bg-white text-muted-foreground" style={{ width: 600 * state.scale, height: 800 * state.scale }}>
                Loading PDF...
              </div>
            }
            error={
               <div className="flex items-center justify-center bg-white text-destructive" style={{ width: 600 * state.scale, height: 800 * state.scale }}>
                Failed to load PDF
              </div>
            }
          >
            <Page 
              pageNumber={state.currentPage} 
              renderTextLayer={false} 
              renderAnnotationLayer={false}
              width={600} 
              scale={state.scale} // Use native React-PDF scaling for clarity
            />
          </Document>
        ) : (
           <div className="bg-white flex flex-col gap-4 items-center justify-center text-muted-foreground border border-dashed border-border relative" style={{ width: 600 * state.scale, height: 800 * state.scale }}>
             <p>No PDF Loaded</p>
             <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type === 'application/pdf') {
                      dispatch({ type: 'SET_PDF', payload: file });
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </Button>
             </div>
           </div>
        )}

        <svg 
          className="absolute inset-0 pointer-events-none overflow-visible" 
          style={{ width: '100%', height: '100%', zIndex: 10 }}
        >
          {state.objects.map(obj => {
             const layer = state.layers.find(l => l.id === obj.layerId);
             if (obj.type === 'path' && obj.pathData && layer?.visible) {
               // Scale path data manually since SVG is overlaying the scaled PDF
               // We need to parse and scale the path commands
               const scaledPath = obj.pathData.split(' ').map((val, i) => {
                 if (['M', 'L'].includes(val)) return val;
                 return parseFloat(val) * state.scale;
               }).join(' ');

               return (
                 <path 
                   key={obj.id} 
                   d={scaledPath} 
                   stroke={obj.color || "black"} 
                   strokeWidth={(obj.strokeWidth || 2) * state.scale} 
                   fill="none"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   className={cn(
                     "cursor-pointer pointer-events-auto transition-colors",
                     state.selectedObjectId === obj.id ? "stroke-primary" : "stroke-black hover:stroke-primary/50"
                   )}
                   onClick={(e: any) => {
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
               d={drawingPath.split(' ').map((val, i) => {
                 if (['M', 'L'].includes(val)) return val;
                 return parseFloat(val) * state.scale;
               }).join(' ')} 
               stroke="black" 
               strokeWidth={2 * state.scale} 
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
              size={{ width: obj.width * state.scale, height: obj.height * state.scale }}
              position={{ x: obj.x * state.scale, y: obj.y * state.scale }}
              // scale={state.scale} // We are manually scaling dimensions and position, so scale should be 1
              scale={1} 
              onDragStop={(e: any, d) => {
                dispatch({
                  type: 'UPDATE_OBJECT',
                  payload: { id: obj.id, updates: { x: d.x / state.scale, y: d.y / state.scale } }
                });
              }}
              onResizeStop={(e: any, direction, ref, delta, position) => {
                dispatch({
                  type: 'UPDATE_OBJECT',
                  payload: {
                    id: obj.id,
                    updates: {
                      width: parseInt(ref.style.width) / state.scale,
                      height: parseInt(ref.style.height) / state.scale,
                      x: position.x / state.scale,
                      y: position.y / state.scale
                    }
                  }
                });
              }}
              resizeHandleStyles={{
                bottomRight: { cursor: 'nwse-resize', width: '20px', height: '20px', right: '-10px', bottom: '-10px' },
                bottomLeft: { cursor: 'nesw-resize', width: '20px', height: '20px', left: '-10px', bottom: '-10px' },
                topRight: { cursor: 'nesw-resize', width: '20px', height: '20px', right: '-10px', top: '-10px' },
                topLeft: { cursor: 'nwse-resize', width: '20px', height: '20px', left: '-10px', top: '-10px' },
              }}
              resizeHandleClasses={{
                bottomRight: "bg-primary w-2 h-2 rounded-full",
                bottomLeft: "bg-primary w-2 h-2 rounded-full",
                topRight: "bg-primary w-2 h-2 rounded-full",
                topLeft: "bg-primary w-2 h-2 rounded-full",
              }}
              bounds="parent"
              disableDragging={layer.locked || state.tool !== 'select'}
              enableResizing={!layer.locked && state.selectedObjectId === obj.id && (state.tool === 'select' || state.tool === 'text')}
              onClick={(e: any) => {
                 e.stopPropagation();
                 if (state.selectedObjectId !== obj.id) {
                    dispatch({ type: 'SET_TOOL', payload: 'select' });
                    dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
                 }
              }}
              onDoubleClick={(e: any) => {
                e.stopPropagation();
                if (obj.type === 'text') {
                   dispatch({ type: 'SET_TOOL', payload: 'text' });
                   dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
                }
              }}
              className={cn(
                "group z-20",
                state.selectedObjectId === obj.id ? "ring-1 ring-primary ring-offset-1" : "",
                layer.locked ? "pointer-events-none" : "cursor-move"
              )}
              style={{
                transform: `rotate(${obj.rotation || 0}deg)`
              }}
            >
              {/* Rotation Handle */}
              {state.selectedObjectId === obj.id && !layer.locked && (
                <div 
                  className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-primary rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-muted z-50"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startY = e.clientY;
                    const startRotation = obj.rotation || 0;
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const deltaY = moveEvent.clientY - startY;
                      // Simple rotation logic: moving mouse up/down rotates object
                      // Snap to 45 degree increments
                      const rawRotation = (startRotation + deltaY * 2) % 360; 
                      const snapAngle = 45;
                      const newRotation = Math.round(rawRotation / snapAngle) * snapAngle;

                      dispatch({
                        type: 'UPDATE_OBJECT',
                        payload: { id: obj.id, updates: { rotation: newRotation } }
                      });
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <RotateCw className="w-3 h-3 text-primary" />
                </div>
              )}

              <div 
                className="w-full h-full relative"
                style={{ 
                  transform: `rotate(${obj.rotation || 0}deg)`,
                  // Use a separate wrapper for rotation to separate it from Rnd's transform if needed, 
                  // but Rnd applies transform for position. 
                  // Rnd applies position via translate3d. We need to append rotate.
                  // actually we are rotating the inner content, but the drag handle is outside.
                }} 
              >
                  {obj.type === 'text' ? (
                    <div 
                      className={cn(
                        "w-full h-full p-1 outline-none transition-colors whitespace-pre-wrap break-words overflow-hidden",
                        state.selectedObjectId === obj.id ? "bg-primary/5" : "hover:bg-primary/5"
                      )}
                      contentEditable={state.tool === 'text'}
                      suppressContentEditableWarning
                      onBlur={(e) => dispatch({
                        type: 'UPDATE_OBJECT',
                        payload: { id: obj.id, updates: { content: e.currentTarget.textContent || '' } }
                      })}
                      style={{ 
                        fontSize: (obj.fontSize || 16) * state.scale, 
                        color: obj.color,
                        fontWeight: obj.fontWeight || 'normal'
                      }}
                    >
                      {obj.content}
                    </div>
                  ) : obj.type === 'image' ? (
                     <img src={obj.content} alt="uploaded" className="w-full h-full object-contain pointer-events-none" />
                  ) : obj.type === 'icon' ? (
                     <div className="w-full h-full p-1">
                       <IconRenderer iconType={obj.content || 'square'} color={obj.color} />
                     </div>
                  ) : (
                     <div className="w-full h-full bg-red-500 rounded-md shadow-sm" style={{ backgroundColor: obj.color }} />
                  )}
              </div>
            </Rnd>
          );
        })}
      </div>
      </div>
    </div>
  );
};
