import React, { useRef, useState } from 'react';
import { useDocument, useUI } from '@/lib/editor-context';
import { useCurrentUser } from '@/hooks/useAuth';
import { useUploadFile } from '@/hooks/useProjects';
import { compressImage } from '@/core/image-compress';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
  const isTech = user?.role === 'TECH';
  
  const uploadFileMutation = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  if (isTech) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-[100] h-12 flex items-center px-4">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="status-colors-mobile" 
            checked={uiState.showStatusColors} 
            onCheckedChange={() => uiDispatch({ type: 'TOGGLE_STATUS_COLORS' })}
          />
          <label htmlFor="status-colors-mobile" className="text-xs font-medium leading-none">Color by status</label>
        </div>
      </div>
    );
  }

  // PM version
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-[100] h-12 flex items-center px-4 justify-between">
       <div className="flex items-center gap-2 min-w-0 mr-4">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider shrink-0">Object:</span>
          <span className="text-xs font-medium truncate">
            {selectedObject ? (selectedObject.name || 'Untitled') : "Select an object"}
          </span>
       </div>
       
       <div className="flex items-center gap-2">
         {selectedObject && (
           <Button 
             size="sm" 
             variant="default" 
             className="h-8 gap-1.5 px-3 rounded-full"
             disabled={isUploading}
             onClick={() => fileInputRef.current?.click()}
           >
             {isUploading ? (
               <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
               <Camera className="h-4 w-4" />
             )}
             <span className="text-xs">Add Photo</span>
           </Button>
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
  );
};
