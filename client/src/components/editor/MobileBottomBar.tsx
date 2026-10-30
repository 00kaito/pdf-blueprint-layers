import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDocument, useUI } from '@/lib/editor-context';
import { useCurrentUser } from '@/hooks/useAuth';
import { useUploadFile } from '@/hooks/useProjects';
import { useFieldActions } from '@/hooks/useFieldActions';
import { useObjectCreation } from '@/hooks/useObjectCreation';
import { compressImageToFile } from '@/core/image-compress';
import { STATUSES, type ObjectStatus } from '@/core/status';
import { CANVAS_BASE_WIDTH } from '@/core/constants';
import { LV_ICON_TYPES, LV_ICONS, defaultObjectNames } from '@/core/lv-icons';
import { Camera, Circle, CopyPlus, Images, Info, Loader2, Move, Plus, Square, Trash2, Triangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlindspotShape, CoverageAreaShape } from './BlindspotShape';
import { BLINDSPOT_ICON } from '@/core/camera-coverage';
import { Checkbox } from '@/components/ui/checkbox';
import { ObjectPhotoGallery } from './ObjectPhotoGallery';
import { LvIcon } from './LvIcon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { PMObjectDetailsPanel } from './PMObjectDetailsPanel';
import { cn } from '@/lib/utils';

/** Shapes from the desktop toolbar offered on the phone (same icon types). */
const SHAPES = [
  { type: 'square', label: 'Square', icon: Square },
  { type: 'circle', label: 'Circle', icon: Circle },
  { type: 'triangle', label: 'Triangle', icon: Triangle },
] as const;

const ADD_TILE = "flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-1 text-center text-[11px] font-medium leading-tight active:bg-muted";

/** One big labelled button of the phone action row. */
const ActionButton = ({ icon: Icon, label, onClick, disabled, active, testId }: {
  icon: typeof Camera; label: string; onClick: () => void; disabled?: boolean; active?: boolean; testId: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl h-14 text-[11px] font-semibold transition-colors disabled:opacity-40",
      active ? "bg-primary text-primary-foreground" : "bg-muted/60 active:bg-muted"
    )}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

/**
 * Phone layout: a simplified editor in one bottom bar — status, photos, duplicate, add, move.
 * Moving is "Move, then tap the new place" (dragging a small icon fights with scrolling on a phone).
 */
export const MobileBottomBar: React.FC = () => {
  const { state: docState, dispatch: docDispatch } = useDocument();
  const { state: uiState, dispatch: uiDispatch } = useUI();
  const { data: user } = useCurrentUser();
  const { handleAddIcon } = useObjectCreation();
  const isTech = user?.role === 'TECH';
  const isPM = user?.role === 'PM';

  const uploadFileMutation = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  const selectedObjectId = uiState.selectedObjectIds[0];
  const selectedObject = docState.objects.find(o => o.id === selectedObjectId);
  const layerLocked = !!docState.layers.find(l => l.id === selectedObject?.layerId)?.locked;
  const canEdit = !isTech && !!selectedObject && !layerLocked && !selectedObject.isFill && selectedObject.type !== 'path';
  const canDelete = !isTech && !!selectedObject && !layerLocked;
  /** Technicians move too — as a change request for the PM. */
  const canMove = !!selectedObject && !layerLocked && !selectedObject.isFill && selectedObject.type !== 'path';
  const field = useFieldActions();
  const name = selectedObject
    ? selectedObject.name || defaultObjectNames(docState.objects, docState.customIcons).get(selectedObject.id) || 'Object'
    : '';

  // Move ends when the object is deselected or another one is selected.
  useEffect(() => { setMoving(false); }, [selectedObjectId]);

  // Move: the next tap on the plan places the object's center there (captured before the canvas sees it).
  useEffect(() => {
    if (!moving || !selectedObject) return;
    const onClick = (e: MouseEvent) => {
      const page = document.querySelector<HTMLElement>('[data-canvas-page]');
      if (!page || !page.contains(e.target as Node)) return;
      e.stopPropagation();
      e.preventDefault();
      const rect = page.getBoundingClientRect();
      const px = (e.clientX - rect.left) / uiState.scale;
      const py = (e.clientY - rect.top) / uiState.scale;
      const x = Math.max(0, Math.min(CANVAS_BASE_WIDTH - selectedObject.width, px - selectedObject.width / 2));
      const y = Math.max(0, Math.min(docState.pdfCanvasHeight - selectedObject.height, py - selectedObject.height / 2));
      if (isTech) field.requestChange(selectedObject.id, { x, y });
      else docDispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObject.id, updates: { x, y } } });
      setMoving(false);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [moving, selectedObject, uiState.scale, docState.pdfCanvasHeight, docDispatch]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedObjectId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadFileMutation.mutateAsync({
          file: await compressImageToFile(file),
          projectId: docState.projectId || undefined
        });

        // Attached on the server right away (it records who added it).
        await field.send([{ type: 'addPhoto', objectId: selectedObjectId, url: result.url }]);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const setStatus = (status: ObjectStatus) => {
    if (!selectedObject) return;
    field.setStatus([selectedObject.id], status);
  };

  const duplicate = () => {
    if (!selectedObject) return;
    docDispatch({ type: 'DUPLICATE_OBJECT', payload: { id: selectedObject.id, newId: uuidv4() } });
  };

  const remove = () => {
    if (!selectedObject || !window.confirm(`Delete ${name}?`)) return;
    docDispatch({ type: 'DELETE_OBJECT', payload: selectedObject.id });
  };

  const addIcon = (type: string) => {
    handleAddIcon(type);
    setIsAddOpen(false);
  };

  const photoCount = selectedObject?.photos?.length || 0;

  return (
    <>
      <div className="shrink-0 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)] relative z-10 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-2" data-testid="mobile-bar">
        {moving && selectedObject ? (
          <div className="flex items-center gap-2 h-14">
            <Move className="h-5 w-5 text-primary shrink-0" />
            <span className="flex-1 text-sm font-medium">Tap the plan where <b>{name}</b> should go</span>
            <Button variant="outline" className="h-11" onClick={() => setMoving(false)} data-testid="mobile-move-cancel">Cancel</Button>
          </div>
        ) : selectedObject ? (
          <>
            {/* Name + details / deselect */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() => isPM && setIsDetailsOpen(true)}
                disabled={!isPM}
              >
                <span className="truncate text-sm font-bold" data-testid="mobile-object-name">{name}</span>
                {isPM && <Info className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive"
                  onClick={remove}
                  aria-label="Delete"
                  data-testid="mobile-delete"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => uiDispatch({ type: 'SELECT_OBJECT', payload: null })} aria-label="Deselect">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Status */}
            {selectedObject.type !== 'text' && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3">
                {STATUSES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    data-testid={`mobile-status-${s.id}`}
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold",
                      selectedObject.status === s.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    {s.short}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1.5">
              <ActionButton
                icon={isUploading ? Loader2 : Camera}
                label="Photo"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                testId="mobile-photo"
              />
              <ActionButton icon={Images} label={`Photos (${photoCount})`} onClick={() => setIsGalleryOpen(true)} testId="mobile-gallery" />
              {canEdit && <ActionButton icon={CopyPlus} label="Copy" onClick={duplicate} testId="mobile-duplicate" />}
              {canMove && <ActionButton icon={Move} label={isTech ? 'Request move' : 'Move'} onClick={() => setMoving(true)} testId="mobile-move" />}
              {!isTech && <ActionButton icon={Plus} label="Add" onClick={() => setIsAddOpen(true)} testId="mobile-add" />}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 h-14">
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox
                id="status-colors-mobile"
                checked={uiState.showStatusColors}
                onCheckedChange={() => uiDispatch({ type: 'TOGGLE_STATUS_COLORS' })}
              />
              <label htmlFor="status-colors-mobile" className="text-xs font-semibold whitespace-nowrap">By status</label>
            </div>
            <span className="flex-1 text-xs text-muted-foreground">Tap an object</span>
            {!isTech && (
              <Button className="h-12 gap-1.5 rounded-full px-5" onClick={() => setIsAddOpen(true)} data-testid="mobile-add">
                <Plus className="h-5 w-5" /> Add
              </Button>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          {...({ capture: 'environment' } as any)}
        />
      </div>

      {/* Add: device icons, placed in the middle of the visible plan */}
      <Drawer open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-6 space-y-3" data-testid="mobile-add-sheet">
            <div className="grid grid-cols-3 gap-2">
              {LV_ICON_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addIcon(type)}
                  data-testid={`mobile-add-${type}`}
                  className={ADD_TILE}
                >
                  <LvIcon type={type} className="h-7 w-7" />
                  {LV_ICONS[type].label}
                </button>
              ))}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shapes</div>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addIcon(type)}
                  data-testid={`mobile-add-${type}`}
                  className={ADD_TILE}
                >
                  <Icon className="h-7 w-7" />
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addIcon(BLINDSPOT_ICON)}
                data-testid="mobile-add-blindspot"
                className={ADD_TILE}
              >
                <BlindspotShape className="h-6 w-9" />
                Camera blindspot
              </button>
              <button
                type="button"
                onClick={() => { uiDispatch({ type: 'SET_TOOL', payload: 'area' }); setIsAddOpen(false); }}
                data-testid="mobile-add-coverage-area"
                className={ADD_TILE}
              >
                <CoverageAreaShape className="h-6 w-9" />
                Coverage area
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {isPM && selectedObject && (
        <Drawer open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{name}</DrawerTitle>
            </DrawerHeader>
            <PMObjectDetailsPanel />
          </DrawerContent>
        </Drawer>
      )}

      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Object Photos</DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {selectedObject && (
              <ObjectPhotoGallery
                objectId={selectedObject.id}
                photos={selectedObject.photos || []}
                photoBy={selectedObject.photoBy}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
