import React, { useCallback } from 'react';
import { useEditor } from '@/lib/editor-context';
import { Upload, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PDFUploader = () => {
  const { dispatch } = useEditor();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      dispatch({ type: 'SET_PDF', payload: file });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-8">
      <div className="max-w-md w-full bg-card border border-dashed border-border rounded-xl p-12 text-center flex flex-col items-center gap-6 shadow-sm hover:border-primary/50 transition-colors">
        <div className="p-4 bg-primary/10 rounded-full">
          <FileUp className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Upload PDF</h2>
          <p className="text-muted-foreground text-sm">
            Start by uploading a PDF document to edit.
          </p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid="input-pdf-upload"
          />
          <Button size="lg" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Select Document
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Supports standard PDF files. All processing is done in your browser.
        </p>
      </div>
    </div>
  );
};
