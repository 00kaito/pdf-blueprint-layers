import React from 'react';
import { useEditor } from '@/lib/editor-context';
import { Eye, EyeOff, Layers, Plus, Trash2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export const LayerPanel = () => {
  const { state, dispatch } = useEditor();

  const handleAddLayer = () => {
    dispatch({ type: 'ADD_LAYER', payload: `Layer ${state.layers.length + 1}` });
  };

  // Add TOGGLE_LAYER_LOCK action logic locally if not in context
  // I'll check types.ts if I added it. I didn't. I need to add it to types.ts first or just ignore for now.
  // Wait, I should add it to types.ts to be clean.
  // For now, I will assume it's fine or just not implement lock toggling fully if context doesn't support it? 
  // I defined `locked` in `Layer` type but not the action.
  // I will use `visible` action for now and maybe just fake lock or add the action.
  // Let's add the action to types.ts in next step or just use what I have.
  // Actually, I can just edit types.ts and editor-context.tsx quickly.
  // But I don't want to rewrite them all.
  // I'll skip lock toggle action for this step and just show the icon if locked (default false).
  // Actually, user requested "Ukrywanie warstw", not locking specifically. I'll stick to hiding.

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Layers className="w-4 h-4" />
          Layers
        </div>
        <Button variant="ghost" size="icon" onClick={handleAddLayer} className="h-6 w-6">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {state.layers.slice().reverse().map((layer) => (
            <div
              key={layer.id}
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
                    dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layer.id });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-50" />}
                </button>
                <span className="truncate select-none">{layer.name}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
