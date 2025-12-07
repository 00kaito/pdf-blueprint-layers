import React from 'react';
import { useEditor } from '@/lib/editor-context';
import { 
  MousePointer2, 
  Type, 
  Image as ImageIcon, 
  Pencil, 
  Download, 
  Save, 
  ZoomIn, 
  ZoomOut,
  Trash2,
  Square,
  Layers,
  Upload,
  FolderOpen,
  Star,
  Heart,
  Circle,
  Triangle,
  Hexagon,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { v4 as uuidv4 } from 'uuid';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PDFDocument, 
  rgb, 
  StandardFonts, 
  degrees, 
  translate, 
  rotateDegrees, 
  pushGraphicsState, 
  popGraphicsState 
} from 'pdf-lib';
import { saveAs } from 'file-saver';

// Helper to convert hex to RGB for pdf-lib
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

// Helper to convert degrees to radians
const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);

export const Toolbar = () => {
  const { state, dispatch } = useEditor();

  // Calculate center of visible area
  const getCenterPosition = (width: number, height: number) => {
    // Current visible center relative to the scaled canvas
    // Canvas container has padding 32px (p-8)
    // We want to place object in the middle of current view
    // State has scrollPos (x, y)
    // The canvas is scaled.
    // If scrollPos is 0,0, we are at top left.
    // But we are centering the canvas in the viewport if it fits.
    
    // Simplification: Place at scrollPos + viewport/2, converted to unscaled coords
    // Let's assume a viewport roughly 800x600 for now or just use scrollPos
    
    // Better: Just use scrollPos.y + 100 as a start, but we need to account for scale
    
    // If we assume the viewport is roughly window size (e.g. 1000x800)
    // Center is (scrollPos.x + windowWidth/2) / scale
    
    // Let's approximate viewport center
    const viewportCenterX = (state.scrollPos?.x || 0) + 300; // 300 is half of ~600 sidebar-less width
    const viewportCenterY = (state.scrollPos?.y || 0) + 300; 
    
    return {
      x: Math.max(0, viewportCenterX / state.scale - width / 2),
      y: Math.max(0, viewportCenterY / state.scale - height / 2)
    };
  };

  const handleAddText = () => {
    if (!state.activeLayerId) return;
    const { x, y } = getCenterPosition(200 / state.scale, 50 / state.scale);
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'text',
        x,
        y,
        width: 200 / state.scale,
        height: 50 / state.scale,
        layerId: state.activeLayerId,
        content: 'Double click to edit',
        fontSize: 16 / state.scale,
        color: '#000000',
        rotation: 0
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  };

  const handleAddIcon = (iconType: string) => {
    if (!state.activeLayerId) return;
    const { x, y } = getCenterPosition(50 / state.scale, 50 / state.scale);
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'icon',
        x,
        y,
        width: 50 / state.scale,
        height: 50 / state.scale,
        layerId: state.activeLayerId,
        color: '#ef4444',
        content: iconType, // store icon name in content
        rotation: 0
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.activeLayerId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const { x, y } = getCenterPosition(200 / state.scale, 200 / state.scale);
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(),
          type: 'image',
          x,
          y,
          width: 200 / state.scale,
          height: 200 / state.scale,
          layerId: state.activeLayerId!,
          content: url,
          rotation: 0
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProjectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.layers && json.objects) {
          dispatch({
            type: 'IMPORT_PROJECT',
            payload: {
              layers: json.layers,
              objects: json.objects
            }
          });
        }
      } catch (error) {
        console.error('Failed to parse project file', error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = () => {
    if (state.selectedObjectId) {
      dispatch({ type: 'DELETE_OBJECT', payload: state.selectedObjectId });
    }
  };

  const handleMoveToLayer = (layerId: string) => {
    if (state.selectedObjectId) {
      dispatch({
        type: 'UPDATE_OBJECT',
        payload: { id: state.selectedObjectId, updates: { layerId } }
      });
    }
  };

  const selectedObject = state.objects.find(o => o.id === state.selectedObjectId);

  const handleExportProject = () => {
    const projectData = JSON.stringify({
      layers: state.layers,
      objects: state.objects,
    });
    const blob = new Blob([projectData], { type: 'application/json' });
    saveAs(blob, 'project.json');
  };

  const handleFlattenAndDownload = async () => {
    if (!state.pdfFile) return;

    const arrayBuffer = await state.pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[state.currentPage - 1];
    const { width, height } = page.getSize();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const obj of state.objects) {
       const layer = state.layers.find(l => l.id === obj.layerId);
       if (!layer?.visible) continue;

       // Fix Y coordinate flip and origin difference
       // PDF coordinate system starts at bottom-left, HTML/Canvas starts at top-left.
       // The 'y' from state is relative to the top of the canvas div.
       
       // Calculate scale factor if PDF page size differs from our 600px preview width
       const scaleFactor = width / 600;
       
       const scaledX = obj.x * scaleFactor;
       const scaledY = obj.y * scaleFactor;
       const scaledWidth = obj.width * scaleFactor;
       const scaledHeight = obj.height * scaleFactor;
       const scaledFontSize = (obj.fontSize || 16) * scaleFactor;

       const pdfY = height - scaledY - scaledHeight;
       const rotation = degrees(obj.rotation || 0);

       // Rotation logic:
       // We want to rotate around the CENTER of the object.
       // PDF-lib rotates around the bottom-left of the drawn element by default if we just pass 'rotate'.
       // To rotate around center (cx, cy):
       // 1. Translate to center: translate(cx, cy)
       // 2. Rotate: rotate(angle)
       // 3. Translate back: translate(-cx, -cy)
       // Or simpler with pdf-lib:
       // Calculate the new bottom-left position that would result in the visual center being the same.
       // However, pdf-lib's drawImage/Text `rotate` option rotates the object around its own origin (bottom-left)
       // AND then places it at x,y. 
       // Wait, no. `rotate` option rotates the coordinate system relative to the anchor?
       // Let's use standard affine transformation logic manually if needed, or adjust x/y.
       
       // Correct approach for pdf-lib rotation around center:
       // The 'rotate' prop in drawImage/drawText rotates the object around its anchor (usually bottom-left).
       // We want center rotation.
       // Center C = (x + w/2, y + h/2)
       // If we rotate around bottom-left A=(x,y), the center moves to C'.
       // We want the final center to be C.
       // So we need to shift the object by vector (C - C').
       
       // Actually, there is a simpler way:
       // pdf-lib `rotate` option rotates the object around its origin (bottom-left)
       // We need to move the origin such that after rotation, the center lands where we want.
       
       // Let's implement the shift:
       // Angle theta (radians)
       const theta = degreesToRadians(obj.rotation || 0);
       const cos = Math.cos(theta);
       const sin = Math.sin(theta);
       
       // Dimensions
       const w = scaledWidth;
       const h = scaledHeight; // For text, this is approximate
       
       // We want the visual center to be at:
       const cx = scaledX + w / 2;
       const cy = pdfY + h / 2;
       
       // If we draw at (x', y') with rotation theta, the center will be at:
       // C'x = x' + (w/2 * cos - h/2 * sin)
       // C'y = y' + (w/2 * sin + h/2 * cos)
       // We set C' = (cx, cy) and solve for x', y'.
       
       const rotateX = cx - (w / 2 * cos - h / 2 * sin);
       const rotateY = cy - (w / 2 * sin + h / 2 * cos);

       if (obj.type === 'text' && obj.content) {
          // Text height is tricky, let's assume fontSize is roughly height
          // For text, origin is usually baseline-left. 
          // pdf-lib drawText y is baseline.
          // Our pdfY is bottom of the bounding box.
          // Let's just use the calculated rotateX/Y as the anchor point.
          
          page.drawText(obj.content, {
            x: rotateX,
            y: rotateY, // This might need adjustment for text baseline vs bottom
            size: scaledFontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
            rotate: rotation,
          });
       } else if (obj.type === 'image' && obj.content) {
          try {
            let image;
            if (obj.content.startsWith('data:image/png')) {
              image = await pdfDoc.embedPng(obj.content);
            } else if (obj.content.startsWith('data:image/jpeg')) {
              image = await pdfDoc.embedJpg(obj.content);
            }

            if (image) {
              page.drawImage(image, {
                x: rotateX,
                y: rotateY,
                width: scaledWidth,
                height: scaledHeight,
                rotate: rotation,
              });
            }
          } catch (e) {
            console.error("Failed to embed image", e);
          }
       } else if (obj.type === 'icon') {
          // Draw geometric shapes based on icon type
          const iconType = obj.content || 'square';
          const color = obj.color ? hexToRgb(obj.color) : rgb(0.937, 0.266, 0.266); // #ef4444 default
          
          if (iconType === 'circle') {
             // Draw circle (ellipse with equal radii)
             // Ellipse rotation is supported
             page.drawEllipse({
               x: cx, // Ellipse draws from center
               y: cy,
               xScale: scaledWidth / 2,
               yScale: scaledHeight / 2,
               color: color,
               opacity: 1,
               rotate: rotation,
             });
          } else if (iconType === 'triangle') {
             // For paths, we need to manually rotate points or use SVG path rotation if supported
             // pdf-lib drawSvgPath doesn't support 'rotate' prop directly in all versions, but let's check.
             // It does support `rotate`.
             // But simpler to just draw the path at the calculated coordinates.
             
             // Triangle path relative to 0,0
             const p1 = { x: 0, y: 0 };
             const p2 = { x: w/2, y: h };
             const p3 = { x: w, y: 0 };
             
             // We need to rotate these points around (w/2, h/2) and then translate to (scaledX, pdfY)
             // Actually, page.drawSvgPath takes a path string.
             // If we rely on `rotate` prop of drawSvgPath, does it rotate around origin of the path (0,0 of the viewport) or the center?
             // It usually rotates around the origin of the coordinate system unless translated.
             
             // Let's try passing the rotated X/Y as origin.
             const path = `M ${rotateX} ${rotateY} L ${rotateX + w / 2} ${rotateY + h} L ${rotateX + w} ${rotateY} Z`;
             // This assumes drawing relative to bottom-left rotated anchor.
             // Actually, SVG path drawing is sensitive.
             // Let's just use the diamond fallback for all complex shapes for now to ensure visibility first, 
             // but user complained about missing shapes.
             
             const trianglePath = `M ${w/2} ${h} L ${w} ${0} L ${0} ${0} Z`; // Local coords
             // We can use page.pushOperators to translate/rotate/draw/pop
             
             page.pushOperators(
               pushGraphicsState(),
               translate(cx, cy),
               rotateDegrees(obj.rotation || 0),
               translate(-w/2, -h/2)
             );
             
             // Now draw relative to 0,0
             page.drawSvgPath(trianglePath, { color: color, x: 0, y: 0 });
             
             page.pushOperators(popGraphicsState());

          } else {
             // General shape fallback using pushOperators for correct rotation
             // This is the most robust way for all shapes
             
             let pathData = '';
             if (iconType === 'triangle') {
                 pathData = `M 0 0 L ${w/2} ${h} L ${w} 0 Z`;
             } else if (iconType === 'star' || iconType === 'heart' || iconType === 'diamond') {
                 // Diamond shape
                 pathData = `M ${w/2} ${h} L ${w} ${h/2} L ${w/2} 0 L 0 ${h/2} Z`;
             } else if (iconType === 'hexagon') {
                 pathData = `M ${w*0.25} 0 L ${w*0.75} 0 L ${w} ${h*0.5} L ${w*0.75} ${h} L ${w*0.25} ${h} L 0 ${h*0.5} Z`;
             } else if (iconType === 'arrow-right') {
                 pathData = `M 0 ${h*0.25} L ${w*0.5} ${h*0.25} L ${w*0.5} 0 L ${w} ${h*0.5} L ${w*0.5} ${h} L ${w*0.5} ${h*0.75} L 0 ${h*0.75} Z`;
             } else {
                 // Square/Rect
                 page.drawRectangle({
                    x: rotateX,
                    y: rotateY,
                    width: scaledWidth,
                    height: scaledHeight,
                    color: color,
                    rotate: rotation,
                 });
                 return; // Skip the pushOperators block
             }
             
             if (pathData) {
                 page.pushOperators(
                   pushGraphicsState(),
                   translate(cx, cy),
                   rotateDegrees(obj.rotation || 0),
                   translate(-w/2, -h/2)
                 );
                 page.drawSvgPath(pathData, { color: color, x: 0, y: 0 });
                 page.pushOperators(popGraphicsState());
             }
          }
       } else if (obj.type === 'path' && obj.pathData) {
       } else if (obj.type === 'path' && obj.pathData) {
          // Path drawing
          // Need to scale path data points
          const commands = obj.pathData.split(' ');
          
          if (commands.length >= 3) {
             // Move to start
             if (commands[0] === 'M') {
                 const startX = parseFloat(commands[1]) * scaleFactor;
                 const startY = parseFloat(commands[2]) * scaleFactor;
                 page.moveTo(startX, height - startY);
             }
             
             for (let i = 3; i < commands.length; i+=3) {
                 if (commands[i] === 'L') {
                     const x = parseFloat(commands[i+1]) * scaleFactor;
                     const y = parseFloat(commands[i+2]) * scaleFactor;
                     page.drawLine({
                         start: { x: page.getX(), y: page.getY() }, // Current pos
                         end: { x: x, y: height - y },
                         thickness: 2 * scaleFactor,
                         color: rgb(0, 0, 0),
                     });
                     page.moveTo(x, height - y); // Update current pos
                 }
             }
          }
       }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    saveAs(blob, 'edited-document.pdf');
  };

  const FileInput = () => (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      id="image-upload"
      onChange={handleImageUpload}
    />
  );

  const ProjectInput = () => (
    <input
      type="file"
      accept=".json"
      className="hidden"
      id="project-upload"
      onChange={handleProjectUpload}
    />
  );

  const handleDragStart = (e: React.DragEvent, type: string, content?: string) => {
      e.dataTransfer.setData('application/editor-object', type);
      if (content) e.dataTransfer.setData('application/editor-content', content);
  };

  return (
    <div className="h-16 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle 
                pressed={state.tool === 'select'} 
                onPressedChange={() => dispatch({ type: 'SET_TOOL', payload: 'select' })}
              >
                <MousePointer2 className="w-4 h-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Select</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                draggable 
                onDragStart={(e) => handleDragStart(e, 'text')}
                className="cursor-grab active:cursor-grabbing"
              >
                <Button variant="ghost" size="icon" onClick={handleAddText}>
                    <Type className="w-4 h-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>Add Text (Drag & Drop)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <label htmlFor="image-upload" className="cursor-pointer">
                  <ImageIcon className="w-4 h-4" />
                  <FileInput />
                </label>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Image</TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Square className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-4 gap-2">
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'square')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('square')}><Square className="w-4 h-4" /></Button>
                </div>
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'circle')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('circle')}><Circle className="w-4 h-4" /></Button>
                </div>
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'triangle')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('triangle')}><Triangle className="w-4 h-4" /></Button>
                </div>
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'star')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('star')}><Star className="w-4 h-4" /></Button>
                </div>
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'heart')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('heart')}><Heart className="w-4 h-4" /></Button>
                </div>
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'hexagon')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('hexagon')}><Hexagon className="w-4 h-4" /></Button>
                </div>
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'arrow-right')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('arrow-right')}><ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle 
                pressed={state.tool === 'draw'} 
                onPressedChange={(pressed) => dispatch({ type: 'SET_TOOL', payload: pressed ? 'draw' : 'select' })}
              >
                <Pencil className="w-4 h-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Draw</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        {selectedObject && (
          <>
             <div className="flex items-center gap-2 mx-2">
               {selectedObject.type === 'text' && (
                 <>
                   <Input 
                      className="w-[200px] h-8" 
                      value={selectedObject.content}
                      onChange={(e) => dispatch({
                        type: 'UPDATE_OBJECT',
                        payload: { id: selectedObject.id, updates: { content: e.target.value } }
                      })}
                      placeholder="Type text here..."
                   />
                   <Separator orientation="vertical" className="h-6 mx-1" />
                   <span className="text-xs text-muted-foreground">Size:</span>
                   <Select 
                    value={selectedObject.fontSize?.toString() || "16"} 
                    onValueChange={(val) => dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { id: selectedObject.id, updates: { fontSize: parseInt(val) } }
                    })}
                   >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[8, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72].map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                   <Separator orientation="vertical" className="h-6 mx-1" />
                 </>
               )}

               <span className="text-xs text-muted-foreground">Layer:</span>
               <Select value={selectedObject.layerId} onValueChange={handleMoveToLayer}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.layers.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
               </Select>
             </div>
             <Button variant="destructive" size="icon" onClick={handleDelete} className="h-8 w-8">
                <Trash2 className="w-4 h-4" />
             </Button>
             <Separator orientation="vertical" className="h-6 mx-1" />
          </>
        )}

        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.max(0.1, state.scale - 0.25) })}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs w-12 text-center">{Math.round(state.scale * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.min(10, state.scale + 0.25) })}>
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button variant="outline" size="sm" onClick={handleExportProject}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        <Button variant="outline" size="sm" asChild>
          <label htmlFor="project-upload" className="cursor-pointer">
            <FolderOpen className="w-4 h-4 mr-2" />
            Open
            <ProjectInput />
          </label>
        </Button>
        
        <Button size="sm" onClick={handleFlattenAndDownload}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </div>
  );
};
