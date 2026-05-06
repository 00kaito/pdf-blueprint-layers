import React from 'react';
import {Bold, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Toggle} from '@/components/ui/toggle';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Slider} from '@/components/ui/slider';
import {useDocumentDispatch, useUIDispatch} from '@/lib/editor-context';
import {EditorObject, Layer} from '@/lib/types';

interface ObjectPropertyEditorProps {
  selectedObjects: EditorObject[];
  selectedObjectIds: string[];
  layers: Layer[];
  isTech: boolean;
}

export const ObjectPropertyEditor = ({ 
  selectedObjects, 
  selectedObjectIds, 
  layers, 
  isTech 
}: ObjectPropertyEditorProps) => {
  const dispatch = useDocumentDispatch();
  const uiDispatch = useUIDispatch();

  if (selectedObjects.length === 0 || isTech) return null;

  const firstObject = selectedObjects[0];

  const handleDelete = () => {
    dispatch({ type: 'DELETE_OBJECTS', payload: selectedObjectIds });
  };

  const handleMoveToLayer = (layerId: string) => {
    dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: selectedObjectIds, updates: { layerId } } });
  };

  return (
    <div className="flex items-center gap-2 mx-2">
      {/* Universal Label Editor for all objects */}
      <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-input">
        <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Label</span>
        <Input 
          className="w-[100px] h-7 text-xs border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0" 
          value={selectedObjects.every(o => o.name === firstObject.name) ? (firstObject.name || '') : ''} 
          onChange={(e) => dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: selectedObjectIds, updates: { name: e.target.value } } })}
          placeholder={selectedObjects.length > 1 ? "Mixed..." : "No label"}
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {selectedObjects.length === 1 && firstObject.type === 'text' && (
        <>
          <Input 
            className="w-[200px] h-8" 
            value={firstObject.content} 
            onChange={(e) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { content: e.target.value } } })} 
          />
          <Select 
            value={firstObject.fontSize?.toString() || "16"} 
            onValueChange={(v) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { fontSize: parseInt(v) } } })}
          >
            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24, 32, 48].map(s => <SelectItem key={s} value={s.toString()}>{s}px</SelectItem>)}
            </SelectContent>
          </Select>
          <Toggle 
            pressed={firstObject.fontWeight === 'bold'} 
            onPressedChange={(p) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: firstObject.id, updates: { fontWeight: p ? 'bold' : 'normal' } } })} 
            size="sm"
          >
            <Bold className="w-4 h-4" />
          </Toggle>
        </>
      )}
      
      <input 
        type="color" 
        value={selectedObjects.every(o => o.color === firstObject.color) ? (firstObject.color || "#000000") : "#000000"} 
        onChange={(e) => dispatch({ type: 'UPDATE_OBJECTS', payload: { ids: selectedObjectIds, updates: { color: e.target.value } } })} 
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
        <SelectContent>{layers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="destructive" size="icon" onClick={handleDelete} className="h-8 w-8 ml-2">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
