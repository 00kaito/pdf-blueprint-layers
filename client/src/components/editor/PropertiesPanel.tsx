import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {cn} from '@/lib/utils';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Separator} from '@/components/ui/separator';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {CheckCircle2, AlertCircle, Maximize2, Network, Palette, Settings2, Tag, Trash2, Zap} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ObjectPhotoGallery} from './ObjectPhotoGallery';
import {useCurrentUser} from '@/hooks/useAuth';

export const PropertiesPanel = () => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
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
    if (isTech) return;
    const finalUpdates = { ...updates };
    
    if (updates.status) {
      finalUpdates.statusUpdatedAt = new Date().toISOString();
      finalUpdates.statusUpdatedBy = user?.username || 'Unknown';
    }

    dispatch({
      type: 'UPDATE_OBJECTS',
      payload: {
        ids: selectedObjects.map(o => o.id),
        updates: finalUpdates
      }
    });
  };

  const handleMetadataChange = (key: string, value: string) => {
    if (isTech) return;
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

  const ReadOnlyField = ({ label, value }: { label: string, value?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="text-xs bg-muted/50 p-2 rounded border border-border min-h-[32px] flex items-center">
        {value || <span className="text-muted-foreground italic">None</span>}
      </div>
    </div>
  );

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
              
              {isTech ? (
                <ReadOnlyField label={`Label ${isMultiSelect ? '(Bulk)' : '(Visible)'}`} value={isMultiSelect ? (getCommonValue('name')) : (firstObject.name || '')} />
              ) : (
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
              )}

              {isTech ? (
                <ReadOnlyField label="Device Type (Purpose)" value={selectedObjects.every(o => o.metadata?.purpose === firstObject.metadata?.purpose) ? (firstObject.metadata?.purpose || 'Other') : 'Mixed'} />
              ) : (
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
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium">Progress Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'PLANNED', label: 'Planned', color: 'bg-red-400' },
                    { id: 'CABLE_PULLED', label: 'Cable Pulled', color: 'bg-blue-500' },
                    { id: 'TERMINATED', label: 'Terminated', color: 'bg-purple-500' },
                    { id: 'TESTED', label: 'Tested', color: 'bg-green-400' },
                    { id: 'APPROVED', label: 'Approved', color: 'bg-green-600' },
                    { id: 'ISSUE', label: 'Issue', color: 'bg-red-600' },
                  ].map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      size="sm"
                      disabled={isTech}
                      className={cn(
                        "h-8 text-[10px] px-1 justify-start gap-1.5 font-semibold",
                        selectedObjects.every(o => o.status === s.id) ? "ring-2 ring-primary ring-offset-1" : ""
                      )}
                      onClick={() => handleUpdate({ status: s.id as any })}
                    >
                      <div className={cn("w-2 h-2 rounded-full", s.color)} />
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedObjects.some(o => o.status === 'ISSUE') && (
                <div className="space-y-1.5">
                  <Label htmlFor="obj-issue" className="text-xs font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Issue Description
                  </Label>
                  {isTech ? (
                    <div className="text-xs bg-red-50 text-red-900 p-2 rounded border border-red-200 min-h-[60px] whitespace-pre-wrap">
                      {selectedObjects.every(o => o.issueDescription === firstObject.issueDescription) ? (firstObject.issueDescription || 'No description provided') : 'Mixed descriptions'}
                    </div>
                  ) : (
                    <Textarea
                      id="obj-issue"
                      placeholder="Describe the issue..."
                      value={selectedObjects.every(o => o.issueDescription === firstObject.issueDescription) ? (firstObject.issueDescription || '') : ''}
                      onChange={(e) => handleUpdate({ issueDescription: e.target.value })}
                      className="text-xs min-h-[60px]"
                    />
                  )}
                </div>
              )}

              {firstObject.statusUpdatedAt && !isMultiSelect && (
                <div className="text-[10px] text-muted-foreground italic px-1">
                  Last updated: {new Date(firstObject.statusUpdatedAt).toLocaleString()} by {firstObject.statusUpdatedBy}
                </div>
              )}

              {isTech ? (
                <>
                  <ReadOnlyField label="Switch ID" value={selectedObjects.every(o => o.metadata?.switchId === firstObject.metadata?.switchId) ? (firstObject.metadata?.switchId || '') : 'Mixed'} />
                  <ReadOnlyField label="Cable ID" value={selectedObjects.every(o => o.metadata?.cableId === firstObject.metadata?.cableId) ? (firstObject.metadata?.cableId || '') : 'Mixed'} />
                </>
              ) : (
                <>
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
                </>
              )}
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
                    {isTech ? (
                      <div className="text-xs bg-muted/30 p-1 rounded border border-border h-8 flex items-center">{Math.round(firstObject.x)}</div>
                    ) : (
                      <Input
                          type="number"
                          value={Math.round(firstObject.x)}
                          onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs"
                      />
                    )}
                    </div>
                    <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Y Pos</Label>
                    {isTech ? (
                      <div className="text-xs bg-muted/30 p-1 rounded border border-border h-8 flex items-center">{Math.round(firstObject.y)}</div>
                    ) : (
                      <Input
                          type="number"
                          value={Math.round(firstObject.y)}
                          onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs"
                      />
                    )}
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
                {!isTech && (
                  <Slider
                    value={[firstObject.opacity ?? 1]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={([val]) => handleUpdate({ opacity: val })}
                  />
                )}
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
                  {isTech ? (
                    <div className="w-8 h-8 rounded border border-border" style={{ backgroundColor: firstObject.color || "#000000" }} />
                  ) : (
                    <input 
                      type="color" 
                      value={selectedObjects.every(o => o.color === firstObject.color) ? (firstObject.color || "#000000") : "#000000"} 
                      onChange={(e) => handleUpdate({ color: e.target.value })} 
                      className="w-8 h-8 p-0.5 border border-input rounded bg-transparent cursor-pointer" 
                    />
                  )}
              </div>

              {!isMultiSelect && firstObject.type === 'path' && (
                 <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Stroke Width</Label>
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{firstObject.strokeWidth || 2}px</span>
                  </div>
                  {!isTech && (
                    <Slider
                      value={[firstObject.strokeWidth || 2]}
                      min={1} max={20} step={1}
                      onValueChange={([val]) => handleUpdate({ strokeWidth: val })}
                    />
                  )}
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

            {!isTech && (
              <>
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
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

