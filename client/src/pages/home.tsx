import React, { Suspense, lazy } from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {PDFUploader} from '@/components/editor/PDFUploader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useCurrentUser } from '@/hooks/useAuth';

const Canvas = lazy(() => import('@/components/editor/Canvas').then(module => ({ default: module.Canvas })));
const Toolbar = lazy(() => import('@/components/editor/Toolbar').then(module => ({ default: module.Toolbar })));

const LayerPanel = lazy(() => import('@/components/editor/LayerPanel').then(module => ({ default: module.LayerPanel })));
const PropertiesPanel = lazy(() => import('@/components/editor/PropertiesPanel').then(module => ({ default: module.PropertiesPanel })));
const MobileBottomBar = lazy(() => import('@/components/editor/MobileBottomBar').then(module => ({ default: module.MobileBottomBar })));

const Home = () => {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();
  const isMobile = useIsMobile();
  const { isSaving } = useAutoSave();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';

  if (!docState.pdfFile) {
    return <PDFUploader />;
  }

  const hasSelectedObject = uiState.selectedObjectIds.length > 0;

  if (isMobile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
        <div className="flex flex-col h-screen overflow-hidden bg-background relative pb-12">
          <Canvas />
          {/* Sidebars are hidden for TECH on mobile by not rendering them and restricting MobileBottomBar */}
          <MobileBottomBar />
        </div>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <Toolbar isSaving={isSaving} />
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="flex flex-col overflow-y-auto border-r border-border w-64 bg-card shrink-0">
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
    </Suspense>
  );
};

export default Home;
