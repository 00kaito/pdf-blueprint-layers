import React, {useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Upload, FolderOpen} from 'lucide-react';
import {useImport} from '@/hooks/useImport';

export const PDFUploader = () => {
  const { handleFileImport } = useImport();
  const dirInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileImport(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">PDF Blueprint Editor</h1>
            <p className="text-muted-foreground text-sm">
              Upload a blueprint or import an existing project
            </p>
          </div>

          <div className="grid gap-4">
            <div className="relative group">
              <input
                type="file"
                accept="application/pdf,.json,.zip"
                onChange={onFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button className="w-full h-32 border-dashed flex flex-col gap-2 bg-background hover:bg-muted text-foreground transition-colors" variant="outline">
                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-semibold">Upload PDF / Project (JSON/ZIP)</span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Click or drag and drop</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
               <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => dirInputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4" />
                Import Project Folder
              </Button>
              <input
                type="file"
                ref={dirInputRef}
                multiple
                {...{ webkitdirectory: "", directory: "" } as any}
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
