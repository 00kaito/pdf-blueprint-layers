import React, { useState, useEffect } from 'react';
import { useDocument, useUI } from '@/lib/editor-context';
import { ObjectPhotoGallery } from './ObjectPhotoGallery';
import { MobileAddObjectPanel } from './MobileAddObjectPanel';
import { 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Camera,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';

export const MobileBottomBar: React.FC = () => {
  const { state: docState, dispatch: docDispatch } = useDocument();
  const { state: uiState, dispatch: uiDispatch } = useUI();

  const [isBarVisible, setIsBarVisible] = useState(true);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const selectedObjectId = uiState.selectedObjectIds[0];
  const selectedObject = docState.objects.find(o => o.id === selectedObjectId);
  const activeLayer = docState.layers.find(l => l.id === uiState.activeLayerId);

  const [localName, setLocalName] = useState('');

  useEffect(() => {
    if (selectedObject) {
      setLocalName(selectedObject.name || '');
    }
  }, [selectedObject?.id, selectedObject?.name]);

  const handleNameChange = (newName: string) => {
    setLocalName(newName);
  };

  useEffect(() => {
    if (!selectedObjectId || !selectedObject || localName === selectedObject.name) return;

    const timer = setTimeout(() => {
      docDispatch({
        type: 'UPDATE_OBJECTS',
        payload: { ids: [selectedObjectId], updates: { name: localName } }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [localName, selectedObjectId, selectedObject, docDispatch]);

  const handleStatusChange = (status: 'PLANNED' | 'CABLE_PULLED' | 'TERMINATED' | 'TESTED' | 'APPROVED' | 'ISSUE') => {
    if (!selectedObjectId) return;
    docDispatch({
      type: 'UPDATE_OBJECTS',
      payload: { ids: [selectedObjectId], updates: { status } }
    });
  };

  const openEditSheet = (section?: 'photos' | 'properties') => {
    setEditSheetOpen(true);
    if (section) {
      // Small delay to allow sheet to render
      setTimeout(() => {
        const id = section === 'photos' ? 'photo-gallery-section' : 'full-properties-section';
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  if (!isBarVisible) {
    return (
      <Button
        onClick={() => setIsBarVisible(true)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-lg z-[100] h-12 w-12 p-0 bg-primary hover:bg-primary/90"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </Button>
    );
  }

  const statuses: { value: 'PLANNED' | 'CABLE_PULLED' | 'TERMINATED' | 'TESTED' | 'APPROVED' | 'ISSUE', label: string, color: string }[] = [
    { value: 'PLANNED', label: 'Planned', color: 'bg-[#f87171]' },
    { value: 'CABLE_PULLED', label: 'Pulled', color: 'bg-[#3b82f6]' },
    { value: 'TERMINATED', label: 'Terminated', color: 'bg-[#a855f7]' },
    { value: 'TESTED', label: 'Tested', color: 'bg-[#4ade80]' },
    { value: 'APPROVED', label: 'Approved', color: 'bg-[#16a34a]' },
    { value: 'ISSUE', label: 'Issue', color: 'bg-[#dc2626]' },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-[100] h-12 flex items-center px-4 gap-3">
        {/* LEFT: Status colors toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Checkbox 
            id="status-colors" 
            checked={uiState.showStatusColors} 
            onCheckedChange={() => uiDispatch({ type: 'TOGGLE_STATUS_COLORS' })}
          />
          <label htmlFor="status-colors" className="text-[10px] font-medium leading-none whitespace-nowrap">By status</label>
        </div>

        {/* CENTER: Contextual zone */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {selectedObject ? (
            <Input 
              value={localName} 
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-8 text-xs px-2"
              placeholder="Object name..."
            />
          ) : (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 max-w-full cursor-pointer"
              onClick={() => setAddSheetOpen(true)}
            >
              <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-medium truncate">
                {activeLayer?.name || 'No Layer'}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: Action zone */}
        <div className="flex items-center gap-1 shrink-0">
          {selectedObject ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSheet('photos')}>
                <Camera className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSheet('properties')}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddSheetOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsBarVisible(false)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Object Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent side="bottom" className="px-0 pt-2 pb-6 max-h-[38vh] rounded-t-xl">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2" />
          <MobileAddObjectPanel onClose={() => setAddSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Edit Object Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="bottom" className="px-0 pt-2 pb-0 h-[55vh] rounded-t-xl overflow-hidden flex flex-col">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2 shrink-0" />
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-6 pb-10">
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name / Label</label>
                <Input 
                  value={localName} 
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter label..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {statuses.map((status) => (
                    <Button
                      key={status.value}
                      variant={selectedObject?.status === status.value ? "default" : "outline"}
                      className={cn(
                        "h-10 text-[10px] px-1 flex flex-col items-center gap-1",
                        selectedObject?.status === status.value && status.color
                      )}
                      onClick={() => handleStatusChange(status.value)}
                    >
                      <div className={cn("w-2 h-2 rounded-full", status.color)} />
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedObject && (
                <div id="photo-gallery-section">
                  <ObjectPhotoGallery 
                    objectId={selectedObject.id} 
                    photos={selectedObject.photos || []} 
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};
