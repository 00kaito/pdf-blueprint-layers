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

  const handleProjectUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.layers && json.objects) {
           dispatch({ 
             type: 'IMPORT_PROJECT', 
             payload: {
               layers: json.layers, 
               objects: json.objects,
               // If the project was saved with a PDF reference, we can't easily restore the file object itself 
               // without storing it somewhere. For now, we assume the user might need to upload the PDF separately 
               // OR we just load the objects/layers.
               // Ideally, a project file should include the PDF as base64 or similar if we want full restore,
               // but that makes the file huge.
               // Let's assume for this "mockup" we just load the state and user might see objects floating 
               // if they haven't loaded a PDF, OR we switch to a "Project Loaded" state.
               // Actually, `IMPORT_PROJECT` merges payload into state.
               // If `pdfFile` is null, `EditorApp` will still show `PDFUploader`.
               // So we need to either:
               // 1. Mock a dummy PDF file so the editor opens.
               // 2. Or change `home.tsx` to allow entering editor without `pdfFile` if we have layers/objects?
               // The current `home.tsx` check is `if (!state.pdfFile) return <PDFUploader />;`.
               // So we need a dummy file or flag.
               // Let's create a dummy file object or just set a flag in state?
               // State has `pdfFile: File | null`.
               // We can't easily create a File object without data.
               // But wait, if the user uploads a project, they probably want to see the project.
               // Maybe the project JSON *should* contain the PDF base64? 
               // The user just said "upload project json".
               // Let's assume for now we just load the objects.
               // But to get past the `home.tsx` check, we need `pdfFile`.
               // I'll check if I can modify `home.tsx` to check `state.objects.length > 0` or something?
               // No, without a PDF, `react-pdf` might crash or show nothing.
               // Let's add a `projectLoaded` flag to state or just create a dummy "Empty Project" PDF?
               // Or maybe the user *also* uploads the PDF?
               // "Umozliw upload pliku lub upload projektu json".
               // If I upload JSON, I expect to see my work.
               // If the JSON doesn't contain the PDF, I can't see the background.
               // I'll assume for now the user accepts that they might need to upload the PDF too, 
               // OR I'll modify `home.tsx` to allow `pdfFile` to be null if we have project data?
               // But `Canvas` relies on `state.pdfFile` to render `<Document>`.
               // `Canvas` handles `state.pdfFile` being null: `state.pdfFile ? <Document...> : <div>No PDF Loaded</div>`.
               // So `Canvas` is fine.
               // The blocker is `home.tsx`.
               // I will modify `home.tsx` to remove the strict check or add a "skip" mode.
               // But first, let's implement the upload in `PDFUploader`.
               // I will dispatch a dummy file or add a property to state to bypass the check.
               // Let's look at `EditorAction`. I can't easily add properties to state without changing types.
               // I'll modify `home.tsx` to check `state.pdfFile || state.objects.length > 0`.
               // But wait, `objects` defaults to []. 
               // If I load a project, `objects` will be non-empty.
               
               // Issue: `home.tsx` is:
               // if (!state.pdfFile) { return <PDFUploader />; }
               
               // I will modify `home.tsx` to:
               // if (!state.pdfFile && state.objects.length === 0)
               // But initially objects is [].
               // If I import project, objects becomes [...].
               // So that check would pass.
               // But wait, `PDFUploader` needs to dispatch the import.
               // And I should probably provide a way to "start blank" or something.
               // But for now, let's just make the JSON upload work.
             } 
           });
        }
      } catch (error) {
        console.error('Failed to parse project file', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-8">
      <div className="max-w-md w-full bg-card border border-dashed border-border rounded-xl p-12 text-center flex flex-col items-center gap-6 shadow-sm hover:border-primary/50 transition-colors">
        <div className="p-4 bg-primary/10 rounded-full">
          <FileUp className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Start Project</h2>
          <p className="text-muted-foreground text-sm">
            Upload a PDF document or an existing project (JSON).
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
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
              Upload PDF
            </Button>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleProjectUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-project-upload"
            />
            <Button variant="outline" size="lg" className="w-full">
              <FileUp className="mr-2 h-4 w-4" />
              Open Project (JSON)
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Supports PDF and JSON project files.
        </p>
      </div>
    </div>
  );
};
