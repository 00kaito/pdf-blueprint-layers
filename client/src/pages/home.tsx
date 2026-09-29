import React, { Suspense, lazy, useState } from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {PDFUploader} from '@/components/editor/PDFUploader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useCurrentUser } from '@/hooks/useAuth';
import { Loader2, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const Canvas = lazy(() => import('@/components/editor/Canvas').then(module => ({ default: module.Canvas })));
const Toolbar = lazy(() => import('@/components/editor/Toolbar').then(module => ({ default: module.Toolbar })));

const LayerPanel = lazy(() => import('@/components/editor/LayerPanel').then(module => ({ default: module.LayerPanel })));
const PropertiesPanel = lazy(() => import('@/components/editor/PropertiesPanel').then(module => ({ default: module.PropertiesPanel })));
const ToolHint = lazy(() => import('@/components/editor/Canvas/ToolHint').then(module => ({ default: module.ToolHint })));
const MobileBottomBar = lazy(() => import('@/components/editor/MobileBottomBar').then(module => ({ default: module.MobileBottomBar })));

const SHOW_LAYERS_STORAGE_KEY = 'editor.showLayers';

const Home = () => {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();
  const isMobile = useIsMobile();
  const { isSaving } = useAutoSave();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  // Remembered per device; the first time it is hidden in iPad mode (more room to work, layers are a desk thing).
  const [showLayers, setShowLayersState] = useState(() => {
    try {
      const saved = localStorage.getItem(SHOW_LAYERS_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch { /* storage unavailable */ }
    return !uiState.ipadMode;
  });
  const setShowLayers = (value: boolean) => {
    setShowLayersState(value);
    try { localStorage.setItem(SHOW_LAYERS_STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
  };

  if (!docState.pdfFile) {
    return <PDFUploader />;
  }

  const hasSelectedObject = uiState.selectedObjectIds.length > 0;

  if (isMobile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
        {uiState.isImporting && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold">Loading Project...</p>
            <p className="text-muted-foreground text-sm">Processing large files may take a moment</p>
          </div>
        )}
        <div className={cn("flex flex-col h-screen overflow-hidden bg-background relative", hasSelectedObject ? "pb-48" : "pb-16")}>
          <Toolbar isSaving={isSaving} />
          <Canvas />
          {/* Sidebars are hidden for TECH on mobile by not rendering them and restricting MobileBottomBar */}
          <MobileBottomBar />
        </div>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      {uiState.isImporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl font-semibold">Loading Project...</p>
          <p className="text-muted-foreground text-sm">Processing large files may take a moment</p>
        </div>
      )}
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <Toolbar isSaving={isSaving} />
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar (collapsible, to give the canvas room on a tablet) */}
          {showLayers && (
            <div className="flex flex-col overflow-y-auto border-r border-border w-64 bg-card shrink-0">
              <LayerPanel onCollapse={() => setShowLayers(false)} />
            </div>
          )}
          {!showLayers && (
            <button
              type="button"
              onClick={() => setShowLayers(true)}
              className={cn(
                "absolute top-2 left-2 z-40 flex items-center gap-1.5 rounded-md border border-border bg-card/95 px-2 text-xs font-medium shadow-md hover:bg-muted",
                uiState.ipadMode ? "h-10" : "h-8"
              )}
              title="Show layers & progress"
              data-testid="show-layer-panel"
            >
              <PanelLeftOpen className="h-4 w-4" />
              Layers
            </button>
          )}
          
          {/* Main Canvas Area */}
          <div className="relative flex flex-1 min-w-0">
            <Canvas />
            {!isTech && <ToolHint />}
          </div>

          {/* Right Sidebar - Properties Panel. In iPad mode it floats over the canvas instead of narrowing it. */}
          {hasSelectedObject && (
            <div className={cn(
              "flex flex-col overflow-y-auto border-l border-border w-64 bg-card shrink-0",
              uiState.ipadMode && "absolute right-0 top-0 bottom-0 z-40 shadow-xl"
            )}>
              <PropertiesPanel />
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
};

export default Home;
