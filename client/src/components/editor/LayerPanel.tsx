import React, {useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    Copy,
    Eye,
    EyeOff,
    FileText,
    Heart,
    Hexagon,
    Image as ImageIcon,
    Layers,
    PenTool,
    Plus,
    Square,
    Star,
    Trash2,
    Triangle,
    Type,
    X
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Input} from "@/components/ui/input";
import {Slider} from "@/components/ui/slider";
import {Progress} from "@/components/ui/progress";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {cn} from '@/lib/utils';

const ObjectIcon = ({ type, content }: { type: string, content?: string }) => {
  if (type === 'text') return <Type className="w-3 h-3" />;
  if (type === 'image') return <ImageIcon className="w-3 h-3" />;
  if (type === 'path') return <PenTool className="w-3 h-3" />;
  if (type === 'icon') {
    switch (content) {
      case 'circle': return <Circle className="w-3 h-3" />;
      case 'triangle': return <Triangle className="w-3 h-3" />;
      case 'star': return <Star className="w-3 h-3" />;
      case 'heart': return <Heart className="w-3 h-3" />;
      case 'hexagon': return <Hexagon className="w-3 h-3" />;
      case 'arrow-right': return <ArrowRight className="w-3 h-3" />;
      case 'square':
      default: return <Square className="w-3 h-3" />;
    }
  }
  return <Square className="w-3 h-3" />;
};

export const LayerPanel = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const state = { ...docState, ...uiState };
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editingObjectName, setEditingObjectName] = useState("");
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const startEditing = (layer: { id: string, name: string }) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
    setEditingObjectId(null); // Clear object editing
  };
  
  const startObjectEditing = (obj: { id: string, name?: string, type: string, content?: string }, index: number) => {
    setEditingObjectId(obj.id);
    const defaultName = obj.name || (obj.type === 'text' 
        ? (obj.content || 'Text Object') 
        : `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} ${index + 1}`);
    setEditingObjectName(defaultName);
    setEditingLayerId(null); // Clear layer editing
  };

  const saveLayerName = () => {
    if (editingLayerId) {
      dispatch({
        type: 'UPDATE_LAYER',
        payload: { id: editingLayerId, updates: { name: editingName } }
      });
      setEditingLayerId(null);
    }
  };
  
  const saveObjectName = () => {
    if (editingObjectId) {
      dispatch({
        type: 'UPDATE_OBJECT',
        payload: { id: editingObjectId, updates: { name: editingObjectName } }
      });
      setEditingObjectId(null);
    }
  };

  const toggleLayerExpand = (layerId: string) => {
    setExpandedLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  const handleAddLayer = () => {
    dispatch({ type: 'ADD_LAYER', payload: `Layer ${state.layers.length + 1}` });
  };

  const handleObjectDragStart = (e: React.DragEvent, objectId: string) => {
    e.dataTransfer.setData('application/move-object-id', objectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/move-object-id')) {
      setDragOverLayerId(layerId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleLayerDrop = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    setDragOverLayerId(null);
    const objectId = e.dataTransfer.getData('application/move-object-id');
    if (objectId) {
      dispatch({
        type: 'UPDATE_OBJECT',
        payload: { id: objectId, updates: { layerId } }
      });
    }
  };

  const trackableObjects = state.objects.filter(obj => obj.type !== 'path');
  const counts = {
    total: trackableObjects.length,
    planned: trackableObjects.filter(o => o.status === 'PLANNED').length,
    inProgress: trackableObjects.filter(o => o.status === 'CABLE_PULLED' || o.status === 'TERMINATED').length,
    completed: trackableObjects.filter(o => o.status === 'TESTED' || o.status === 'APPROVED').length,
    issue: trackableObjects.filter(o => o.status === 'ISSUE').length
  };
  const progressPercent = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Overlay Blueprint Section */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 font-medium text-sm mb-3">
          <Copy className="w-4 h-4 text-primary" />
          Overlay Blueprint
        </div>
        
        {!state.overlayPdfFile ? (
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) dispatch({ type: 'SET_OVERLAY_PDF', payload: file });
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm" className="w-full border-dashed">
              <Plus className="w-3 h-3 mr-2" />
              Add Overlay PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs truncate font-medium">{state.overlayPdfFile.name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 hover:text-destructive"
                onClick={() => dispatch({ type: 'SET_OVERLAY_PDF', payload: null })}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Transparency</span>
                <span className="text-[10px] font-mono bg-muted px-1 rounded">{Math.round(state.overlayOpacity * 100)}%</span>
              </div>
              <Slider
                value={[state.overlayOpacity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([val]) => dispatch({ type: 'SET_OVERLAY_OPACITY', payload: val })}
                className="py-2"
              />
            </div>
          </div>
        )}
      </div>

      {state.layers.length > 0 && (
        <div className="p-4 border-b border-border bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Progress
            </div>
            <span className="text-xs font-bold text-primary">
              {counts.completed}/{counts.total}
            </span>
          </div>
          
          <Progress value={progressPercent} className="h-2 mb-3" />
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col items-center p-1.5 rounded bg-background border border-border/50">
              <span className="text-[10px] font-bold text-red-400 uppercase">Planned</span>
              <span className="text-xs font-mono">{counts.planned}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded bg-background border border-border/50">
              <span className="text-[10px] font-bold text-amber-400 uppercase">In Progress</span>
              <span className="text-xs font-mono">{counts.inProgress}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded bg-background border border-border/50">
              <span className="text-[10px] font-bold text-green-500 uppercase">Completed</span>
              <span className="text-xs font-mono">{counts.completed}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded bg-background border border-border/50">
              <span className="text-[10px] font-bold text-red-600 uppercase">Issues</span>
              <span className="text-xs font-mono">{counts.issue}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-1">
            <Checkbox 
              id="color-by-status" 
              checked={state.showStatusColors}
              onCheckedChange={() => dispatch({ type: 'TOGGLE_STATUS_COLORS' })}
            />
            <Label 
              htmlFor="color-by-status" 
              className="text-xs font-medium cursor-pointer"
            >
              Color by status
            </Label>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Layers className="w-4 h-4" />
          Layers & Objects
        </div>
        <Button variant="ghost" size="icon" onClick={handleAddLayer} className="h-6 w-6">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {state.layers.slice().reverse().map((layer) => {
            const layerObjects = state.objects.filter(obj => obj.layerId === layer.id);
            const isExpanded = expandedLayers[layer.id] ?? true;

            return (
              <div 
                key={layer.id} 
                className={cn(
                  "space-y-1 rounded-md transition-colors pb-1",
                  dragOverLayerId === layer.id && "bg-primary/5 ring-1 ring-primary/20"
                )}
                onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                onDragLeave={() => setDragOverLayerId(null)}
                onDrop={(e) => handleLayerDrop(e, layer.id)}
              >
                <div
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors group",
                    state.activeLayerId === layer.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent"
                  )}
                  onClick={() => dispatch({ type: 'SELECT_LAYER', payload: layer.id })}
                >
                  <div className="flex items-center gap-2 truncate">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerExpand(layer.id);
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layer.id });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-50" />}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Prevent deleting the last layer
                        if (state.layers.length > 1) {
                            dispatch({ type: 'DELETE_LAYER', payload: layer.id });
                        }
                      }}
                      className={cn(
                          "text-muted-foreground hover:text-destructive", 
                          state.layers.length <= 1 ? "opacity-30 cursor-not-allowed" : ""
                      )}
                      disabled={state.layers.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {editingLayerId === layer.id ? (
                        <Input 
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={saveLayerName}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveLayerName();
                            }}
                            className="h-6 py-0 px-1 text-sm w-full bg-white"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span 
                            className="truncate select-none w-full"
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                startEditing(layer);
                            }}
                        >
                            {layer.name}
                        </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-6 space-y-0.5">
                    {layerObjects.map((obj, index) => (
                      <div
                        key={obj.id}
                        draggable
                        onDragStart={(e) => handleObjectDragStart(e, obj.id)}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors cursor-grab active:cursor-grabbing group",
                          state.selectedObjectIds.includes(obj.id)
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-accent text-muted-foreground"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.ctrlKey || e.metaKey) {
                            dispatch({ type: 'TOGGLE_OBJECT_SELECTION', payload: obj.id });
                          } else if (e.shiftKey && state.selectedObjectIds.length > 0) {
                            // Find all objects between the last selected and current
                            const allLayerObjects = state.layers.slice().reverse().flatMap(l => 
                              state.objects.filter(o => o.layerId === l.id)
                            );
                            const lastSelectedId = state.selectedObjectIds[state.selectedObjectIds.length - 1];
                            const lastIdx = allLayerObjects.findIndex(o => o.id === lastSelectedId);
                            const currentIdx = allLayerObjects.findIndex(o => o.id === obj.id);
                            
                            if (lastIdx !== -1 && currentIdx !== -1) {
                              const start = Math.min(lastIdx, currentIdx);
                              const end = Math.max(lastIdx, currentIdx);
                              const rangeIds = allLayerObjects.slice(start, end + 1).map(o => o.id);
                              dispatch({ type: 'SET_SELECTION', payload: rangeIds });
                            }
                          } else {
                            dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
                          }
                          
                          if (state.activeLayerId !== layer.id) {
                             dispatch({ type: 'SELECT_LAYER', payload: layer.id });
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ObjectIcon type={obj.type} content={obj.content} />
                          
                          {editingObjectId === obj.id ? (
                              <Input 
                                  value={editingObjectName}
                                  onChange={(e) => setEditingObjectName(e.target.value)}
                                  onBlur={saveObjectName}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveObjectName();
                                  }}
                                  className="h-5 py-0 px-1 text-xs w-full bg-white"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                              />
                          ) : (
                              <span 
                                  className="truncate select-none w-full"
                                  onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      startObjectEditing(obj, index);
                                  }}
                              >
                                {obj.name || (obj.type === 'text' 
                                  ? (obj.content || 'Text Object') 
                                  : `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} ${index + 1}`)}
                              </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'DELETE_OBJECT', payload: obj.id });
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {layerObjects.length === 0 && (
                      <div className="pl-6 text-[10px] text-muted-foreground py-1 italic">
                        No objects
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
