import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useShareProject } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ShareProjectDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareProjectDialog = ({ projectId, open, onOpenChange }: ShareProjectDialogProps) => {
  const [shareUsername, setShareUsername] = useState("");
  const shareProject = useShareProject();
  const { toast } = useToast();

  const handleShare = async () => {
    if (!projectId) return;
    try {
      await shareProject.mutateAsync({ id: projectId, username: shareUsername });
      toast({ title: "Project shared", description: `Shared with ${shareUsername}` });
      setShareUsername("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sharing failed", description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="share-username">Username</Label>
            <Input 
              id="share-username" 
              placeholder="Enter username to share with" 
              value={shareUsername}
              onChange={e => setShareUsername(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
            />
          </div>
          <Button className="w-full" onClick={handleShare} disabled={!shareUsername || shareProject.isPending}>
            {shareProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
