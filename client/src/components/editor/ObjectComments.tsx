import React, { useState } from 'react';
import { useDocument } from '@/lib/editor-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ObjectCommentsProps {
  objectId: string;
  comments: string[];
}

export const ObjectComments: React.FC<ObjectCommentsProps> = ({ objectId, comments }) => {
  const { dispatch } = useDocument();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddComment = () => {
    if (!newComment.trim() || isTech) return;
    
    const updatedComments = [...comments, newComment.trim()];
    dispatch({
      type: 'UPDATE_OBJECT',
      payload: { id: objectId, updates: { comments: updatedComments } }
    });
    setNewComment('');
    setIsAdding(false);
  };

  const handleDeleteComment = (index: number) => {
    if (isTech) return;
    const updatedComments = comments.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_OBJECT',
      payload: { id: objectId, updates: { comments: updatedComments } }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <MessageSquare className="w-3 h-3" />
          Comments
        </div>
        {!isTech && !isAdding && (
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="text-xs min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px]" 
              onClick={() => {
                setIsAdding(false);
                setNewComment('');
              }}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              className="h-7 text-[10px] gap-1" 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Send className="w-3 h-3" />
              Post
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {comments.length > 0 ? (
          comments.map((comment, index) => (
            <div 
              key={index} 
              className="group relative bg-muted/30 border border-border rounded-md p-2 text-xs"
            >
              <p className="whitespace-pre-wrap pr-6">{comment}</p>
              {!isTech && (
                <button
                  className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteComment(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        ) : !isAdding && (
          <div className="py-4 text-center text-xs text-muted-foreground italic border border-dashed rounded-md">
            No comments yet
          </div>
        )}
      </div>
    </div>
  );
};
