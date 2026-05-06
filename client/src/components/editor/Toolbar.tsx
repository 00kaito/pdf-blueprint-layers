import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {ChevronLeft, Loader2, Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {useCurrentUser} from '@/hooks/useAuth';
import {ObjectPropertyEditor} from './Toolbar/ObjectPropertyEditor';
import {ZoomControls} from './Toolbar/ZoomControls';
import {ProjectActions} from './Toolbar/ProjectActions';

export const Toolbar = ({ isSaving }: { isSaving?: boolean }) => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
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
          <span>Projects</span>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <ObjectPropertyEditor 
            selectedObjects={selectedObjects}
            selectedObjectIds={uiState.selectedObjectIds}
            layers={docState.layers}
            isTech={isTech}
          />
        </div>

        {isSaving !== undefined && docState.projectId && !isTech && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 text-[10px] font-medium text-muted-foreground transition-all">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span>Saved</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ZoomControls scale={uiState.scale} />
        
        <Separator orientation="vertical" className="h-6" />

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
