import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {ChevronLeft, Loader2, Check, User} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {useCurrentUser} from '@/hooks/useAuth';
import {ObjectPropertyEditor} from './Toolbar/ObjectPropertyEditor';
import {ZoomControls} from './Toolbar/ZoomControls';
import {ProjectActions} from './Toolbar/ProjectActions';
import {ToolSelector} from './Toolbar/ToolSelector';
import {useIsMobile} from '@/hooks/use-mobile';

export const Toolbar = ({ isSaving }: { isSaving?: boolean }) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const isMobile = useIsMobile();
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  const selectedObjects = docState.objects.filter(o => uiState.selectedObjectIds.includes(o.id));

  return (
    <div className="h-16 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => dispatch({ type: 'RESET_EDITOR' })}
          className="flex items-center gap-1 -ml-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {!isMobile && <span>Projects</span>}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {!isMobile && (
          <div className="flex items-center gap-4">
            <ToolSelector isTech={isTech} />
            
            <ObjectPropertyEditor 
              selectedObjects={selectedObjects}
              selectedObjectIds={uiState.selectedObjectIds}
              layers={docState.layers}
              isTech={isTech}
            />
          </div>
        )}

        {isSaving !== undefined && docState.projectId && !isTech && (
          <div className="flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-muted/50 text-[10px] font-medium text-muted-foreground transition-all">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {!isMobile && <span>Saving...</span>}
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-500" />
                {!isMobile && <span>Saved</span>}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xs font-bold text-foreground truncate max-w-[80px]">
                {user.username}
              </span>
              <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">
                {user.role}
              </span>
            </div>
          </div>
        )}

        {!isMobile && (
          <>
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <ZoomControls scale={uiState.scale} />
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        <ProjectActions 
          projectId={docState.projectId}
          pdfFile={docState.pdfFile}
          isTech={isTech}
          exportSettings={docState.exportSettings}
        />
      </div>
    </div>
  );
};
