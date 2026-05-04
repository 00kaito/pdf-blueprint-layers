import React from 'react';
import { useDocument, useUI } from '@/lib/editor-context';
import { useObjectCreation } from '@/hooks/useObjectCreation';
import { useCurrentUser } from '@/hooks/useAuth';
import { 
  Camera, 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Hexagon, 
  ArrowRight,
  Type,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MobileAddObjectPanelProps {
  onClose: () => void;
}

export const MobileAddObjectPanel: React.FC<MobileAddObjectPanelProps> = ({ onClose }) => {
  const { state: docState } = useDocument();
  const { state: uiState, dispatch: uiDispatch } = useUI();
  const { handleAddText, handleAddIcon, handleImageUpload } = useObjectCreation();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';

  const handleIconClick = (type: string) => {
    if (isTech) return;
    handleAddIcon(type);
    onClose();
  };

  const handleTextClick = () => {
    if (isTech) return;
    handleAddText();
    onClose();
  };

  const handleLayerChange = (layerId: string) => {
    if (isTech) return;
    uiDispatch({ type: 'SET_ACTIVE_LAYER', payload: layerId });
  };

  if (isTech) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-sm font-medium">Read-only Mode</p>
        <p className="text-xs text-muted-foreground">Technicians cannot add objects or change layers.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Layer</label>
        <Select value={uiState.activeLayerId || ''} onValueChange={handleLayerChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a layer" />
          </SelectTrigger>
          <SelectContent>
            {docState.layers.map((layer) => (
              <SelectItem key={layer.id} value={layer.id}>
                {layer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Object</label>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('camera')}>
            <Camera className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('square')}>
            <Square className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('circle')}>
            <Circle className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('triangle')}>
            <Triangle className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('star')}>
            <Star className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('hexagon')}>
            <Hexagon className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={() => handleIconClick('arrow-right')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="h-11 w-11 p-0" onClick={handleTextClick}>
            <Type className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <Button variant="outline" className="h-11 w-11 p-0">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                handleImageUpload(e);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
