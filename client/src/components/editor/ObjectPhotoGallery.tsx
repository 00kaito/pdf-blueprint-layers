import React, { useRef, useState } from 'react';
import { useDocument } from '@/lib/editor-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Camera, ChevronLeft, ChevronRight, Plus, Trash2, Loader2, AlertCircle, X } from 'lucide-react';
import { compressImage } from '@/core/image-compress';
import { useUploadFile } from '@/hooks/useProjects';
import { useManualSave } from '@/hooks/useManualSave';
import { Progress } from '@/components/ui/progress';
import { useCurrentUser } from '@/hooks/useAuth';

interface ObjectPhotoGalleryProps {
  objectId: string;
  photos: string[];
}

interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'done' | 'error';
  error?: string;
}

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

export const ObjectPhotoGallery: React.FC<ObjectPhotoGalleryProps> = ({ objectId, photos }) => {
  const { state, dispatch } = useDocument();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const uploadFile = useUploadFile();
  const { handleSave } = useManualSave();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadQueue, setUploadQueue] = useState<Record<string, UploadStatus>>({});
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    console.log(`[PhotoGallery] Starting upload for ${files.length} files`);
    
    for (const file of files) {
      const uploadId = `${Date.now()}-${file.name}`;
      
      setUploadQueue(prev => ({
        ...prev,
        [uploadId]: { fileName: file.name, progress: 10, status: 'compressing' }
      }));

      try {
        console.log(`[PhotoGallery] Stage 1: Compressing ${file.name}`);
        const photoDataUrl = await compressImage(file);
        
        setUploadQueue(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], progress: 40, status: 'uploading' }
        }));

        const photoFile = dataUrlToFile(photoDataUrl, file.name);
        console.log(`[PhotoGallery] Stage 2: Uploading ${file.name} (Compressed: ${photoFile.size} bytes)`);
        
        const result = await uploadFile.mutateAsync({ 
          file: photoFile, 
          projectId: state.projectId || undefined 
        });

        setUploadQueue(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], progress: 80, status: 'done' }
        }));

        console.log(`[PhotoGallery] Stage 3: Adding to project state: ${result.url}`);
        dispatch({
          type: 'ADD_OBJECT_PHOTO',
          payload: { id: objectId, photoDataUrl: result.url },
        });
        await handleSave(true);

        setUploadQueue(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], progress: 100 }
        }));

        setTimeout(() => {
          setUploadQueue(prev => {
            const next = { ...prev };
            delete next[uploadId];
            return next;
          });
        }, 2000);

      } catch (error: any) {
        console.error(`[PhotoGallery] Error processing ${file.name}:`, error);
        setUploadQueue(prev => ({
          ...prev,
          [uploadId]: { 
            status: 'error', 
            error: error.message || 'Unknown error',
            fileName: file.name,
            progress: prev[uploadId].progress
          }
        }));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmDelete = (index: number) => {
    setPhotoToDelete(index);
  };

  const removePhoto = async () => {
    if (photoToDelete === null) return;
    
    dispatch({
      type: 'REMOVE_OBJECT_PHOTO',
      payload: { id: objectId, index: photoToDelete },
    });
    await handleSave(true);
    
    if (lightboxIndex === photoToDelete) {
      setLightboxIndex(null);
    } else if (lightboxIndex !== null && lightboxIndex > photoToDelete) {
      setLightboxIndex(lightboxIndex - 1);
    }
    
    setPhotoToDelete(null);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && photos.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % photos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && photos.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
    }
  };

  const isUploading = Object.values(uploadQueue).some(item => item.status === 'compressing' || item.status === 'uploading');

  const clearUpload = (id: string) => {
    setUploadQueue(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <Camera className="w-3 h-3" />
          Photos ({photos.length})
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
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

      {Object.keys(uploadQueue).length > 0 && (
        <div className="space-y-2 border rounded-md p-2 bg-muted/50">
          {Object.entries(uploadQueue).map(([id, item]) => (
            <div key={id} className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-medium">
                <span className="truncate max-w-[150px]">{item.fileName}</span>
                <div className="flex items-center gap-2">
                  <span className={item.status === 'error' ? 'text-destructive' : 'text-primary'}>
                    {item.status === 'compressing' && 'Compressing...'}
                    {item.status === 'uploading' && 'Uploading...'}
                    {item.status === 'done' && 'Ready!'}
                    {item.status === 'error' && 'Failed'}
                  </span>
                  {item.status === 'error' && (
                    <button 
                      onClick={() => clearUpload(id)}
                      className="p-0.5 hover:bg-destructive/10 rounded text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <Progress 
                value={item.progress} 
                className={`h-1 ${item.status === 'error' ? '[&>div]:bg-destructive' : ''}`} 
              />
              {item.error && (
                <div className="flex items-start gap-1 text-[9px] text-destructive leading-tight">
                  <AlertCircle className="w-2 h-2 mt-0.5 shrink-0" />
                  <span>{item.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="group relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer bg-muted"
            onClick={() => openLightbox(index)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                confirmDelete(index);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length === 0 && !isUploading && (
          <div className="col-span-3 py-4 text-center text-xs text-muted-foreground italic border border-dashed rounded-md">
            No photos yet
          </div>
        )}
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo Viewer</DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center w-full h-[80vh]">
            {lightboxIndex !== null && (
              <>
                <img
                  src={photos[lightboxIndex]}
                  alt={`Photo ${lightboxIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 h-10 w-10 text-white hover:bg-white/20"
                      onClick={prevPhoto}
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 h-10 w-10 text-white hover:bg-white/20"
                      onClick={nextPhoto}
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                      {lightboxIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 h-11 w-11 text-white hover:bg-white/20 z-50 rounded-full"
                  onClick={closeLightbox}
                >
                  <X className="h-8 w-8" />
                </Button>

                <button
                  className="absolute top-4 right-16 p-2 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors"
                  onClick={() => confirmDelete(lightboxIndex)}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={photoToDelete !== null} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the photo from the object.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

