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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

export const Toolbar = () => {
  const { state, dispatch } = useEditor();

  const handleAddText = () => {
    if (!state.activeLayerId) return;
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        layerId: state.activeLayerId,
        content: 'Double click to edit',
        fontSize: 16,
        color: '#000000'
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  };

  const handleAddIcon = (iconType: string) => {
    if (!state.activeLayerId) return;
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'icon',
        x: 150,
        y: 150,
        width: 50,
        height: 50,
        layerId: state.activeLayerId,
        color: '#ef4444',
        content: iconType // store icon name in content
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
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(),
          type: 'image',
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          layerId: state.activeLayerId!,
          content: url
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

       if (obj.type === 'text' && obj.content) {
          page.drawText(obj.content, {
            x: scaledX,
            y: height - scaledY - scaledFontSize, 
            size: scaledFontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
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
                x: scaledX,
                y: pdfY,
                width: scaledWidth,
                height: scaledHeight,
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
             page.drawEllipse({
               x: scaledX + scaledWidth / 2,
               y: pdfY + scaledHeight / 2,
               xScale: scaledWidth / 2,
               yScale: scaledHeight / 2,
               color: color,
               opacity: 1,
             });
          } else if (iconType === 'triangle') {
             // Draw triangle (bottom-left, top-center, bottom-right)
             // Not natively supported as a primitive, draw as SVG path
             const path = `M ${scaledX} ${pdfY} L ${scaledX + scaledWidth / 2} ${pdfY + scaledHeight} L ${scaledX + scaledWidth} ${pdfY} Z`;
             page.drawSvgPath(path, { color: color });
          } else if (iconType === 'star') {
             // Simplified star (diamond shape) or just fallback to square/circle if too complex
             // Let's use SVG path for a simple star-like shape if possible, or just a diamond.
             // Diamond:
             const path = `M ${scaledX + scaledWidth / 2} ${pdfY + scaledHeight} L ${scaledX + scaledWidth} ${pdfY + scaledHeight / 2} L ${scaledX + scaledWidth / 2} ${pdfY} L ${scaledX} ${pdfY + scaledHeight / 2} Z`;
             page.drawSvgPath(path, { color: color });
          } else {
             // Default to rectangle (square)
             page.drawRectangle({
               x: scaledX,
               y: pdfY,
               width: scaledWidth,
               height: scaledHeight,
               color: color,
             });
          }
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
              <Button variant="ghost" size="icon" onClick={handleAddText}>
                <Type className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Text</TooltipContent>
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
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('square')}><Square className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('circle')}><Circle className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('triangle')}><Triangle className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('star')}><Star className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('heart')}><Heart className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('hexagon')}><Hexagon className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleAddIcon('arrow-right')}><ArrowRight className="w-4 h-4" /></Button>
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

        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.max(0.5, state.scale - 0.1) })}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs w-12 text-center">{Math.round(state.scale * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.min(2, state.scale + 0.1) })}>
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
