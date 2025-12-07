import React, { useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { 
  Eye, 
  EyeOff, 
  Layers, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  ChevronDown, 
  ChevronRight,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Hexagon,
  ArrowRight,
  PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';

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
  const { state, dispatch } = useEditor();
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editingObjectName, setEditingObjectName] = useState("");

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

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col h-full shrink-0">
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
              <div key={layer.id} className="space-y-1">
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
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors",
                          state.selectedObjectId === obj.id
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-accent text-muted-foreground"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SELECT_OBJECT', payload: obj.id });
                          // Also ensure layer is active if we select object? 
                          // Maybe not strictly required but good UX
                          if (state.activeLayerId !== layer.id) {
                             dispatch({ type: 'SELECT_LAYER', payload: layer.id });
                          }
                        }}
                      >
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
