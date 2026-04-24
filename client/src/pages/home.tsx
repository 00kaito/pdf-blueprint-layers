import React from 'react';
import {useDocument} from '@/lib/editor-context';
import {Canvas} from '@/components/editor/Canvas';
import {Toolbar} from '@/components/editor/Toolbar';
import {LayerPanel} from '@/components/editor/LayerPanel';
import {PropertiesPanel} from '@/components/editor/PropertiesPanel';
import {PDFUploader} from '@/components/editor/PDFUploader';

const Home = () => {
  const { state: docState } = useDocument();

  if (!docState.pdfFile) {
    return <PDFUploader />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Canvas />
        <div className="flex flex-col overflow-y-auto">
          <LayerPanel />
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

export default Home;
