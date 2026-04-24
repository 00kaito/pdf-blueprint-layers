import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Canvas} from '@/components/editor/Canvas';
import {Toolbar} from '@/components/editor/Toolbar';
import {ObjectToolbar} from '@/components/editor/ObjectToolbar';
import {LayerPanel} from '@/components/editor/LayerPanel';
import {PropertiesPanel} from '@/components/editor/PropertiesPanel';
import {PDFUploader} from '@/components/editor/PDFUploader';

const Home = () => {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();

  if (!docState.pdfFile) {
    return <PDFUploader />;
  }

  const hasSelectedObject = !!uiState.selectedObjectId;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex flex-col overflow-y-auto border-r border-border w-64 bg-card shrink-0">
          <ObjectToolbar />
          <LayerPanel />
        </div>
        
        {/* Main Canvas Area */}
        <Canvas />

        {/* Right Sidebar - Properties Panel */}
        {hasSelectedObject && (
          <div className="flex flex-col overflow-y-auto border-l border-border w-64 bg-card shrink-0">
            <PropertiesPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
