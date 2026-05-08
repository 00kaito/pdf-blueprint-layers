import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRenameProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RenameProjectDialogProps {
  projectId: string | null;
  currentName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenameSuccess?: (newName: string) => void;
}

export const RenameProjectDialog = ({ 
  projectId, 
  currentName, 
  open, 
  onOpenChange,
  onRenameSuccess
}: RenameProjectDialogProps) => {
  const [name, setName] = useState(currentName || "");
  const renameProject = useRenameProject();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(currentName || "");
    }
  }, [open, currentName]);

  const handleRename = async () => {
    if (!projectId || !name.trim()) return;
    try {
      await renameProject.mutateAsync({ id: projectId, name: name.trim() });
      toast({ title: "Project renamed", description: "Project name updated successfully" });
      onRenameSuccess?.(name.trim());
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rename failed", description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rename-name">New Project Name</Label>
            <Input 
              id="rename-name" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter new project name"
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handleRename} 
            disabled={!name.trim() || name.trim() === currentName || renameProject.isPending}
          >
            {renameProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rename"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
