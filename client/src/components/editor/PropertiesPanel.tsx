import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Separator} from '@/components/ui/separator';

export const PropertiesPanel = () => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();

  const selectedObject = docState.objects.find((o) => o.id === uiState.selectedObjectId);

  if (!selectedObject) {
    return (
      <div className="w-64 border-l border-border bg-card flex flex-col h-full shrink-0">
        <div className="p-4 text-center text-muted-foreground text-sm">
          No object selected
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Object Properties</h3>
      </div>
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="obj-name">Object Name</Label>
            <Input
              id="obj-name"
              value={selectedObject.name || ''}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_OBJECT',
                  payload: { id: selectedObject.id, updates: { name: e.target.value } },
                })
              }
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">X Position</Label>
              <Input
                type="number"
                value={Math.round(selectedObject.x)}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_OBJECT',
                    payload: { id: selectedObject.id, updates: { x: parseInt(e.target.value) || 0 } },
                  })
                }
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Y Position</Label>
              <Input
                type="number"
                value={Math.round(selectedObject.y)}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_OBJECT',
                    payload: { id: selectedObject.id, updates: { y: parseInt(e.target.value) || 0 } },
                  })
                }
                className="h-7 text-xs"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Opacity ({Math.round((selectedObject.opacity ?? 1) * 100)}%)</Label>
            <Slider
              value={[selectedObject.opacity ?? 1]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([val]) =>
                dispatch({
                  type: 'UPDATE_OBJECT',
                  payload: { id: selectedObject.id, updates: { opacity: val } },
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
