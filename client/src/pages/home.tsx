import React, { useEffect } from 'react';
import { EditorProvider, useEditor } from '@/lib/editor-context';
import { PDFUploader } from '@/components/editor/PDFUploader';
import { LayerPanel } from '@/components/editor/LayerPanel';
import { Toolbar } from '@/components/editor/Toolbar';
import { Canvas } from '@/components/editor/Canvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';

const EditorApp = () => {
  const { state, dispatch } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Only copy if not in an input/textarea (unless it's the hidden clipboard input)
        // But for our canvas objects, we want to copy them even if focus is somewhere else, 
        // unless the user is typing in a text box.
        // We should check if active element is an input.
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement).isContentEditable) {
           return;
        }
        e.preventDefault();
        dispatch({ type: 'COPY_OBJECT' });
      }
      
      // Check for Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement).isContentEditable) {
           return;
        }
        e.preventDefault();
        dispatch({ type: 'PASTE_OBJECT' });
      }

      // Check for Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement).isContentEditable) {
           return;
        }
        if (state.selectedObjectId) {
           e.preventDefault();
           dispatch({ type: 'DELETE_OBJECT', payload: state.selectedObjectId });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, state.selectedObjectId]); // Depend on selectedObjectId for delete check

  if (!state.pdfFile && state.objects.length === 0) {
    return <PDFUploader />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LayerPanel />
        <Canvas />
        <PropertiesPanel />
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
