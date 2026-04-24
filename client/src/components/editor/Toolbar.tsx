import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
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
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Input} from "@/components/ui/input";
import {Slider} from '@/components/ui/slider';
import {Label} from "@/components/ui/label";
import {useExport} from '@/hooks/useExport';
import {useObjectCreation} from '@/hooks/useObjectCreation';

export const Toolbar = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { handleFlattenAndDownload, handleExportProject } = useExport();
  const { handleAddText, handleAddIcon, handleImageUpload, handleCustomIconUpload, getCenterPosition } = useObjectCreation();

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
              objects: json.objects,
              customIcons: json.customIcons || [],
              exportSettings: json.exportSettings || docState.exportSettings,
              autoNumbering: json.autoNumbering || docState.autoNumbering
            } 
          });
        }
      } catch (error) { console.error('Parse fail', error); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = () => {
    if (uiState.selectedObjectId) {
      dispatch({ type: 'DELETE_OBJECT', payload: uiState.selectedObjectId });
    }
  };

  const handleMoveToLayer = (layerId: string) => {
    if (uiState.selectedObjectId) {
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: uiState.selectedObjectId, updates: { layerId } } });
    }
  };

  const handleDragStart = (e: React.DragEvent, type: string, content?: string) => {
      e.dataTransfer.setData('application/editor-object', type);
      if (content) e.dataTransfer.setData('application/editor-content', content);
  };

  const selectedObject = docState.objects.find(o => o.id === uiState.selectedObjectId);

  return (
    <div className="h-16 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle 
                pressed={uiState.tool === 'select'} 
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
              <div draggable onDragStart={(e) => handleDragStart(e, 'text')} className="cursor-grab active:cursor-grabbing">
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
                  <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={handleImageUpload} />
                </label>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Image</TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon"><Square className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Standard Icons</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['square', 'circle', 'triangle', 'star', 'heart', 'hexagon', 'arrow-right', 'camera'].map(icon => (
                      <div key={icon} draggable onDragStart={(e) => handleDragStart(e, 'icon', icon)} className="cursor-grab">
                        <Button variant="outline" size="icon" onClick={() => handleAddIcon(icon)}>
                          {icon === 'square' && <Square className="w-4 h-4" />}
                          {icon === 'circle' && <Circle className="w-4 h-4" />}
                          {icon === 'triangle' && <Triangle className="w-4 h-4" />}
                          {icon === 'star' && <Star className="w-4 h-4" />}
                          {icon === 'heart' && <Heart className="w-4 h-4" />}
                          {icon === 'hexagon' && <Hexagon className="w-4 h-4" />}
                          {icon === 'arrow-right' && <ArrowRight className="w-4 h-4" />}
                          {icon === 'camera' && <Camera className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">My Icons</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <label htmlFor="custom-icon-upload" className="cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <input type="file" accept="image/*" className="hidden" id="custom-icon-upload" onChange={handleCustomIconUpload} />
                      </label>
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                    {docState.customIcons.map((icon) => (
                      <div key={icon.id} draggable onDragStart={(e) => handleDragStart(e, 'image', icon.url)} className="relative group cursor-grab">
                        <Button variant="outline" size="icon" className="w-full h-10 p-1"
                          onClick={() => {
                            if (!uiState.activeLayerId) return;
                            const size = 50 / uiState.scale;
                            const { x, y } = getCenterPosition(size, size);
                            dispatch({
                              type: 'ADD_OBJECT',
                              payload: { id: uuidv4(), type: 'image', name: '', x, y, width: size, height: size, layerId: uiState.activeLayerId, content: icon.url, rotation: 0 }
                            });
                          }}
                        >
                          <img src={icon.url} alt={icon.name} className="w-full h-full object-contain" />
                        </Button>
                        <button className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_CUSTOM_ICON', payload: icon.id }); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle pressed={uiState.tool === 'draw'} onPressedChange={(p) => dispatch({ type: 'SET_TOOL', payload: p ? 'draw' : 'select' })}>
                <Pencil className="w-4 h-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Draw</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <div className="flex items-center rounded-md border border-input bg-background">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle pressed={docState.autoNumbering.enabled}
                  onPressedChange={(p) => {
                     dispatch({ type: 'SET_AUTO_NUMBERING', payload: { enabled: p } });
                     if (!p && uiState.tool === 'stamp') dispatch({ type: 'SET_TOOL', payload: 'select' });
                  }} size="sm" className="h-8 w-8 rounded-r-none border-r-0">
                  <Hash className="w-4 h-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Auto-Numbering</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-6 rounded-l-none px-0 border-l border-input hover:bg-muted">
                   <Settings2 className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                   <h4 className="font-medium leading-none">Auto-Numbering Settings</h4>
                   <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label>Prefix</Label>
                        <Input value={docState.autoNumbering.prefix} onChange={(e) => dispatch({ type: 'SET_AUTO_NUMBERING', payload: { prefix: e.target.value } })} className="col-span-2 h-8" />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label>Start #</Label>
                        <Input type="number" value={docState.autoNumbering.counter} onChange={(e) => dispatch({ type: 'SET_AUTO_NUMBERING', payload: { counter: parseInt(e.target.value) || 1 } })} className="col-span-2 h-8" />
                      </div>
                   </div>
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
                   <Input className="w-[200px] h-8" value={selectedObject.content} onChange={(e) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { content: e.target.value } } })} />
                   <Select value={selectedObject.fontSize?.toString() || "16"} onValueChange={(v) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { fontSize: parseInt(v) } } })}>
                    <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {[8, 10, 12, 14, 16, 20, 24, 32, 48].map(s => <SelectItem key={s} value={s.toString()}>{s}px</SelectItem>)}
                    </SelectContent>
                   </Select>
                   <Toggle pressed={selectedObject.fontWeight === 'bold'} onPressedChange={(p) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { fontWeight: p ? 'bold' : 'normal' } } })} size="sm">
                      <Bold className="w-4 h-4" />
                   </Toggle>
                 </>
               )}
               {(selectedObject.type === 'text' || selectedObject.type === 'icon' || selectedObject.type === 'path') && (
                 <input type="color" value={selectedObject.color || "#000000"} onChange={(e) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { color: e.target.value } } })} className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" />
               )}
               {selectedObject.type === 'path' && (
                 <>
                   <Separator orientation="vertical" className="h-6 mx-1" />
                   <div className="w-24 flex items-center gap-2">
                     <Slider
                        value={[selectedObject.strokeWidth || 2]}
                        min={1} max={20} step={1}
                        onValueChange={([val]) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { strokeWidth: val } } })}
                     />
                   </div>
                 </>
               )}
               <Select value={selectedObject.layerId} onValueChange={handleMoveToLayer}>
                <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{docState.layers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
               </Select>
             </div>
             <Button variant="destructive" size="icon" onClick={handleDelete} className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
          </>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.max(0.1, uiState.scale - 0.25) })}><ZoomOut className="w-4 h-4" /></Button>
          <Slider value={[uiState.scale]} min={0.1} max={10} step={0.25} onValueChange={([v]) => dispatch({ type: 'SET_SCALE', payload: v })} className="w-24" />
          <span className="text-xs w-12 text-center">{Math.round(uiState.scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_SCALE', payload: Math.min(10, uiState.scale + 0.25) })}><ZoomIn className="w-4 h-4" /></Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportProject}><Save className="w-4 h-4 mr-2" />Save</Button>
        <Button variant="outline" size="sm" asChild>
          <label htmlFor="project-upload" className="cursor-pointer">
            <FolderOpen className="w-4 h-4 mr-2" />Open
            <input type="file" accept=".json" className="hidden" id="project-upload" onChange={handleProjectUpload} />
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
                  <Label>Label Font Size (PDF)</Label>
                  <span className="text-sm text-muted-foreground">{docState.exportSettings.labelFontSize}px</span>
                </div>
                <Slider
                  min={1} max={30} step={1}
                  value={[docState.exportSettings.labelFontSize]}
                  onValueChange={([value]) => dispatch({ type: 'SET_EXPORT_SETTINGS', payload: { labelFontSize: value } })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button size="sm" onClick={handleFlattenAndDownload}><Download className="w-4 h-4 mr-2" />Export PDF</Button>
      </div>
    </div>
  );
};
