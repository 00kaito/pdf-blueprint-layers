import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Separator} from '@/components/ui/separator';
import {useCurrentUser} from '@/hooks/useAuth';
import {ZoomControls} from './Toolbar/ZoomControls';
import {HistoryControls} from './Toolbar/HistoryControls';
import {ProjectActions} from './Toolbar/ProjectActions';
import {ToolSelector} from './Toolbar/ToolSelector';
import {MainMenu} from './Toolbar/MainMenu';
import {ContextBar} from './Toolbar/ContextBar';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

/** Small autosave indicator: a dot instead of a "Saved" pill. */
const SaveStatus = ({ isSaving }: { isSaving: boolean }) => (
  <span
    className="flex h-6 w-6 items-center justify-center"
    title={isSaving ? 'Saving…' : 'All changes saved'}
    data-testid="save-status"
  >
    <span className={cn(
      "h-2.5 w-2.5 rounded-full",
      isSaving ? "border-2 border-amber-500 border-t-transparent animate-spin" : "bg-green-500"
    )} />
  </span>
);

export const Toolbar = ({ isSaving }: { isSaving?: boolean }) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const isMobile = useIsMobile();
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();

  if (isMobile) {
    // Phone layout: no editing tools, just the project actions.
    return (
      <div className="h-16 border-b border-border bg-card flex items-center px-4 justify-end shrink-0">
        <ProjectActions
          projectId={docState.projectId}
          pdfFile={docState.pdfFile}
          isTech={isTech}
          exportSettings={docState.exportSettings}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <div className={cn("h-14 border-b border-border bg-card flex items-center px-4 justify-between gap-3", uiState.ipadMode && "ipad-mode h-16")}>
        {/* On narrow screens (iPad portrait) the tools scroll sideways instead of being cut off. */}
        <div className="flex items-center gap-2 min-w-0 h-full overflow-x-auto [scrollbar-width:none]">
          <MainMenu />
          <Separator orientation="vertical" className="h-6" />
          <ToolSelector isTech={isTech} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <HistoryControls />
          <Separator orientation="vertical" className="h-6" />
          <ZoomControls scale={uiState.scale} />
          {isSaving !== undefined && docState.projectId && !isTech && <SaveStatus isSaving={isSaving} />}
        </div>
      </div>
      <ContextBar />
    </div>
  );
};
