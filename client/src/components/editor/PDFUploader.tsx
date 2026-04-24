import React from 'react';
import {useDocument} from '@/lib/editor-context';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Upload} from 'lucide-react';

export const PDFUploader = () => {
  const { dispatch } = useDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      dispatch({ type: 'SET_PDF', payload: file });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">PDF Blueprint Editor</h1>
            <p className="text-muted-foreground text-sm">
              Upload a blueprint to start adding layers and objects
            </p>
          </div>

          <div className="grid gap-4">
            <div className="relative group">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button className="w-full h-32 border-dashed flex flex-col gap-2 bg-background hover:bg-muted text-foreground transition-colors" variant="outline">
                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>Upload PDF Blueprint</span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Click or drag and drop</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
