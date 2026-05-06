import React from 'react';
import {ZoomIn, ZoomOut} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Slider} from '@/components/ui/slider';
import {useUIDispatch} from '@/lib/editor-context';

interface ZoomControlsProps {
  scale: number;
}

export const ZoomControls = ({ scale }: ZoomControlsProps) => {
  const uiDispatch = useUIDispatch();

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => uiDispatch({ type: 'SET_SCALE', payload: Math.max(0.1, scale - 0.25) })}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Slider 
        value={[scale]} 
        min={0.1} 
        max={10} 
        step={0.25} 
        onValueChange={([v]) => uiDispatch({ type: 'SET_SCALE', payload: v })} 
        className="w-24" 
      />
      <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => uiDispatch({ type: 'SET_SCALE', payload: Math.min(10, scale + 0.25) })}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
    </div>
  );
};
