import React from 'react';
import { EditorProvider, useEditor } from '@/lib/editor-context';
import { PDFUploader } from '@/components/editor/PDFUploader';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { Toolbar } from '@/components/editor/Toolbar';
import { Canvas } from '@/components/editor/Canvas';

const EditorApp = () => {
  const { state } = useEditor();

  if (!state.pdfFile && state.objects.length === 0) {
    return <PDFUploader />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LayerPanel />
        <Canvas />
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <EditorProvider>
      <EditorApp />
    </EditorProvider>
  );
}
