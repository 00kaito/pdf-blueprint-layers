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
  ArrowRight,
  Bold,
  Camera,
  Hash,
  Settings2
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
import { Slider } from '@/components/ui/slider';
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
        name: 'Text',
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

    if (state.autoNumbering.enabled) {
      // If auto-numbering is enabled, we don't add object directly.
      // We set the template and switch to Stamp tool.
      dispatch({
        type: 'SET_AUTO_NUMBERING',
        payload: {
          template: {
            type: 'icon',
            content: iconType,
            color: '#ef4444'
          }
        }
      });
      dispatch({ type: 'SET_TOOL', payload: 'stamp' });
      return;
    }

    const { x, y } = getCenterPosition(50 / state.scale, 50 / state.scale);
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'icon',
        name: iconType.charAt(0).toUpperCase() + iconType.slice(1),
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
          name: 'Image',
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
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const obj of state.objects) {
       const layer = state.layers.find(l => l.id === obj.layerId);
       if (!layer?.visible) continue;

       // Calculate scale factor if PDF page size differs from our 600px preview width
       const scaleFactor = width / 600;
       
       const scaledX = obj.x * scaleFactor;
       const scaledY = obj.y * scaleFactor;
       const scaledWidth = obj.width * scaleFactor;
       const scaledHeight = obj.height * scaleFactor;
       const scaledFontSize = (obj.fontSize || 16) * scaleFactor;

       // PDF coordinate system (Y is up) vs HTML (Y is down)
       const pdfY = height - scaledY - scaledHeight;
       
       // Rotation logic using pushOperators to rotate coordinate system around center
       // Center C = (scaledX + w/2, pdfY + h/2)
       const cx = scaledX + scaledWidth / 2;
       const cy = pdfY + scaledHeight / 2;
       
       // Standard objects (Text, Image, Icon) use the rotated context
       // Path objects (Drawing) are absolute and usually full-page, so we handle them separately
       
       if (obj.type === 'path' && obj.pathData) {
          // Path drawing (Freehand)
          // These are usually full-canvas overlays with x=0, y=0
          // We don't rotate the context for them, we just draw them relative to page
          // BUT we need to flip Y coordinates
          
          const commands = obj.pathData.split(' ');
          
          if (commands.length >= 3) {
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
                         thickness: (obj.strokeWidth || 2) * scaleFactor,
                         color: rgb(0, 0, 0),
                     });
                     page.moveTo(x, height - y); // Update current pos
                 }
             }
          }
          continue; // Skip the rest of the loop for paths
       }

       // For all other objects, apply rotation context
       // Note: PDF rotation is CCW, CSS is CW. So we negate the angle.
       const rotationAngle = -(obj.rotation || 0);
       
       page.pushOperators(
         pushGraphicsState(),
         translate(cx, cy),
         rotateDegrees(rotationAngle),
         translate(-scaledWidth / 2, -scaledHeight / 2)
       );
       
       // NOW: (0, 0) is the bottom-left of the object's bounding box
       // (scaledWidth, scaledHeight) is the top-right
       // Y goes UP
       
       if (obj.type === 'text' && obj.content) {
          const padding = 4 * scaleFactor;
          const textColor = obj.color ? hexToRgb(obj.color) : rgb(0, 0, 0);
          const font = obj.fontWeight === 'bold' ? helveticaBoldFont : helveticaFont;

          // HTML text is top-aligned.
          // Top of box is at Y = scaledHeight
          // Text starts at Y = scaledHeight - padding - fontSize (baseline approx)
          
          page.drawText(obj.content, {
            x: padding,
            y: scaledHeight - padding - scaledFontSize, 
            size: scaledFontSize,
            font: font,
            color: textColor,
            rotate: degrees(0),
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
                x: 0,
                y: 0,
                width: scaledWidth,
                height: scaledHeight,
                rotate: degrees(0),
              });
            }
          } catch (e) {
            console.error("Failed to embed image", e);
          }
       } else if (obj.type === 'icon') {
          const iconType = obj.content || 'square';
          const color = obj.color ? hexToRgb(obj.color) : rgb(0.937, 0.266, 0.266); // #ef4444 default
          
          const w = scaledWidth;
          const h = scaledHeight;

          if (iconType === 'circle') {
             // Ellipse centered at w/2, h/2
             page.drawEllipse({
               x: w / 2,
               y: h / 2,
               xScale: w / 2,
               yScale: h / 2,
               borderColor: color,
               borderWidth: 2,
               opacity: 1,
               rotate: degrees(0),
             });
          } else {
             // Geometric shapes
             let pathData = '';
             if (iconType === 'triangle') {
                 // Triangle pointing UP
                 // (0,0) is bottom-left
                 pathData = `M ${w/2} ${h} L ${w} 0 L 0 0 Z`;
             } else if (iconType === 'star' || iconType === 'heart' || iconType === 'diamond') {
                 // Diamond
                 pathData = `M ${w/2} ${h} L ${w} ${h/2} L ${w/2} 0 L 0 ${h/2} Z`;
             } else if (iconType === 'hexagon') {
                 pathData = `M ${w*0.25} 0 L ${w*0.75} 0 L ${w} ${h*0.5} L ${w*0.75} ${h} L ${w*0.25} ${h} L 0 ${h*0.5} Z`;
             } else if (iconType === 'arrow-right') {
                 pathData = `M 0 ${h*0.25} L ${w*0.5} ${h*0.25} L ${w*0.5} 0 L ${w} ${h*0.5} L ${w*0.5} ${h} L ${w*0.5} ${h*0.75} L 0 ${h*0.75} Z`;
             } else if (iconType === 'camera') {
                 // Camera icon shape
                 pathData = `M 0 0 L ${w} 0 L ${w} ${h*0.8} L ${w*0.7} ${h*0.8} L ${w*0.6} ${h} L ${w*0.4} ${h} L ${w*0.3} ${h*0.8} L 0 ${h*0.8} Z`;
                 
                 page.drawSvgPath(pathData, { borderColor: color, borderWidth: 2, x: 0, y: 0, color: undefined });
                 
                 page.drawEllipse({
                    x: w/2,
                    y: h*0.4,
                    xScale: w*0.25,
                    yScale: h*0.25,
                    borderColor: color,
                    borderWidth: 2,
                    opacity: 1
                 });
                 
                 pathData = ''; // Clear pathData
             } else {
                 // Square/Rect
                 page.drawRectangle({
                    x: 0,
                    y: 0,
                    width: w,
                    height: h,
                    borderColor: color,
                    borderWidth: 2,
                    color: undefined,
                    rotate: degrees(0),
                 });
             }
             
             if (pathData) {
                 page.drawSvgPath(pathData, { borderColor: color, borderWidth: 2, x: 0, y: 0, color: undefined });
             }
          }
       }
       
       page.pushOperators(popGraphicsState());

       // Draw Object Name (Label)
       if (obj.name && obj.type !== 'path') {
          const labelText = obj.name;
          
          // Use user-defined font size for export (default 10)
          // We apply scaleFactor to convert to PDF coordinates relative to page width
          const labelFontSize = state.exportSettings.labelFontSize * scaleFactor;
          
          const labelFont = helveticaFont;
          const textWidth = labelFont.widthOfTextAtSize(labelText, labelFontSize);
          const textHeight = labelFontSize;
          
          // Calculate label position relative to object center
          // Place label below the object with a gap proportional to font size
          // Gap = 40% of font size (e.g. 4pt for 10pt font)
          const gap = labelFontSize * 0.4;
          
          // Distance from Center to Label Center (approx)
          // Center -> Bottom = scaledHeight / 2
          // Bottom -> Top of Label Box = gap
          // Top of Label Box -> Label Baseline = textHeight (approx)
          // We want the text to be below the object.
          
          const distance = scaledHeight / 2 + gap + (textHeight / 2); 
          
          // Vector to bottom (0, -distance)
          // Rotate this vector by obj.rotation (using correct PDF angle direction)
          const angleRad = degreesToRadians(rotationAngle);
          
          const dx = distance * Math.sin(angleRad);
          const dy = -distance * Math.cos(angleRad);
          
          const lx = cx + dx; 
          const ly = cy + dy;
          
          // Background for label
          const bgPadding = 2 * scaleFactor;
          const bgWidth = textWidth + bgPadding * 2;
          const bgHeight = textHeight + bgPadding * 2;
          
          page.drawRectangle({
             x: lx - bgWidth / 2,
             y: ly - bgPadding, 
             width: bgWidth,
             height: bgHeight,
             color: rgb(1, 1, 1), // White
             opacity: 0.8,
          });

          // Draw text unrotated (horizontal relative to page)
          page.drawText(labelText, {
             x: lx - textWidth / 2,
             y: ly,
             size: labelFontSize,
             font: labelFont,
             color: rgb(0, 0, 0),
          });
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
                <div draggable onDragStart={(e) => handleDragStart(e, 'icon', 'camera')} className="cursor-grab">
                    <Button variant="outline" size="icon" onClick={() => handleAddIcon('camera')}><Camera className="w-4 h-4" /></Button>
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

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center rounded-md border border-input bg-background">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={state.autoNumbering.enabled}
                  onPressedChange={(pressed) => {
                     dispatch({ 
                       type: 'SET_AUTO_NUMBERING', 
                       payload: { enabled: pressed } 
                     });
                     if (!pressed && state.tool === 'stamp') {
                       dispatch({ type: 'SET_TOOL', payload: 'select' });
                     }
                  }}
                  size="sm"
                  className="h-8 w-8 rounded-r-none border-r-0"
                >
                  <Hash className="w-4 h-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Enable Auto-Numbering Mode</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-6 rounded-l-none px-0 border-l border-input hover:bg-muted">
                   <Settings2 className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h4 className="font-medium leading-none">Auto-Numbering Settings</h4>
                   </div>
                   <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="prefix">Prefix</Label>
                        <Input
                          id="prefix"
                          value={state.autoNumbering.prefix}
                          onChange={(e) => dispatch({
                            type: 'SET_AUTO_NUMBERING',
                            payload: { prefix: e.target.value }
                          })}
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="counter">Start #</Label>
                        <Input
                          id="counter"
                          type="number"
                          value={state.autoNumbering.counter}
                          onChange={(e) => dispatch({
                            type: 'SET_AUTO_NUMBERING',
                            payload: { counter: parseInt(e.target.value) || 1 }
                          })}
                          className="col-span-2 h-8"
                        />
                      </div>
                   </div>
                   <p className="text-xs text-muted-foreground">
                     1. Enable Auto-Numbering (Hash icon).<br/>
                     2. Select an object type (e.g. Square, Camera).<br/>
                     3. Click on the canvas to place numbered objects.
                   </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
                    <SelectContent className="max-h-[300px]">
                      {Array.from({ length: 72 }, (_, i) => i + 1).map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>

                   <Toggle
                      pressed={selectedObject.fontWeight === 'bold'}
                      onPressedChange={(pressed) => dispatch({
                        type: 'UPDATE_OBJECT',
                        payload: { id: selectedObject.id, updates: { fontWeight: pressed ? 'bold' : 'normal' } }
                      })}
                      size="sm"
                      className="h-8 w-8 ml-1"
                   >
                      <Bold className="w-4 h-4" />
                   </Toggle>

                   <Separator orientation="vertical" className="h-6 mx-1" />
                 </>
               )}

               {(selectedObject.type === 'text' || selectedObject.type === 'icon' || selectedObject.type === 'path') && (
                 <>
                   <span className="text-xs text-muted-foreground">Color:</span>
                   <div className="relative flex items-center">
                     <input 
                        type="color" 
                        value={selectedObject.color || "#000000"}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_OBJECT',
                          payload: { id: selectedObject.id, updates: { color: e.target.value } }
                        })}
                        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
                     />
                   </div>
                   <Separator orientation="vertical" className="h-6 mx-1" />
                 </>
               )}

               {selectedObject.type === 'path' && (
                 <>
                   <span className="text-xs text-muted-foreground">Width:</span>
                   <div className="w-[100px] flex items-center gap-2">
                     <Slider
                        value={[selectedObject.strokeWidth || 2]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={([val]) => dispatch({
                          type: 'UPDATE_OBJECT',
                          payload: { id: selectedObject.id, updates: { strokeWidth: val } }
                        })}
                     />
                   </div>
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.max(0.1, state.scale - 0.25) })}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <Slider 
            value={[state.scale]} 
            min={0.1} 
            max={10} 
            step={0.25} 
            onValueChange={([val]) => dispatch({ type: 'SET_SCALE', payload: val })}
            className="w-24"
          />
          <span className="text-xs w-12 text-center">{Math.round(state.scale * 100)}%</span>

          <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.min(10, state.scale + 0.25) })}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

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
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Settings2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Export Settings</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="label-size">Label Font Size (PDF)</Label>
                  <span className="text-sm text-muted-foreground">{state.exportSettings.labelFontSize}px</span>
                </div>
                <Slider
                  id="label-size"
                  min={1}
                  max={30}
                  step={1}
                  value={[state.exportSettings.labelFontSize]}
                  onValueChange={([value]) => 
                    dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { labelFontSize: value } })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Adjusts the size of object labels in the downloaded PDF.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button size="sm" onClick={handleFlattenAndDownload}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </div>
  );
};
