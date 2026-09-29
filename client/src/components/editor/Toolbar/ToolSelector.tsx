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
    PaintBucket,
    Pencil,
    Plus,
    Crosshair,
    MoveHorizontal,
    Ruler,
    Settings2,
    Square,
    Star,
    Tablet,
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
import {Slider} from "@/components/ui/slider";
import {useObjectCreation} from '@/hooks/useObjectCreation';
import {FILL_LAYER_NAME} from '@/lib/editor-context';
import {useToast} from '@/hooks/use-toast';
import {formatFeet} from '@/core/measure';

const FILL_PRESETS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#14b8a6', '#6b7280'];
const DRAW_PRESETS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#6b7280'];

/** Brush size range, in unscaled canvas units (same units as EditorObject.strokeWidth). */
const MIN_BRUSH_SIZE = 0.5;
const MAX_BRUSH_SIZE = 20;
const BRUSH_SIZE_STEP = 0.5;

interface ToolSelectorProps {
  isTech: boolean;
}

export const ToolSelector = ({ isTech }: ToolSelectorProps) => {
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { handleAddText, handleAddIcon, handleImageUpload, handleCustomIconUpload, getCenterPosition } = useObjectCreation();
  const { toast } = useToast();
  const calibration = docState.measureCalibration;

  const selectMeasure = (pressed: boolean) => {
    if (pressed && !calibration) {
      // The tape needs a scale: start with the calibration probe.
      dispatch({ type: 'SET_TOOL', payload: 'calibrate' });
      toast({ title: 'Set the scale first', description: 'Draw a line over a known dimension, then enter its length in feet.' });
      return;
    }
    dispatch({ type: 'SET_TOOL', payload: pressed ? 'measure' : 'select' });
  };

  const handleDragStart = (e: React.DragEvent, type: string, content?: string) => {
      e.dataTransfer.setData('application/editor-object', type);
      if (content) e.dataTransfer.setData('application/editor-content', content);
  };

  return (
    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle 
              pressed={uiState.tool === 'select'} 
              onPressedChange={() => dispatch({ type: 'SET_TOOL', payload: 'select' })}
              size="sm"
              className="h-8 w-8"
            >
              <MousePointer2 className="w-4 h-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Select</TooltipContent>
        </Tooltip>

        {!isTech && (
          <>
            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle 
                    pressed={uiState.tool === 'draw'} 
                    onPressedChange={(p) => dispatch({ type: 'SET_TOOL', payload: p ? 'draw' : 'select' })}
                    size="sm"
                    className="h-8 w-8 rounded-none border-none relative"
                    data-testid="tool-draw"
                  >
                    <Pencil className="w-4 h-4" />
                    <span
                      className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full"
                      style={{ backgroundColor: uiState.drawColor }}
                    />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Draw (hold Shift for a straight line)</TooltipContent>
              </Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-6 rounded-none px-0 border-l border-input hover:bg-muted" data-testid="draw-settings">
                    <Settings2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60" side="bottom" align="center">
                  <div className="space-y-3">
                    <h4 className="font-medium leading-none">Brush</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={uiState.drawColor}
                        onChange={(e) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawColor: e.target.value } })}
                        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
                        data-testid="draw-color"
                      />
                      <div className="flex flex-wrap gap-1">
                        {DRAW_PRESETS.map(c => (
                          <button
                            key={c}
                            type="button"
                            className={`w-5 h-5 rounded border ${uiState.drawColor === c ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawColor: c } })}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Brush size</Label>
                        <span className="text-[10px] font-mono bg-muted px-1 rounded">{uiState.drawStrokeWidth}</span>
                      </div>
                      <Slider
                        value={[uiState.drawStrokeWidth]}
                        min={MIN_BRUSH_SIZE}
                        max={MAX_BRUSH_SIZE}
                        step={BRUSH_SIZE_STEP}
                        onValueChange={([v]) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawStrokeWidth: v } })}
                        data-testid="draw-size"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={uiState.ipadMode}
                  onPressedChange={(p) => dispatch({ type: 'SET_IPAD_MODE', payload: p })}
                  size="sm"
                  className="h-8 w-8"
                  data-testid="ipad-mode"
                >
                  <Tablet className="w-4 h-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                iPad mode {uiState.ipadMode ? 'on' : 'off'}: {uiState.ipadMode
                  ? 'only the pencil draws, fingers scroll and zoom'
                  : 'fingers draw too'}
              </TooltipContent>
            </Tooltip>

            {uiState.tool === 'draw' && (
              // Quick settings shown while drawing, like the bucket's inline settings.
              <div className="flex items-center gap-2 px-2 h-8 rounded-md border border-input bg-background" data-testid="draw-inline-settings">
                <input
                  type="color"
                  value={uiState.drawColor}
                  onChange={(e) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawColor: e.target.value } })}
                  className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                  title="Brush colour"
                />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Size</span>
                <Slider
                  value={[uiState.drawStrokeWidth]}
                  min={MIN_BRUSH_SIZE}
                  max={MAX_BRUSH_SIZE}
                  step={BRUSH_SIZE_STEP}
                  onValueChange={([v]) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawStrokeWidth: v } })}
                  className="w-24"
                  data-testid="draw-size-inline"
                />
                <Toggle
                  pressed={uiState.drawStraight}
                  onPressedChange={(p) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawStraight: p } })}
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Straight horizontal / vertical lines (same as holding Shift)"
                  data-testid="draw-straight"
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                </Toggle>
                <span className="w-6 flex items-center justify-center" title={`${uiState.drawStrokeWidth}`}>
                  <span
                    className="rounded-full"
                    style={{
                      backgroundColor: uiState.drawColor,
                      width: Math.max(2, Math.min(20, uiState.drawStrokeWidth * 1.5)),
                      height: Math.max(2, Math.min(20, uiState.drawStrokeWidth * 1.5)),
                    }}
                  />
                </span>
              </div>
            )}

            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={uiState.tool === 'fill'}
                    onPressedChange={(p) => dispatch({ type: 'SET_TOOL', payload: p ? 'fill' : 'select' })}
                    size="sm"
                    className="h-8 w-8 rounded-none border-none relative"
                    data-testid="tool-fill"
                  >
                    <PaintBucket className="w-4 h-4" />
                    <span
                      className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full"
                      style={{ backgroundColor: uiState.fillColor, opacity: Math.max(uiState.fillOpacity, 0.3) }}
                    />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Fill area with colour (goes to layer "{FILL_LAYER_NAME}")</TooltipContent>
              </Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-6 rounded-none px-0 border-l border-input hover:bg-muted" data-testid="fill-settings">
                    <Settings2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60" side="bottom" align="center">
                  <div className="space-y-3">
                    <h4 className="font-medium leading-none">Fill</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={uiState.fillColor}
                        onChange={(e) => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillColor: e.target.value } })}
                        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
                        data-testid="fill-color"
                      />
                      <div className="flex flex-wrap gap-1">
                        {FILL_PRESETS.map(c => (
                          <button
                            key={c}
                            type="button"
                            className={`w-5 h-5 rounded border ${uiState.fillColor === c ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillColor: c } })}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Opacity</Label>
                        <span className="text-[10px] font-mono bg-muted px-1 rounded">{Math.round(uiState.fillOpacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[uiState.fillOpacity]}
                        min={0.05}
                        max={1}
                        step={0.05}
                        onValueChange={([v]) => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillOpacity: v } })}
                        data-testid="fill-opacity"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Click inside an area enclosed by lines. Clicking an already filled area again replaces its colour.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {uiState.tool === 'fill' && (
              // Quick settings shown while the bucket is active, so opacity can be tuned without opening the popover.
              <div className="flex items-center gap-2 px-2 h-8 rounded-md border border-input bg-background" data-testid="fill-inline-settings">
                <input
                  type="color"
                  value={uiState.fillColor}
                  onChange={(e) => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillColor: e.target.value } })}
                  className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                  title="Fill colour"
                />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Opacity</span>
                <Slider
                  value={[uiState.fillOpacity]}
                  min={0.05}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => dispatch({ type: 'SET_FILL_SETTINGS', payload: { fillOpacity: v } })}
                  className="w-24"
                  data-testid="fill-opacity-inline"
                />
                <span className="text-[10px] font-mono w-8 text-right">{Math.round(uiState.fillOpacity * 100)}%</span>
              </div>
            )}

            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={uiState.tool === 'calibrate'}
                    onPressedChange={(p) => dispatch({ type: 'SET_TOOL', payload: p ? 'calibrate' : 'select' })}
                    size="sm"
                    className="h-8 w-8 rounded-none border-none"
                    data-testid="tool-calibrate"
                  >
                    <Crosshair className="w-4 h-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Scale probe: draw a line over a known dimension and enter its length in feet</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={uiState.tool === 'measure'}
                    onPressedChange={selectMeasure}
                    size="sm"
                    className="h-8 w-8 rounded-none border-none border-l border-input"
                    data-testid="tool-measure"
                  >
                    <Ruler className="w-4 h-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Measuring tape {calibration ? '(hold Shift for a straight line)' : '(set the scale with the probe first)'}</TooltipContent>
              </Tooltip>
            </div>

            {(uiState.tool === 'measure' || uiState.tool === 'calibrate') && (
              <div className="flex items-center gap-2 px-2 h-8 rounded-md border border-input bg-background text-xs whitespace-nowrap" data-testid="measure-inline-settings">
                {calibration ? (
                  <span className="text-muted-foreground">
                    Scale ref: <span className="font-mono font-medium text-foreground">{formatFeet(calibration.feet)}</span>
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    {uiState.tool === 'calibrate' ? 'Draw a line over a known dimension' : 'No scale set'}
                  </span>
                )}
                <Toggle
                  pressed={uiState.drawStraight}
                  onPressedChange={(p) => dispatch({ type: 'SET_DRAW_SETTINGS', payload: { drawStraight: p } })}
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Straight horizontal / vertical lines (same as holding Shift)"
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                </Toggle>
                {calibration && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => dispatch({ type: 'SET_MEASURE_CALIBRATION', payload: null })}
                    title="Remove the measuring scale"
                    data-testid="measure-clear-scale"
                  >
                    Clear scale
                  </Button>
                )}
              </div>
            )}

            <Separator orientation="vertical" className="h-6 mx-1" />

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
                  <label htmlFor="image-upload-toolbar" className="cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" id="image-upload-toolbar" onChange={handleImageUpload} />
                  </label>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Image</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Square className="w-4 h-4" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" side="bottom" align="center">
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
                        <label htmlFor="custom-icon-upload-toolbar" className="cursor-pointer">
                          <Plus className="h-4 w-4" />
                          <input type="file" accept="image/*" multiple className="hidden" id="custom-icon-upload-toolbar" onChange={handleCustomIconUpload} />
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
                          <button className="absolute -top-1 -right-1 hidden group-hover:flex [@media(hover:none)]:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center"
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

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle pressed={docState.autoNumbering.enabled}
                    onPressedChange={(p) => {
                       dispatch({ type: 'SET_AUTO_NUMBERING', payload: { enabled: p } });
                       if (!p && uiState.tool === 'stamp') dispatch({ type: 'SET_TOOL', payload: 'select' });
                    }} size="sm" className="h-8 w-8 rounded-none border-none">
                    <Hash className="w-4 h-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Auto-Numbering</TooltipContent>
              </Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-6 rounded-none px-0 border-l border-input hover:bg-muted">
                     <Settings2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" side="bottom" align="center">
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
