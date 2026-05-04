import React from 'react';
import {useDocument, useUI} from '@/lib/editor-context';
import {v4 as uuidv4} from 'uuid';
import {
    ArrowRight,
    Camera,
    Circle,
    Hash,
    Heart,
    Hexagon,
    Image as ImageIcon,
    MousePointer2,
    Pencil,
    Plus,
    Settings2,
    Square,
    Star,
    Triangle,
    Type,
    X
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Toggle} from '@/components/ui/toggle';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useObjectCreation} from '@/hooks/useObjectCreation';
import {useCurrentUser} from '@/hooks/useAuth';

export const ObjectToolbar = () => {
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { handleAddText, handleAddIcon, handleImageUpload, handleCustomIconUpload, getCenterPosition } = useObjectCreation();

  const handleDragStart = (e: React.DragEvent, type: string, content?: string) => {
      e.dataTransfer.setData('application/editor-object', type);
      if (content) e.dataTransfer.setData('application/editor-content', content);
  };

  return (
    <div className="p-2 border-b border-border bg-card flex flex-wrap gap-2 justify-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle 
              pressed={uiState.tool === 'select'} 
              onPressedChange={() => dispatch({ type: 'SET_TOOL', payload: 'select' })}
              size="sm"
            >
              <MousePointer2 className="w-4 h-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Select</TooltipContent>
        </Tooltip>

        {!isTech && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle 
                  pressed={uiState.tool === 'draw'} 
                  onPressedChange={(p) => dispatch({ type: 'SET_TOOL', payload: p ? 'draw' : 'select' })}
                  size="sm"
                >
                  <Pencil className="w-4 h-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Draw</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <div draggable onDragStart={(e) => handleDragStart(e, 'text')} className="cursor-grab active:cursor-grabbing">
                  <Button variant="ghost" size="icon" onClick={handleAddText} className="h-8 w-8">
                      <Type className="w-4 h-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>Add Text (Drag & Drop)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <label htmlFor="image-upload-sidebar" className="cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" id="image-upload-sidebar" onChange={handleImageUpload} />
                  </label>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Image</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Square className="w-4 h-4" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" side="right" align="start">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Standard Icons</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {['square', 'circle', 'triangle', 'star', 'heart', 'hexagon', 'arrow-right', 'camera'].map(icon => (
                        <div key={icon} draggable onDragStart={(e) => handleDragStart(e, 'icon', icon)} className="cursor-grab">
                          <Button variant="outline" size="icon" onClick={() => handleAddIcon(icon)}>
                            {icon === 'square' && <Square className="w-4 h-4" />}
                            {icon === 'circle' && <Circle className="w-4 h-4" />}
                            {icon === 'triangle' && <Triangle className="w-4 h-4" />}
                            {icon === 'star' && <Star className="w-4 h-4" />}
                            {icon === 'heart' && <Heart className="w-4 h-4" />}
                            {icon === 'hexagon' && <Hexagon className="w-4 h-4" />}
                            {icon === 'arrow-right' && <ArrowRight className="w-4 h-4" />}
                            {icon === 'camera' && <Camera className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-muted-foreground">My Icons</h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <label htmlFor="custom-icon-upload-sidebar" className="cursor-pointer">
                          <Plus className="h-4 w-4" />
                          <input type="file" accept="image/*" multiple className="hidden" id="custom-icon-upload-sidebar" onChange={handleCustomIconUpload} />
                        </label>
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                      {docState.customIcons.map((icon) => (
                        <div key={icon.id} draggable onDragStart={(e) => handleDragStart(e, 'image', icon.url)} className="relative group cursor-grab">
                          <Button variant="outline" size="icon" className="w-full h-10 p-1"
                            onClick={() => {
                              if (!uiState.activeLayerId) return;
                              const size = 50 / uiState.scale;
                              const { x, y } = getCenterPosition(size, size);
                              dispatch({
                                type: 'ADD_OBJECT',
                                payload: { id: uuidv4(), type: 'image', name: '', x, y, width: size, height: size, layerId: uiState.activeLayerId, content: icon.url, rotation: 0 }
                              });
                            }}
                          >
                            <img src={icon.url} alt={icon.name} className="w-full h-full object-contain" />
                          </Button>
                          <button className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_CUSTOM_ICON', payload: icon.id }); }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-0.5" />

            <div className="flex items-center rounded-md border border-input bg-background">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle pressed={docState.autoNumbering.enabled}
                    onPressedChange={(p) => {
                       dispatch({ type: 'SET_AUTO_NUMBERING', payload: { enabled: p } });
                       if (!p && uiState.tool === 'stamp') dispatch({ type: 'SET_TOOL', payload: 'select' });
                    }} size="sm" className="h-8 w-8 rounded-r-none border-r-0">
                    <Hash className="w-4 h-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Auto-Numbering</TooltipContent>
              </Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-6 rounded-l-none px-0 border-l border-input hover:bg-muted">
                     <Settings2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" side="right" align="start">
                  <div className="space-y-4">
                     <h4 className="font-medium leading-none">Auto-Numbering Settings</h4>
                     <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label>Prefix</Label>
                          <Input value={docState.autoNumbering.prefix} onChange={(e) => dispatch({ type: 'SET_AUTO_NUMBERING', payload: { prefix: e.target.value } })} className="col-span-2 h-8" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label>Start #</Label>
                          <Input type="number" value={docState.autoNumbering.counter} onChange={(e) => dispatch({ type: 'SET_AUTO_NUMBERING', payload: { counter: parseInt(e.target.value) || 1 } })} className="col-span-2 h-8" />
                        </div>
                     </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}
      </TooltipProvider>
    </div>
  );
};

