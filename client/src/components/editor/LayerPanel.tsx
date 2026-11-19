import React, {useMemo, useRef, useState} from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    Camera,
    Eye,
    EyeOff,
    Heart,
    Hexagon,
    Image as ImageIcon,
    Layers,
    PanelLeftClose,
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
import {Progress} from "@/components/ui/progress";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {cn} from '@/lib/utils';
import {defaultObjectNames} from '@/core/lv-icons';
import {STATUSES, statusOf} from '@/core/status';
import {withShownStatuses} from '@/core/jumpers';
import {useCurrentUser} from '@/hooks/useAuth';

const PROGRESS_OPEN_STORAGE_KEY = 'editor.progressOpen';

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

/** Object's status as a dot, like on the plan; nothing without a status. */
const StatusDot = ({ status }: { status?: string }) => {
  const s = statusOf(status);
  return s ? <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} title={s.label} data-testid="layer-object-status" /> : null;
};

export const LayerPanel = ({ onCollapse }: { onCollapse?: () => void }) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const state = { ...docState, ...uiState };
  const defaultNames = useMemo(
    () => defaultObjectNames(docState.objects, docState.customIcons),
    [docState.objects, docState.customIcons],
  );
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editingObjectName, setEditingObjectName] = useState("");
  /** Where a dragged object would land: in `layerId`, before `beforeId` (null = at the end of the layer). */
  const [dropTarget, setDropTarget] = useState<{ layerId: string; beforeId: string | null } | null>(null);
  /** Objects being dragged (dataTransfer data cannot be read during dragover). */
  const draggedIdsRef = useRef<string[]>([]);
  const [progressOpen, setProgressOpen] = useState(() => {
    try { return localStorage.getItem(PROGRESS_OPEN_STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const toggleProgress = () => setProgressOpen(open => {
    try { localStorage.setItem(PROGRESS_OPEN_STORAGE_KEY, String(!open)); } catch { /* storage unavailable */ }
    return !open;
  });

  const startEditing = (layer: { id: string, name: string }) => {
    if (isTech) return;
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
    setEditingObjectId(null); // Clear object editing
  };
  
  const startObjectEditing = (obj: { id: string, name?: string }) => {
    if (isTech) return;
    setEditingObjectId(obj.id);
    setEditingObjectName(obj.name || defaultNames.get(obj.id) || '');
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

  const isObjectDrag = (e: React.DragEvent) => !isTech && e.dataTransfer.types.includes('application/move-object-id');

  const handleObjectDragStart = (e: React.DragEvent, objectId: string) => {
    if (isTech) {
      e.preventDefault();
      return;
    }
    // Dragging a selected object moves the whole selection (keeping its order).
    const selected = state.selectedObjectIds;
    draggedIdsRef.current = selected.includes(objectId) && selected.length > 1 ? selected : [objectId];
    e.dataTransfer.setData('application/move-object-id', objectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const endDrag = () => {
    draggedIdsRef.current = [];
    setDropTarget(null);
  };

  const setTarget = (layerId: string, beforeId: string | null) => {
    setDropTarget(t => (t && t.layerId === layerId && t.beforeId === beforeId ? t : { layerId, beforeId }));
  };

  /** Over a layer (its header or empty space): to the end of its objects. */
  const handleLayerDragOver = (e: React.DragEvent, layerId: string) => {
    if (!isObjectDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setTarget(layerId, null);
  };

  /** Over an object row: before it (upper half) or after it (lower half). */
  const handleObjectDragOver = (e: React.DragEvent, layerId: string, objectId: string, nextId: string | null) => {
    if (!isObjectDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    setTarget(layerId, e.clientY < rect.top + rect.height / 2 ? objectId : nextId);
  };

  const handleLayerDragLeave = (e: React.DragEvent) => {
    // Moving onto a child also fires dragleave: only leaving the layer block counts.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isObjectDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = dropTarget;
    const fallback = e.dataTransfer.getData('application/move-object-id');
    const ids = draggedIdsRef.current.length > 0 ? draggedIdsRef.current : fallback ? [fallback] : [];
    endDrag();
    if (!target || ids.length === 0) return;
    dispatch({ type: 'MOVE_OBJECTS_IN_LIST', payload: { ids, layerId: target.layerId, beforeId: target.beforeId } });
  };

  // Shown statuses: an object waits for its jumpers before it counts as pulled or later.
  const shownObjects = useMemo(() => withShownStatuses(state.objects), [state.objects]);
  const trackableObjects = shownObjects.filter(obj => obj.type !== 'path' && obj.type !== 'text' && !obj.isFill);
  const counts = {
    total: trackableObjects.length,
    completed: trackableObjects.filter(o => o.status === 'TESTED' || o.status === 'APPROVED').length,
    /** No status yet counts as Planned. */
    byStatus: trackableObjects.reduce<Record<string, number>>((acc, o) => {
      const s = o.status ?? 'PLANNED';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  };
  const progressPercent = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;


  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Close at the top, like the properties panel, so it is always in reach. */}
      {onCollapse && (
        <div className={cn("flex items-center justify-between border-b border-border px-4 shrink-0 sticky top-0 z-10 bg-card", uiState.ipadMode ? "h-12" : "h-10")}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            Layers & progress
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className={cn("text-muted-foreground", uiState.ipadMode ? "h-10 w-10" : "h-7 w-7")}
            title="Hide panel"
            aria-label="Hide panel"
            data-testid="hide-layer-panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      {state.layers.length > 0 && (
        <div className="p-4 border-b border-border bg-muted/10">
          <button
            type="button"
            className={cn("flex w-full items-center justify-between", progressOpen && "mb-3")}
            onClick={toggleProgress}
            aria-expanded={progressOpen}
            data-testid="toggle-progress"
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              {progressOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Progress
            </div>
            <span className="text-xs font-bold text-primary">
              {counts.completed}/{counts.total}
            </span>
          </button>

          {progressOpen && (<>
          <Progress value={progressPercent} className="h-2 mb-3" />
          
          <div className="grid grid-cols-3 gap-2 mb-3">
            {STATUSES.map(s => (
              <div key={s.id} className="flex flex-col items-center p-1.5 rounded bg-background border border-border/50">
                <span className={cn("text-[10px] font-bold uppercase", s.text)}>{s.short}</span>
                <span className="text-xs font-mono">{counts.byStatus[s.id] ?? 0}</span>
              </div>
            ))}
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
          </>)}
        </div>
      )}

      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Layers className="w-4 h-4" />
          Layers & Objects
        </div>
        <div className="flex items-center gap-1">
          {!isTech && (
            <Button variant="ghost" size="icon" onClick={handleAddLayer} className={uiState.ipadMode ? "h-10 w-10" : "h-7 w-7"} title="Add layer">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {state.layers.slice().reverse().map((layer) => {
            // With shown statuses, so each row's dot matches the plan.
            const layerObjects = shownObjects.filter(obj => obj.layerId === layer.id);
            const isExpanded = expandedLayers[layer.id] ?? true;

            return (
              <div 
                key={layer.id} 
                className={cn(
                  "space-y-1 rounded-md transition-colors pb-1",
                  dropTarget?.layerId === layer.id && "bg-primary/5 ring-1 ring-primary/20"
                )}
                onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                onDragLeave={handleLayerDragLeave}
                onDrop={handleDrop}
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
                    
                    {!isTech && (
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
                    )}

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
                    {layerObjects.map((obj, i) => (
                      <div
                        key={obj.id}
                        draggable={!isTech}
                        onDragStart={(e) => handleObjectDragStart(e, obj.id)}
                        onDragEnd={endDrag}
                        onDragOver={(e) => handleObjectDragOver(e, layer.id, obj.id, layerObjects[i + 1]?.id ?? null)}
                        data-testid="layer-object-row"
                        className={cn(
                          "relative flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors group",
                          // Drop position: a line above this row, or below the last row (end of the layer).
                          dropTarget?.layerId === layer.id && dropTarget.beforeId === obj.id &&
                            "before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:rounded-full before:bg-primary",
                          dropTarget?.layerId === layer.id && dropTarget.beforeId === null && i === layerObjects.length - 1 &&
                            "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
                          dropTarget && draggedIdsRef.current.includes(obj.id) && "opacity-50",
                          isTech ? "cursor-default" : "cursor-grab active:cursor-grabbing",
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
                                      startObjectEditing(obj);
                                  }}
                              >
                                {obj.name || defaultNames.get(obj.id)}
                              </span>
                          )}
                        </div>

                        {obj.type !== 'text' && <StatusDot status={obj.status} />}

                        {!!obj.photos?.length && (
                          <span className="flex items-center gap-0.5 text-sky-600 shrink-0" title={`${obj.photos.length} photo(s)`}>
                            <Camera className="w-3 h-3" />
                            <span className="text-[10px] font-mono">{obj.photos.length}</span>
                          </span>
                        )}

                        {!isTech && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'DELETE_OBJECT', payload: obj.id });
                            }}
                            className={cn(
                              "text-muted-foreground hover:text-destructive transition-opacity shrink-0",
                              // Touch screens have no hover: keep the button visible there and on the selected row.
                              uiState.ipadMode
                                ? "p-2 -my-1.5"
                                : cn("p-0.5 [@media(hover:none)]:opacity-100", state.selectedObjectIds.includes(obj.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                            )}
                            title="Delete object"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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

