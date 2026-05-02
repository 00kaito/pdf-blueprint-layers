import React, { useRef, useState } from 'react';
import { useDocument } from '@/lib/editor-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { compressImage } from '@/core/image-compress';
import { useUploadFile } from '@/hooks/useProjects';

interface ObjectPhotoGalleryProps {
  objectId: string;
  photos: string[];
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
  const uploadFile = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log(`[PhotoGallery] Selected ${files.length} files`);
    for (const file of files) {
      try {
        console.log(`[PhotoGallery] Compressing: ${file.name} (${file.size} bytes)`);
        const photoDataUrl = await compressImage(file);
        
        // Convert data URL back to File for upload
        const photoFile = dataUrlToFile(photoDataUrl, file.name);
        
        console.log(`[PhotoGallery] Uploading: ${file.name} (compressed to ${photoFile.size} bytes)`);
        // Upload to server
        const result = await uploadFile.mutateAsync({ 
          file: photoFile, 
          projectId: state.projectId || undefined 
        });

        console.log(`[PhotoGallery] Upload successful: ${result.url}`);
        dispatch({
          type: 'ADD_OBJECT_PHOTO',
          payload: { id: objectId, photoDataUrl: result.url },
        });
      } catch (error) {
        console.error('[PhotoGallery] Failed to process/upload image:', error);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    dispatch({
      type: 'REMOVE_OBJECT_PHOTO',
      payload: { id: objectId, index },
    });
    if (lightboxIndex === index) {
      setLightboxIndex(null);
    } else if (lightboxIndex !== null && lightboxIndex > index) {
      setLightboxIndex(lightboxIndex - 1);
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <Camera className="w-3 h-3" />
          Photos
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="h-3 w-3" />
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
                removePhoto(index);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length === 0 && (
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
                
                <button
                  className="absolute top-4 right-12 p-2 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors"
                  onClick={() => removePhoto(lightboxIndex)}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
