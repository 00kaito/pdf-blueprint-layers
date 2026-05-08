import React, { useRef, useState } from 'react';
import { useDocument, useUI } from '@/lib/editor-context';
import { useCurrentUser } from '@/hooks/useAuth';
import { useUploadFile } from '@/hooks/useProjects';
import { compressImage } from '@/core/image-compress';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ObjectPhotoGallery } from './ObjectPhotoGallery';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { PMObjectDetailsPanel } from './PMObjectDetailsPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { useManualSave } from '@/hooks/useManualSave';
import { cn } from '@/lib/utils';

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const MobileBottomBar: React.FC = () => {
  const { state: docState, dispatch: docDispatch } = useDocument();
  const { state: uiState, dispatch: uiDispatch } = useUI();
  const { data: user } = useCurrentUser();
  const isMobile = useIsMobile();
  const { handleSave } = useManualSave();
  const isTech = user?.role === 'TECH';
  const isPM = user?.role === 'PM';
  
  const uploadFileMutation = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const selectedObjectId = uiState.selectedObjectIds[0];
  const selectedObject = docState.objects.find(o => o.id === selectedObjectId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedObjectId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const photoDataUrl = await compressImage(file);
        const photoFile = dataUrlToFile(photoDataUrl, file.name);
        const result = await uploadFileMutation.mutateAsync({ 
          file: photoFile, 
          projectId: docState.projectId || undefined 
        });

        docDispatch({
          type: 'ADD_OBJECT_PHOTO',
          payload: { id: selectedObjectId, photoDataUrl: result.url },
        });
        handleSave(true);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const StatusToggle = () => (
    <div className="flex items-center gap-2 shrink-0">
      <Checkbox 
        id="status-colors-mobile" 
        checked={uiState.showStatusColors} 
        onCheckedChange={() => uiDispatch({ type: 'TOGGLE_STATUS_COLORS' })}
      />
      <label htmlFor="status-colors-mobile" className="text-[10px] font-bold uppercase tracking-tight leading-none whitespace-nowrap">By status</label>
    </div>
  );

  if (isTech) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-[100] h-12 flex items-center px-4">
        <StatusToggle />
      </div>
    );
  }

  const pmMobileDrawer = isPM && isMobile && selectedObject;

  // PM version
  return (
    <Drawer>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-[100] h-auto flex flex-col py-1">
        <div className="flex items-center px-4 justify-between h-20">
          <div className="flex items-center gap-4 min-w-0 mr-2">
              <StatusToggle />

              {pmMobileDrawer ? (
                <DrawerTrigger asChild>
                  <div className="flex items-center gap-1.5 min-w-0 cursor-pointer">
                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter shrink-0">OBJ:</span>
                    <span className="text-sm font-bold truncate">
                      {selectedObject ? (selectedObject.name || 'Untitled') : "Select..."}
                    </span>
                  </div>
                </DrawerTrigger>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter shrink-0">OBJ:</span>
                  <span className="text-sm font-bold truncate">
                    {selectedObject ? (selectedObject.name || 'Untitled') : "Select..."}
                  </span>
                </div>
              )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {selectedObject && (
              <>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-12 w-12 rounded-full border-2"
                  onClick={() => setIsGalleryOpen(true)}
                >
                  <ImageIcon className="h-6 w-6" />
                </Button>
                
                <Button 
                  size="lg" 
                  variant="default" 
                  className="h-12 gap-2 px-5 rounded-full shadow-lg"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  <span className="text-[13px] font-black uppercase tracking-wider">Photo ({selectedObject?.photos?.length || 0})</span>
                </Button>
              </>
            )}
            
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                {...({ capture: 'environment' } as any)}
              />
          </div>
        </div>

        {isPM && selectedObject && selectedObject.type !== 'path' && (
          <div className="px-4 pb-3 pt-2 border-t border-border shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden bg-muted/20">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {[
                { id: 'PLANNED', label: 'Plan', color: 'bg-red-400' },
                { id: 'CABLE_PULLED', label: 'Cable', color: 'bg-blue-500' },
                { id: 'TERMINATED', label: 'Term', color: 'bg-purple-500' },
                { id: 'TESTED', label: 'Test', color: 'bg-green-400' },
                { id: 'APPROVED', label: 'Appr', color: 'bg-green-600' },
                { id: 'ISSUE', label: 'Issue', color: 'bg-red-600' },
              ].map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  size="default"
                  className={cn(
                    "h-12 text-[12px] px-4 min-w-fit flex items-center gap-2.5 font-black uppercase tracking-tight rounded-full transition-all",
                    selectedObject.status === s.id 
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                      : "bg-background shadow-sm border-border/50"
                  )}
                  onClick={() => {
                    docDispatch({
                      type: 'UPDATE_OBJECTS',
                      payload: {
                        ids: [selectedObject.id],
                        updates: { 
                          status: s.id as any,
                          statusUpdatedAt: new Date().toISOString(),
                          statusUpdatedBy: user?.username || 'Unknown'
                        }
                      }
                    });
                    handleSave(true);
                  }}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", s.color)} />
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {pmMobileDrawer && (
        <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{selectedObject.name || 'Object Details'}</DrawerTitle>
            </DrawerHeader>
            <PMObjectDetailsPanel />
        </DrawerContent>
      )}
    </Drawer>
  );
};
