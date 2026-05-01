import React, { useState, useEffect } from 'react';
import { useDocument, useUI } from '@/lib/editor-context';
import { useObjectCreation } from '@/hooks/useObjectCreation';
import { ObjectPhotoGallery } from './ObjectPhotoGallery';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  Trash2, 
  Plus, 
  Type,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Camera,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export const MobileBottomBar: React.FC = () => {
  const { state: docState, dispatch: docDispatch } = useDocument();
  const { state: uiState, dispatch: uiDispatch } = useUI();
  const { handleAddIcon, handleAddText } = useObjectCreation();

  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [isBarVisible, setIsBarVisible] = useState(true);

  const selectedObjectId = uiState.selectedObjectIds[0];
  const selectedObject = docState.objects.find(o => o.id === selectedObjectId);

  useEffect(() => {
    if (uiState.selectedObjectIds.length > 0) {
      setMode('edit');
    } else {
      setMode('list');
    }
  }, [uiState.selectedObjectIds]);

  const handleBackToList = () => {
    uiDispatch({ type: 'SELECT_OBJECT', payload: null });
  };

  const handleToggleVisibility = () => {
    setIsBarVisible(!isBarVisible);
  };

  if (!isBarVisible) {
    return (
      <Button
        onClick={handleToggleVisibility}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-lg z-[100] h-12 w-12 p-0 bg-primary hover:bg-primary/90"
      >
        <ChevronUp className="h-6 w-6 text-primary-foreground" />
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl transition-transform duration-300 z-[100] h-[50vh] flex flex-col`}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        {mode === 'edit' ? (
          <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-8" />
        )}
        
        <span className="font-semibold truncate max-w-[200px]">
          {mode === 'edit' 
            ? (selectedObject?.name || selectedObject?.type || 'Edit Object')
            : 'Objects'}
        </span>

        <Button variant="ghost" size="icon" onClick={handleToggleVisibility} className="h-8 w-8">
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {mode === 'list' ? (
            <>
              {/* Add Objects Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Object</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={() => handleAddIcon('circle')}>
                    <Circle className="h-5 w-5" />
                    <span className="text-[10px]">Circle</span>
                  </Button>
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={() => handleAddIcon('camera')}>
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px]">Camera</span>
                  </Button>
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={() => handleAddIcon('square')}>
                    <Square className="h-5 w-5" />
                    <span className="text-[10px]">Square</span>
                  </Button>
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={() => handleAddIcon('triangle')}>
                    <Triangle className="h-5 w-5" />
                    <span className="text-[10px]">Triangle</span>
                  </Button>
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={() => handleAddIcon('hexagon')}>
                    <Hexagon className="h-5 w-5" />
                    <span className="text-[10px]">Hexagon</span>
                  </Button>
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={() => handleAddIcon('arrow-right')}>
                    <ArrowRight className="h-5 w-5" />
                    <span className="text-[10px]">Arrow</span>
                  </Button>
                  <Button variant="outline" className="shrink-0 flex-col gap-1 h-16 w-16 min-h-[44px]" onClick={handleAddText}>
                    <Type className="h-5 w-5" />
                    <span className="text-[10px]">Text</span>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Object List Section */}
              <div className="space-y-3 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Layer Objects</h3>
                <div className="space-y-1">
                  {docState.objects.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground italic border border-dashed rounded-lg">
                      No objects added yet
                    </div>
                  ) : (
                    docState.objects.map(obj => {
                      const layer = docState.layers.find(l => l.id === obj.layerId);
                      return (
                        <div 
                          key={obj.id}
                          className="flex items-center gap-3 p-3 rounded-md border border-border bg-card active:bg-accent transition-colors cursor-pointer"
                          onClick={() => uiDispatch({ type: 'SELECT_OBJECT', payload: obj.id })}
                        >
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                            {obj.type === 'icon' ? <Plus className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{obj.name || obj.type}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{layer?.name || 'Unknown Layer'}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode Content */}
              {selectedObject ? (
                <div className="space-y-6 pb-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name / Label</label>
                    <Input 
                      value={selectedObject.name || ''} 
                      onChange={(e) => docDispatch({ 
                        type: 'UPDATE_OBJECTS', 
                        payload: { ids: [selectedObject.id], updates: { name: e.target.value } } 
                      })}
                      placeholder="Enter label..."
                    />
                  </div>

                  <Separator />

                  <ObjectPhotoGallery 
                    objectId={selectedObject.id} 
                    photos={selectedObject.photos || []} 
                  />

                  <Separator />

                  <Button 
                    variant="destructive" 
                    className="w-full gap-2 min-h-[44px]"
                    onClick={() => {
                      docDispatch({ type: 'DELETE_OBJECTS', payload: [selectedObject.id] });
                      handleBackToList();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Object
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                   Object not found
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
