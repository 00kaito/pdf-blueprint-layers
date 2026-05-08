import React from 'react';
import { useDocument, useDocumentDispatch, useUI } from '@/lib/editor-context';
import { EditorObject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ObjectPhotoGallery } from './ObjectPhotoGallery';

export const PMObjectDetailsPanel: React.FC = () => {
  const { state: uiState } = useUI();
  const { state: documentState } = useDocument();
  const dispatch = useDocumentDispatch();

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
