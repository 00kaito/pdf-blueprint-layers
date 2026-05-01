import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Separator} from '@/components/ui/separator';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {CheckCircle2, Maximize2, Network, Palette, Settings2, Tag, Trash2, Zap} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ObjectPhotoGallery} from './ObjectPhotoGallery';

export const PropertiesPanel = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  const selectedObjects = docState.objects.filter((o) => uiState.selectedObjectIds.includes(o.id));
  const isMultiSelect = selectedObjects.length > 1;
  const firstObject = selectedObjects[0];

  if (selectedObjects.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-muted-foreground text-sm italic">
        No object selected
      </div>
    );
  }

  const handleUpdate = (updates: Partial<typeof firstObject>) => {
    dispatch({
      type: 'UPDATE_OBJECTS',
      payload: {
        ids: selectedObjects.map(o => o.id),
        updates
      }
    });
  };

  const handleMetadataChange = (key: string, value: string) => {
    selectedObjects.forEach(obj => {
        dispatch({
            type: 'UPDATE_OBJECT',
            payload: {
              id: obj.id,
              updates: {
                metadata: {
                  ...(obj.metadata || {}),
                  [key]: value
                }
              }
            }
          });
    });
  };

  const getCommonValue = (key: keyof typeof firstObject) => {
    const val = firstObject[key];
    const isMixed = selectedObjects.some(o => o[key] !== val);
    return isMixed ? '' : (val as string);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <h3 className="font-semibold text-sm">
                {isMultiSelect ? `${selectedObjects.length} Objects Selected` : 'Object Properties'}
            </h3>
        </div>
        {isMultiSelect && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Bulk Edit</span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-4 space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                <Tag className="w-3 h-3" />
                Identification
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="obj-label" className="text-xs font-medium">Label {isMultiSelect ? '(Bulk)' : '(Visible)'}</Label>
                <Input
                  id="obj-label"
                  placeholder={isMultiSelect ? "Mixed values..." : "Main label"}
                  value={isMultiSelect ? (getCommonValue('name')) : (firstObject.name || '')}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obj-purpose" className="text-xs font-medium">Device Type (Purpose)</Label>
                <Select 
                  value={selectedObjects.every(o => o.metadata?.purpose === firstObject.metadata?.purpose) ? (firstObject.metadata?.purpose || 'Other') : ''} 
                  onValueChange={(v) => handleMetadataChange('purpose', v)}
                >
                  <SelectTrigger id="obj-purpose" className="h-8 text-xs">
                    <SelectValue placeholder={isMultiSelect ? "Mixed types" : "Select type"} />
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
                <Label htmlFor="obj-status" className="text-xs font-medium">Progress Status</Label>
                <Select 
                  value={selectedObjects.every(o => o.status === firstObject.status) ? (firstObject.status || '') : ''} 
                  onValueChange={(v) => handleUpdate({ status: v as any })}
                >
                  <SelectTrigger id="obj-status" className="h-8 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue placeholder={isMultiSelect ? "Mixed status" : "Select status"} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
                    value={selectedObjects.every(o => o.metadata?.switchId === firstObject.metadata?.switchId) ? (firstObject.metadata?.switchId || '') : ''}
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
                    value={selectedObjects.every(o => o.metadata?.cableId === firstObject.metadata?.cableId) ? (firstObject.metadata?.cableId || '') : ''}
                    onChange={(e) => handleMetadataChange('cableId', e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                <Maximize2 className="w-3 h-3" />
                Position & Transform
              </div>
              
              {!isMultiSelect && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">X Pos</Label>
                    <Input
                        type="number"
                        value={Math.round(firstObject.x)}
                        onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs"
                    />
                    </div>
                    <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Y Pos</Label>
                    <Input
                        type="number"
                        value={Math.round(firstObject.y)}
                        onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs"
                    />
                    </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                    {isMultiSelect && selectedObjects.some(o => o.opacity !== firstObject.opacity) 
                        ? 'Mixed' 
                        : `${Math.round((firstObject.opacity ?? 1) * 100)}%`}
                  </span>
                </div>
                <Slider
                  value={[firstObject.opacity ?? 1]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([val]) => handleUpdate({ opacity: val })}
                />
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                <Palette className="w-3 h-3" />
                Visual Styles
              </div>
              
              <div className="flex items-center justify-between">
                  <Label className="text-xs">Object Color</Label>
                  <input 
                    type="color" 
                    value={selectedObjects.every(o => o.color === firstObject.color) ? (firstObject.color || "#000000") : "#000000"} 
                    onChange={(e) => handleUpdate({ color: e.target.value })} 
                    className="w-8 h-8 p-0.5 border border-input rounded bg-transparent cursor-pointer" 
                  />
              </div>

              {!isMultiSelect && firstObject.type === 'path' && (
                 <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Stroke Width</Label>
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{firstObject.strokeWidth || 2}px</span>
                  </div>
                  <Slider
                    value={[firstObject.strokeWidth || 2]}
                    min={1} max={20} step={1}
                    onValueChange={([val]) => handleUpdate({ strokeWidth: val })}
                  />
                </div>
              )}
            </div>

            {!isMultiSelect && (
              <>
                <Separator />
                <ObjectPhotoGallery
                  objectId={firstObject.id}
                  photos={firstObject.photos ?? []}
                />
              </>
            )}

            <Separator />

            <div className="pt-2">
              <Button 
                variant="destructive" 
                className="w-full gap-2 h-9"
                onClick={() => dispatch({ type: 'DELETE_OBJECTS', payload: selectedObjects.map(o => o.id) })}
              >
                <Trash2 className="w-4 h-4" />
                {isMultiSelect ? `Delete ${selectedObjects.length} Objects` : 'Delete Object'}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};
