import React from 'react';
import { useEditor } from '@/lib/editor-context';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from 'lucide-react';

export const PropertiesPanel = () => {
  const { state, dispatch } = useEditor();

  if (!state.selectedObjectId) return null;

  const selectedObject = state.objects.find(o => o.id === state.selectedObjectId);
  if (!selectedObject) return null;

  const updateMetadata = (key: string, value: any) => {
    dispatch({
      type: 'UPDATE_OBJECT',
      payload: {
        id: selectedObject.id,
        updates: {
          metadata: {
            ...selectedObject.metadata,
            [key]: value
          }
        }
      }
    });
  };

  const updateName = (name: string) => {
     dispatch({
      type: 'UPDATE_OBJECT',
      payload: {
        id: selectedObject.id,
        updates: { name }
      }
     });
  }

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col h-full shrink-0 shadow-xl z-20">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="font-medium text-sm">Properties</span>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => dispatch({ type: 'SELECT_OBJECT', payload: null })}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Object Name (ID)</Label>
          <Input 
            value={selectedObject.name || ''} 
            onChange={(e) => updateName(e.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1">
            <Label className="text-xs">Socket ID</Label>
            <Input 
                value={selectedObject.metadata?.socketId || ''} 
                onChange={(e) => updateMetadata('socketId', e.target.value)}
                placeholder="e.g. 1.04-D2"
                className="h-8"
            />
        </div>

        <div className="space-y-1">
            <Label className="text-xs">Patch Panel Port (Optional)</Label>
            <Input 
                value={selectedObject.metadata?.patchPanelPort || ''} 
                onChange={(e) => updateMetadata('patchPanelPort', e.target.value)}
                placeholder="e.g. Panel A, 12"
                className="h-8"
            />
        </div>

        <div className="space-y-1">
            <Label className="text-xs">Purpose</Label>
            <Select 
                value={selectedObject.metadata?.purpose || 'Data'} 
                onValueChange={(val) => updateMetadata('purpose', val)}
            >
                <SelectTrigger className="h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Data">Data</SelectItem>
                    <SelectItem value="Mic">Mic</SelectItem>
                    <SelectItem value="CAM">CAM</SelectItem>
                    <SelectItem value="TV">TV</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
    </div>
  );
};
