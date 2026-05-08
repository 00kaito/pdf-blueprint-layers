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
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-[100] h-12 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4 min-w-0 mr-2">
            <StatusToggle />

            {pmMobileDrawer ? (
              <DrawerTrigger asChild>
                <div className="flex items-center gap-1.5 min-w-0 cursor-pointer">
                  <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter shrink-0">OBJ:</span>
                  <span className="text-xs font-semibold truncate">
                    {selectedObject ? (selectedObject.name || 'Untitled') : "Select..."}
                  </span>
                </div>
              </DrawerTrigger>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter shrink-0">OBJ:</span>
                <span className="text-xs font-semibold truncate">
                  {selectedObject ? (selectedObject.name || 'Untitled') : "Select..."}
                </span>
              </div>
            )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedObject && (
            <>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-full"
                onClick={() => setIsGalleryOpen(true)}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              
              <Button 
                size="sm" 
                variant="default" 
                className="h-8 gap-1 px-3 rounded-full"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
                <span className="text-[10px] font-bold uppercase">Photo</span>
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

        {selectedObject && (
          <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
              <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-4">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-sm">Photos: {selectedObject.name || 'Untitled'}</DialogTitle>
                </DialogHeader>
                <ObjectPhotoGallery objectId={selectedObject.id} photos={selectedObject.photos || []} />
              </DialogContent>
          </Dialog>
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

