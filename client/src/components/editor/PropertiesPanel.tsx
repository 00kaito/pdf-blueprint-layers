import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Separator} from '@/components/ui/separator';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Maximize2, Network, Palette, Settings2, Tag, Zap} from 'lucide-react';

export const PropertiesPanel = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  const selectedObject = docState.objects.find((o) => o.id === uiState.selectedObjectId);

  if (!selectedObject) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-muted-foreground text-sm italic">
        No object selected
      </div>
    );
  }

  const handleMetadataChange = (key: string, value: string) => {
    dispatch({
      type: 'UPDATE_OBJECT',
      payload: {
        id: selectedObject.id,
        updates: {
          metadata: {
            ...(selectedObject.metadata || {}),
            [key]: value
          }
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        <h3 className="font-semibold text-sm">Object Properties</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-4 space-y-6">
            
            {/* Identification Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                <Tag className="w-3 h-3" />
                Identification
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="obj-label" className="text-xs font-medium">Label (Visible)</Label>
                <Input
                  id="obj-label"
                  placeholder="Main label"
                  value={selectedObject.name || ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { id: selectedObject.id, updates: { name: e.target.value } },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obj-purpose" className="text-xs font-medium">Device Type (Purpose)</Label>
                <Select 
                  value={selectedObject.metadata?.purpose || 'Other'} 
                  onValueChange={(v) => handleMetadataChange('purpose', v)}
                >
                  <SelectTrigger id="obj-purpose" className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
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

              <div className="space-y-1.5">
                <Label htmlFor="obj-switch" className="text-xs font-medium">Switch ID</Label>
                <div className="relative">
                  <Network className="absolute left-2 top-2.5 w-3 h-3 text-muted-foreground" />
                  <Input
                    id="obj-switch"
                    placeholder="e.g. SW-01"
                    value={selectedObject.metadata?.switchId || ''}
                    onChange={(e) => handleMetadataChange('switchId', e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obj-cable" className="text-xs font-medium">Cable ID</Label>
                <div className="relative">
                  <Zap className="absolute left-2 top-2.5 w-3 h-3 text-muted-foreground" />
                  <Input
                    id="obj-cable"
                    placeholder="e.g. C-102"
                    value={selectedObject.metadata?.cableId || ''}
                    onChange={(e) => handleMetadataChange('cableId', e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Transform Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                <Maximize2 className="w-3 h-3" />
                Position & Transform
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">X Pos</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedObject.x)}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_OBJECT',
                        payload: { id: selectedObject.id, updates: { x: parseInt(e.target.value) || 0 } },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Y Pos</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedObject.y)}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_OBJECT',
                        payload: { id: selectedObject.id, updates: { y: parseInt(e.target.value) || 0 } },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                </div>
                <Slider
                  value={[selectedObject.opacity ?? 1]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([val]) =>
                    dispatch({
                      type: 'UPDATE_OBJECT',
                      payload: { id: selectedObject.id, updates: { opacity: val } },
                    })
                  }
                />
              </div>
            </div>

            <Separator />
            
            {/* Visual Styles Section (Quick Access) */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                <Palette className="w-3 h-3" />
                Visual Styles
              </div>
              
              {(selectedObject.type === 'text' || selectedObject.type === 'icon' || selectedObject.type === 'path' || selectedObject.type === 'image') && (
                <div className="flex items-center justify-between">
                   <Label className="text-xs">Object Color</Label>
                   <input 
                     type="color" 
                     value={selectedObject.color || "#000000"} 
                     onChange={(e) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { color: e.target.value } } })} 
                     className="w-8 h-8 p-0.5 border border-input rounded bg-transparent cursor-pointer" 
                   />
                </div>
              )}

              {selectedObject.type === 'path' && (
                 <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Stroke Width</Label>
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{selectedObject.strokeWidth || 2}px</span>
                  </div>
                  <Slider
                    value={[selectedObject.strokeWidth || 2]}
                    min={1} max={20} step={1}
                    onValueChange={([val]) => dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { strokeWidth: val } } })}
                  />
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};
