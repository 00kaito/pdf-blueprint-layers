import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {cn} from '@/lib/utils';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Separator} from '@/components/ui/separator';
import {AlertCircle, Maximize2, Network, Palette, Settings2, Tag, Trash2, X, Zap} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ObjectPhotoGallery} from './ObjectPhotoGallery';
import {ObjectComments} from './ObjectComments';
import {LabelPositionPicker} from './LabelPositionPicker';
import {BulkLabelInput} from './BulkLabelInput';
import {PlanChangeSection} from './PlanChangeSection';
import {CableEditor} from './CableEditor';
import {RackSelect} from './RackSelect';
import {CameraCoverageEditor} from './CameraCoverageEditor';
import {MountHeightEditor} from './MountHeightEditor';
import {CoverageAreaCameras} from './CoverageAreaCameras';
import {ResizeByPercent} from './ResizeByPercent';
import {isCamera, isCoverageArea} from '@/core/camera-coverage';
import {isCableDevice} from '@/core/cable-routing';
import {STATUSES, statusUpdate} from '@/core/status';
import {useCurrentUser} from '@/hooks/useAuth';

export const PropertiesPanel = () => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { state: docState, dispatch } = useDocument();
  const { state: uiState, dispatch: uiDispatch } = useUI();

  const selectedObjects = docState.objects.filter((o) => uiState.selectedObjectIds.includes(o.id));
  const isMultiSelect = selectedObjects.length > 1;
  const firstObject = selectedObjects[0];
  const isDeviceSelection = selectedObjects.length > 0 && selectedObjects.every(isCableDevice);

  if (selectedObjects.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-muted-foreground text-sm italic">
        No object selected
      </div>
    );
  }

  const handleUpdate = (updates: Partial<typeof firstObject>) => {
    // If user is TECH, we only allow updating status and issueDescription
    if (isTech) {
      const allowedKeys: (keyof typeof firstObject)[] = ['status', 'issueDescription'];
      const filteredUpdates: Partial<typeof firstObject> = {};
      let hasAllowed = false;
      
      allowedKeys.forEach(key => {
        if (key in updates) {
          (filteredUpdates as any)[key] = updates[key];
          hasAllowed = true;
        }
      });
      
      if (!hasAllowed) return;
      updates = filteredUpdates;
    }

    const finalUpdates = updates.status ? { ...updates, ...statusUpdate(updates.status, user?.username) } : updates;

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
        <div className="flex items-center gap-2">
          {isMultiSelect && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Bulk Edit</span>
          )}
          {!isTech && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("text-muted-foreground hover:text-destructive", uiState.ipadMode ? "h-10 w-10" : "h-7 w-7")}
              onClick={() => dispatch({ type: 'DELETE_OBJECTS', payload: selectedObjects.map(o => o.id) })}
              title={isMultiSelect ? `Delete ${selectedObjects.length} objects` : 'Delete object'}
              data-testid="properties-delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {/* Touch layout: the panel is opened from the object (Props), so it closes here too. */}
          {uiState.ipadMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground"
              onClick={() => uiDispatch({ type: 'CLOSE_OBJECT_DETAILS' })}
              title="Close properties"
              aria-label="Close properties"
              data-testid="properties-close"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
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
                  <BulkLabelInput id="obj-label" objects={selectedObjects} className="h-8 text-xs" showPreview />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">Label position</span>
                    <LabelPositionPicker objects={selectedObjects} onChange={(updates) => handleUpdate(updates)} />
                  </div>
                </div>
              )}


              {selectedObjects.every(o => o.type !== 'text') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Progress Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUSES.map((s) => (
                        <Button
                          key={s.id}
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-[10px] px-1 justify-start gap-1.5 font-semibold",
                            selectedObjects.every(o => o.status === s.id) ? "ring-2 ring-primary ring-offset-1" : ""
                          )}
                          onClick={() => handleUpdate({ status: s.id })}
                        >
                          <div className={cn("w-2 h-2 rounded-full", s.dot)} />
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
                      <Textarea
                        id="obj-issue"
                        placeholder="Describe the issue..."
                        value={selectedObjects.every(o => o.issueDescription === firstObject.issueDescription) ? (firstObject.issueDescription || '') : ''}
                        onChange={(e) => handleUpdate({ issueDescription: e.target.value })}
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  )}

                  {firstObject.statusUpdatedAt && !isMultiSelect && (
                    <div className="text-[10px] text-muted-foreground italic px-1">
                      Last updated: {new Date(firstObject.statusUpdatedAt).toLocaleString()} by {firstObject.statusUpdatedBy}
                    </div>
                  )}

                  <PlanChangeSection objects={selectedObjects} />
                </>
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

              {isDeviceSelection && (
                <>
                  <MountHeightEditor objects={selectedObjects} readOnly={isTech} />
                  <CableEditor objects={selectedObjects} readOnly={isTech} />
                  <RackSelect objects={selectedObjects} readOnly={isTech} />
                </>
              )}
              {selectedObjects.every(isCamera) && (
                <CameraCoverageEditor objects={selectedObjects} readOnly={isTech} />
              )}
              {selectedObjects.every(isCoverageArea) && (
                <CoverageAreaCameras areas={selectedObjects} readOnly={isTech} />
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

              {!isTech && <ResizeByPercent ids={selectedObjects.map(o => o.id)} />}

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
                <Separator />
                <ObjectComments
                  objectId={firstObject.id}
                  comments={firstObject.comments ?? []}
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

