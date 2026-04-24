import React from 'react';
import {useEditor} from '@/lib/editor-context';
import {
    ArrowRight,
    Bold,
    Camera,
    Circle,
    Download,
    FolderOpen,
    Hash,
    Heart,
    Hexagon,
    Image as ImageIcon,
    MousePointer2,
    Pencil,
    Plus,
    Save,
    Settings2,
    Square,
    Star,
    Trash2,
    Triangle,
    Type,
    X,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Toggle} from '@/components/ui/toggle';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from '@/components/ui/tooltip';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {v4 as uuidv4} from 'uuid';
import {Input} from "@/components/ui/input";
import {Slider} from '@/components/ui/slider';
import {Label} from "@/components/ui/label";
import {
    degrees,
    PDFDocument,
    popGraphicsState,
    pushGraphicsState,
    rgb,
    rotateDegrees,
    StandardFonts,
    translate
} from 'pdf-lib';
import {saveAs} from 'file-saver';

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

// Helper to convert SVG Data URL to PNG Data URL for PDF embedding
const svgToPng = (svgDataUrl: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Use 4x scaling for high quality (approx 288 DPI)
      const qualityMultiplier = 4;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth * qualityMultiplier;
      canvas.height = targetHeight * qualityMultiplier;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load SVG for conversion'));
    img.src = svgDataUrl;
  });
};

export const Toolbar = () => {
  const { state, dispatch } = useEditor();

  // Calculate center of visible area
  const getCenterPosition = (width: number, height: number) => {
    // scrollPos is the scroll offset of the outer container in screen pixels.
    // Converting to unscaled canvas units: scrollPos / scale
    // Adding half the viewport in unscaled units gives the visible center.
    // We approximate the canvas viewport size as the window minus sidebars (~600px wide, ~800px tall).
    const scrollX = (state.scrollPos?.x || 0) / state.scale;
    const scrollY = (state.scrollPos?.y || 0) / state.scale;
    const viewportW = window.innerWidth / state.scale;
    const viewportH = window.innerHeight / state.scale;

    return {
      x: Math.max(0, Math.min(600 - width, scrollX + viewportW / 2 - width / 2)),
      y: Math.max(0, scrollY + viewportH / 2 - height / 2)
    };
  };

  const handleAddText = () => {
    if (!state.activeLayerId) return;
    // Scale initial dimensions based on current zoom to keep visual size consistent
    const baseWidth = 200;
    const baseHeight = 50;
    const width = baseWidth / state.scale;
    const height = baseHeight / state.scale;

    const { x, y } = getCenterPosition(width, height);
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'text',
        name: '',
        x,
        y,
        width,
        height,
        layerId: state.activeLayerId,
        content: 'Double click to edit',
        fontSize: 16 / state.scale, // Also scale initial font size
        color: '#000000',
        rotation: 0
      }
    });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  };

  const handleAddIcon = (iconType: string) => {
    if (!state.activeLayerId) return;

    // Scale initial dimensions
    const baseSize = 50;
    const size = baseSize / state.scale;

    if (state.autoNumbering.enabled) {
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

    const { x, y } = getCenterPosition(size, size);
    dispatch({
      type: 'ADD_OBJECT',
      payload: {
        id: uuidv4(),
        type: 'icon',
        name: '',
        x,
        y,
        width: size,
        height: size,
        layerId: state.activeLayerId,
        color: '#ef4444',
        content: iconType,
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
      const baseSize = 200;
      const size = baseSize / state.scale;
      const { x, y } = getCenterPosition(size, size);
      dispatch({
        type: 'ADD_OBJECT',
        payload: {
          id: uuidv4(),
          type: 'image',
          name: '',
          x,
          y,
          width: size,
          height: size,
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

  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      dispatch({
        type: 'ADD_CUSTOM_ICON',
        payload: {
          id: uuidv4(),
          url,
          name: file.name
        }
      });
    };
    reader.readAsDataURL(file);
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

    console.log("[Export] Starting flattening process...");
    const arrayBuffer = await state.pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[state.currentPage - 1];
    
    // Get page dimensions and rotation
    const { width: pW, height: pH } = page.getSize();
    const pageRotation = page.getRotation().angle;
    
    console.log(`[Export] PDF Page Info: PhysWidth=${pW}, PhysHeight=${pH}, Rotation=${pageRotation}`);
    
    // Determine visual dimensions (what the user sees in the editor)
    let vW, vH;
    if (pageRotation === 90 || pageRotation === 270) {
      vW = pH;
      vH = pW;
    } else {
      vW = pW;
      vH = pH;
    }
    console.log(`[Export] Visual Dimensions (Editor Context): vW=${vW}, vH=${vH}`);

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Sort objects by layer order (back to front)
    const sortedObjects = [...state.objects].sort((a, b) => {
      const layerA = state.layers.find(l => l.id === a.layerId);
      const layerB = state.layers.find(l => l.id === b.layerId);
      return (layerA?.order || 0) - (layerB?.order || 0);
    });

    for (const obj of sortedObjects) {
       const layer = state.layers.find(l => l.id === obj.layerId);
       if (!layer?.visible) continue;

       console.log(`[Export] Processing Object: ${obj.name} (${obj.type})`, {
         visualX: obj.x,
         visualY: obj.y,
         visualWidth: obj.width,
         visualHeight: obj.height,
         rotation: obj.rotation
       });

       // Calculate scale factor based on visual width
       const scaleFactor = vW / 600;
       
       const scaledX = obj.x * scaleFactor;
       const scaledY = obj.y * scaleFactor;
       const scaledWidth = obj.width * scaleFactor;
       const scaledHeight = obj.height * scaleFactor;
       
       // Function to map visual coordinates to physical PDF coordinates
       const getPhysicalCoords = (vx: number, vy: number) => {
         let result;
         switch (pageRotation) {
           case 90: 
             // Visual TL is Phys BL (0,0) -> Not really, depends on viewer
             // Based on common PDF viewer behavior for /Rotate:
             result = { x: vy, y: vx }; 
             break;
           case 180: 
             result = { x: pW - vx, y: vy }; 
             break;
           case 270: 
             result = { x: pW - vy, y: pH - vx }; 
             break;
           case 0:
           default: 
             result = { x: vx, y: pH - vy }; 
             break;
         }
         return result;
       };

       if (obj.type === 'path' && obj.pathData) {
          const commands = obj.pathData.split(' ');

          if (commands.length >= 3) {
             if (commands[0] === 'M') {
                 const startX = parseFloat(commands[1]) * scaleFactor;
                 const startY = parseFloat(commands[2]) * scaleFactor;
                 const { x, y } = getPhysicalCoords(startX, startY);
                 page.moveTo(x, y);
             }

             for (let i = 3; i < commands.length; i+=3) {
                 if (commands[i] === 'L') {
                     const vx = parseFloat(commands[i+1]) * scaleFactor;
                     const vy = parseFloat(commands[i+2]) * scaleFactor;
                     const { x, y } = getPhysicalCoords(vx, vy);

                     page.drawLine({
                         start: { x: page.getX(), y: page.getY() },
                         end: { x, y },
                         thickness: (obj.strokeWidth || 2) * scaleFactor,
                         color: obj.color ? hexToRgb(obj.color) : rgb(0, 0, 0),
                     });
                     page.moveTo(x, y);
                 }
             }
          }
          continue;
       }

       // For non-path objects, calculate center in physical coordinates
       const vCx = scaledX + scaledWidth / 2;
       const vCy = scaledY + scaledHeight / 2;
       const { x: pCx, y: pCy } = getPhysicalCoords(vCx, vCy);

       // Note: PDF rotation is CCW, CSS/Visual is CW. 
       const visualRotation = obj.rotation || 0;

       // Correct rotation logic:
       // The viewer rotates the page by pageRotation (CCW).
       // To compensate and add our visualRotation:
       const totalRotation = pageRotation - visualRotation;

       page.pushOperators(
         pushGraphicsState(),
         translate(pCx, pCy),
         rotateDegrees(totalRotation),
         translate(-scaledWidth / 2, -scaledHeight / 2)
       );


const scaledFontSize = (obj.fontSize || 16) * scaleFactor;

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
            opacity: (obj.opacity ?? 1) * (layer.opacity ?? 1),
          });
       } else if (obj.type === 'image' && obj.content) {
          try {
            let image;
            let contentToEmbed = obj.content;

            // If it's an SVG, convert it to PNG first with optimized size
            if (obj.content.startsWith('data:image/svg+xml')) {
              try {
                contentToEmbed = await svgToPng(obj.content, scaledWidth, scaledHeight);
              } catch (err) {
                console.error('SVG conversion failed', err);
              }
            }

            if (contentToEmbed.startsWith('data:image/png')) {
              image = await pdfDoc.embedPng(contentToEmbed);
            } else if (contentToEmbed.startsWith('data:image/jpeg') || contentToEmbed.startsWith('data:image/jpg')) {
              image = await pdfDoc.embedJpg(contentToEmbed);
            }

            if (image) {
              const imgW = image.width;
              const imgH = image.height;
              // Calculate scale to fit while maintaining aspect ratio (object-contain)
              const ratio = Math.min(scaledWidth / imgW, scaledHeight / imgH);
              const finalW = imgW * ratio;
              const finalH = imgH * ratio;
              
              // Center the image in the bounding box
              const offX = (scaledWidth - finalW) / 2;
              const offY = (scaledHeight - finalH) / 2;

              page.drawImage(image, {
                x: offX,
                y: offY,
                width: finalW,
                height: finalH,
                rotate: degrees(0),
                opacity: (obj.opacity ?? 1) * (layer.opacity ?? 1),
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
          const minSide = Math.min(w, h);
          const offX = (w - minSide) / 2;
          const offY = (h - minSide) / 2;

          if (iconType === 'circle') {
             page.drawEllipse({
               x: w / 2,
               y: h / 2,
               xScale: minSide / 2,
               yScale: minSide / 2,
               borderColor: color,
               borderWidth: 2,
               opacity: 1,
               rotate: degrees(0),
             });
          } else {
             // Geometric shapes centered in the box
             let pathData = '';
             const midX = w / 2;
             const top = offY + minSide;
             const bottom = offY;
             const left = offX;
             const right = offX + minSide;

             if (iconType === 'triangle') {
                 pathData = `M ${midX} ${top} L ${right} ${bottom} L ${left} ${bottom} Z`;
             } else if (iconType === 'star' || iconType === 'heart' || iconType === 'diamond') {
                 // Diamond shape for simplicity, centered
                 const midY = h / 2;
                 pathData = `M ${midX} ${top} L ${right} ${midY} L ${midX} ${bottom} L ${left} ${midY} Z`;
             } else if (iconType === 'hexagon') {
                 const midY = h / 2;
                 const qX = minSide * 0.25;
                 pathData = `M ${left+qX} ${bottom} L ${right-qX} ${bottom} L ${right} ${midY} L ${right-qX} ${top} L ${left+qX} ${top} L ${left} ${midY} Z`;
             } else if (iconType === 'arrow-right') {
                 const midY = h / 2;
                 const qY = minSide * 0.25;
                 pathData = `M ${left} ${midY-qY} L ${midX} ${midY-qY} L ${midX} ${bottom} L ${right} ${midY} L ${midX} ${top} L ${midX} ${midY+qY} L ${left} ${midY+qY} Z`;
             } else if (iconType === 'camera') {
                 pathData = `M ${left} ${bottom} L ${right} ${bottom} L ${right} ${bottom + minSide*0.8} L ${left + minSide*0.7} ${bottom + minSide*0.8} L ${left + minSide*0.6} ${top} L ${left + minSide*0.4} ${top} L ${left + minSide*0.3} ${bottom + minSide*0.8} L ${left} ${bottom + minSide*0.8} Z`;
                 
                 page.drawSvgPath(pathData, { borderColor: color, borderWidth: 2, x: 0, y: 0 });
                 
                 page.drawEllipse({
                    x: midX,
                    y: bottom + minSide*0.4,
                    xScale: minSide*0.25,
                    yScale: minSide*0.25,
                    borderColor: color,
                    borderWidth: 2,
                    opacity: 1
                 });
                 pathData = '';
             } else {
                 // Square/Rect centered
                 page.drawRectangle({
                    x: offX,
                    y: offY,
                    width: minSide,
                    height: minSide,
                    borderColor: color,
                    borderWidth: 2,
                    color: undefined,
                    rotate: degrees(0),
                 });
             }
             
             if (pathData) {
                 page.drawSvgPath(pathData, { borderColor: color, borderWidth: 2, x: 0, y: 0 });
             }
          }
       }
       
       page.pushOperators(popGraphicsState());

       // Draw Object Name (Label)
       if (obj.name && obj.type !== 'path') {
          const labelText = obj.name;
          
          // Use user-defined font size for export
          const labelFontSize = state.exportSettings.labelFontSize * scaleFactor;
          
          const labelFont = helveticaFont;
          const textWidth = labelFont.widthOfTextAtSize(labelText, labelFontSize);
          const textHeight = labelFontSize;
          
          const gap = labelFontSize * 0.4;
          // Position label visually BELOW the object, ignoring object's internal rotation
          const distance = scaledHeight / 2 + gap + (textHeight / 2); 
          
          // Visual label position (always straight down from center)
          const vLx = vCx; 
          const vLy = vCy + distance;
          
          // Map to physical PDF coordinates
          const { x: pLx, y: pLy } = getPhysicalCoords(vLx, vLy);
          
          // Background for label
          const bgPadding = 0.5 * scaleFactor;
          const bgWidth = textWidth + bgPadding * 2;
          const bgHeight = textHeight + bgPadding * 2;
          
          // To make the label horizontal for the user, we must rotate it by the same angle as the page
          const labelRotation = degrees(pageRotation);

          page.drawRectangle({
             x: pLx - bgWidth / 2,
             y: pLy - bgPadding / 2, 
             width: bgWidth,
             height: bgHeight,
             color: rgb(1, 1, 1), // White
             opacity: 0.6,
             rotate: labelRotation,
          });

          // Draw text rotated to match page rotation (appears horizontal to user)
          page.drawText(labelText, {
             x: pLx - textWidth / 2,
             y: pLy,
             size: labelFontSize,
             font: labelFont,
             color: rgb(0, 0, 0),
             rotate: labelRotation,
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

  const CustomIconInput = () => (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      id="custom-icon-upload"
      onChange={handleCustomIconUpload}
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
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Standard Icons</h4>
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
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">My Icons</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <label htmlFor="custom-icon-upload" className="cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <CustomIconInput />
                      </label>
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                    {state.customIcons.map((icon) => (
                      <div 
                        key={icon.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, 'image', icon.url)}
                        className="relative group cursor-grab"
                      >
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="w-full h-10 p-1"
                          onClick={() => {
                            if (!state.activeLayerId) return;
                            const baseSize = 50;
                            const size = baseSize / state.scale;
                            const { x, y } = getCenterPosition(size, size);
                            dispatch({
                              type: 'ADD_OBJECT',
                              payload: {
                                id: uuidv4(),
                                type: 'image',
                                name: '',
                                x,
                                y,
                                width: size,
                                height: size,
                                layerId: state.activeLayerId,
                                content: icon.url,
                                rotation: 0
                              }
                            });
                          }}
                        >
                          <img src={icon.url} alt={icon.name} className="w-full h-full object-contain" />
                        </Button>
                        <button 
                          className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'DELETE_CUSTOM_ICON', payload: icon.id });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {state.customIcons.length === 0 && (
                      <p className="text-[10px] text-muted-foreground col-span-4 text-center py-2">
                        No custom icons yet. Upload one!
                      </p>
                    )}
                  </div>
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
