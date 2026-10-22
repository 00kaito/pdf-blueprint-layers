import React from 'react';
import { useDocument, useDocumentDispatch, useUI } from '@/lib/editor-context';
import { EditorObject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ObjectPhotoGallery } from './ObjectPhotoGallery';
import { PlanChangeSection } from './PlanChangeSection';
import { CableEditor } from './CableEditor';
import { CameraCoverageEditor } from './CameraCoverageEditor';
import { isCamera } from '@/core/camera-coverage';
import { isCableDevice } from '@/core/cable-routing';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useAuth';
import { STATUSES, statusUpdate } from '@/core/status';

export const PMObjectDetailsPanel: React.FC = () => {
  const { state: uiState } = useUI();
  const { state: documentState } = useDocument();
  const dispatch = useDocumentDispatch();
  const { data: user } = useCurrentUser();

  const selectedObject = documentState.objects.find(
    obj => obj.id === uiState.selectedObjectIds[0]
  );

  if (!selectedObject) {
    return null;
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_OBJECT',
      payload: { id: selectedObject.id, updates: { notes: e.target.value } },
    });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_OBJECT',
      payload: { id: selectedObject.id, updates: { name: e.target.value } },
    });
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Object Details</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="object-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Label
          </label>
          <Input
            id="object-label"
            type="text"
            value={selectedObject.name || ''}
            onChange={handleLabelChange}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="object-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <Textarea
            id="object-notes"
            value={selectedObject.notes || ''}
            onChange={handleNoteChange}
            className="mt-1"
            rows={4}
          />
        </div>
        
        <div>
          <h4 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Status</h4>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="default"
                className={cn(
                  "h-14 text-[13px] px-4 justify-start gap-3 font-black uppercase tracking-tight shadow-md transition-all",
                  selectedObject.status === s.id ? "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground scale-[1.02]" : "bg-background border-border/60"
                )}
                onClick={() => dispatch({
                  type: 'UPDATE_OBJECTS',
                  payload: { ids: [selectedObject.id], updates: statusUpdate(s.id, user?.username) },
                })}
              >
                <div className={cn("w-3 h-3 rounded-full", s.dot)} />
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        {selectedObject.type !== 'text' && <PlanChangeSection objects={[selectedObject]} large />}
        {isCableDevice(selectedObject) && (
          <CableEditor objects={[selectedObject]} readOnly={user?.role === 'TECH'} large />
        )}
        {isCamera(selectedObject) && (
          <CameraCoverageEditor objects={[selectedObject]} readOnly={user?.role === 'TECH'} large />
        )}

        <div>
          <h4 className="text-md font-semibold mb-2">Photos</h4>
          <ObjectPhotoGallery objectId={selectedObject.id} photos={selectedObject.photos || []} />
        </div>
      </div>
      <Button onClick={() => dispatch({ type: 'SET_SELECTION', payload: [] })} className="mt-4 w-full">
        Close
      </Button>
    </div>
  );
};
