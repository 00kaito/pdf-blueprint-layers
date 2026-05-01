import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Bold, Download, FolderOpen, Save, Settings2, Trash2, ZoomIn, ZoomOut} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Toggle} from '@/components/ui/toggle';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Input} from "@/components/ui/input";
import {Slider} from '@/components/ui/slider';
import {Label} from "@/components/ui/label";
import {useExport} from '@/hooks/useExport';
import {useImport} from '@/hooks/useImport';

export const Toolbar = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { handleFlattenAndDownload, handleExportProject } = useExport();
  const { handleFileImport } = useImport();
  const dirInputRef = React.useRef<HTMLInputElement>(null);

  const onProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileImport(e.target.files);
    e.target.value = '';
  };

  const handleDelete = () => {
    if (uiState.selectedObjectIds.length > 0) {
      dispatch({ type: 'DELETE_OBJECTS', payload: uiState.selectedObjectIds });
    }
  };

  const handleMoveToLayer = (layerId: string) => {
    if (uiState.selectedObjectIds.length > 0) {
      dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: uiState.selectedObjectIds, updates: { layerId } } });
    }
  };

  const selectedObjects = docState.objects.filter(o => uiState.selectedObjectIds.includes(o.id));
  const firstObject = selectedObjects[0];

  return (
    <div className="h-16 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-2">
        {selectedObjects.length > 0 && (
          <>
             <div className="flex items-center gap-2 mx-2">
               {/* Universal Label Editor for all objects */}
               <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-input">
                 <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Label</span>
                 <Input 
                   className="w-[100px] h-7 text-xs border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0" 
                   value={selectedObjects.every(o => o.name === firstObject.name) ? (firstObject.name || '') : ''} 
                   onChange={(e) => dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: uiState.selectedObjectIds, updates: { name: e.target.value } } })}
                   placeholder={selectedObjects.length > 1 ? "Mixed..." : "No label"}
                 />
               </div>

               <Separator orientation="vertical" className="h-6" />

               {selectedObjects.length === 1 && firstObject.type === 'text' && (
                 <>
                   <Input className="w-[200px] h-8" value={firstObject.content} onChange={(e) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { content: e.target.value } } })} />
                   <Select value={firstObject.fontSize?.toString() || "16"} onValueChange={(v) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { fontSize: parseInt(v) } } })}>
                    <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24, 32, 48].map(s => <SelectItem key={s} value={s.toString()}>{s}px</SelectItem>)}
                    </SelectContent>
                   </Select>
                   <Toggle pressed={firstObject.fontWeight === 'bold'} onPressedChange={(p) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { fontWeight: p ? 'bold' : 'normal' } } })} size="sm">
                      <Bold className="w-4 h-4" />
                   </Toggle>
                 </>
               )}
               
               <input 
                 type="color" 
                 value={selectedObjects.every(o => o.color === firstObject.color) ? (firstObject.color || "#000000") : "#000000"} 
                 onChange={(e) => dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: uiState.selectedObjectIds, updates: { color: e.target.value } } })} 
                 className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" 
               />

               {selectedObjects.length === 1 && firstObject.type === 'path' && (
                 <>
                   <Separator orientation="vertical" className="h-6 mx-1" />
                   <div className="w-24 flex items-center gap-2">
                     <Slider
                        value={[firstObject.strokeWidth || 2]}
                        min={1} max={20} step={1}
                        onValueChange={([val]) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { strokeWidth: val } } })}
                     />
                   </div>
                 </>
               )}
               <Select 
                 value={selectedObjects.every(o => o.layerId === firstObject.layerId) ? firstObject.layerId : undefined} 
                 onValueChange={handleMoveToLayer}
               >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Mixed layers" />
                </SelectTrigger>
                <SelectContent>{docState.layers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
               </Select>
             </div>
             <Button variant="destructive" size="icon" onClick={handleDelete} className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
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
            <input type="file" accept=".json,.zip" className="hidden" id="project-upload" onChange={onProjectUpload} />
          </label>
        </Button>
        <Button variant="outline" size="sm" onClick={() => dirInputRef.current?.click()}>
          <FolderOpen className="w-4 h-4 mr-2" />Open Folder
        </Button>
        <input
          type="file"
          ref={dirInputRef}
          multiple
          {...{ webkitdirectory: "", directory: "" } as any}
          onChange={onProjectUpload}
          className="hidden"
        />

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
