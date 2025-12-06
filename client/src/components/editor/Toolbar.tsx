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
  FolderOpen
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
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

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

  const handleAddIcon = () => {
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
        color: '#ef4444'
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

       const pdfY = height - obj.y - obj.height; 

       if (obj.type === 'text' && obj.content) {
          page.drawText(obj.content, {
            x: obj.x,
            y: height - obj.y - (obj.fontSize || 16), // Approximation
            size: obj.fontSize || 16,
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
                x: obj.x,
                y: height - obj.y - obj.height,
                width: obj.width,
                height: obj.height,
              });
            }
          } catch (e) {
            console.error("Failed to embed image", e);
          }
       } else if (obj.type === 'icon' || (obj.type as any) === 'shape') {
          // Simple red rectangle for icons/shapes placeholder
          page.drawRectangle({
            x: obj.x,
            y: height - obj.y - obj.height,
            width: obj.width,
            height: obj.height,
            color: rgb(0.937, 0.266, 0.266), // #ef4444
          });
       } else if (obj.type === 'path' && obj.pathData) {
          // Simplified path handling - actually quite complex in pdf-lib without svg parser.
          // For now, we skip complex paths or just draw a warning/placeholder if critical.
          // Drawing SVG paths directly is not natively supported in pdf-lib high-level API easily.
          // We would need to parse 'M x y L x y' commands.
          
          // Quick hack for simple lines:
          const commands = obj.pathData.split(' ');
          if (commands.length > 3) {
             // Very basic line drawing attempt
             // M x1 y1 L x2 y2 ...
             // This is fragile and purely demonstrative for "simple drawing"
             // Proper SVG to PDF needs a library like svg-to-pdfkit or similar wrapper.
             
             // Let's just draw dots for vertices to show *something* happens
             /* 
             for(let i=0; i<commands.length; i++) {
               if(commands[i] === 'M' || commands[i] === 'L') {
                 const x = parseFloat(commands[i+1]);
                 const y = parseFloat(commands[i+2]);
                 page.drawCircle({ x, y: height - y, size: 2, color: rgb(0,0,0) });
               }
             }
             */
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAddIcon}>
                <Square className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Shape</TooltipContent>
          </Tooltip>

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
