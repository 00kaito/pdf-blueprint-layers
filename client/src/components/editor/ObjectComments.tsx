import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CornerDownRight, Loader2, MessageSquare, Plus, Reply, Send, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuth';
import { useProjectOps } from '@/hooks/useProjectOps';
import { cn } from '@/lib/utils';
import { isManager, normalizeComments, type ObjectComment } from '@shared/tech-ops';

interface ObjectCommentsProps {
  objectId: string;
  comments: ObjectComment[] | unknown;
}

const when = (at: string) => {
  if (!at) return '';
  const d = new Date(at);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** A comment box: write and post (Enter + Ctrl/⌘ posts), or cancel. */
const Composer = ({ placeholder, onPost, onCancel, autoFocus }: {
  placeholder: string; onPost: (text: string) => Promise<boolean>; onCancel?: () => void; autoFocus?: boolean;
}) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await onPost(text.trim());
    setBusy(false);
    if (ok) setText('');
  };
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post(); }}
        placeholder={placeholder}
        className="text-xs min-h-[64px] resize-none"
        autoFocus={autoFocus}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={onCancel}>Cancel</Button>
        )}
        <Button size="sm" className="h-7 text-[10px] gap-1" onClick={post} disabled={!text.trim() || busy}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Post
        </Button>
      </div>
    </div>
  );
};

/**
 * Comment threads of an object: anyone on the project comments (technicians too) and replies; a PM
 * answers a technician here. Authors delete their own comments, PMs any. Saved on the server at once.
 */
export const ObjectComments: React.FC<ObjectCommentsProps> = ({ objectId, comments: raw }) => {
  const { data: user } = useCurrentUser();
  const send = useProjectOps();
  const manager = isManager(user?.role);
  const comments = normalizeComments(raw);
  const [isAdding, setIsAdding] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const threads = comments.filter(c => !c.replyTo);
  const repliesOf = (id: string) => comments.filter(c => c.replyTo === id);
  const canDelete = (c: ObjectComment) => manager || (!!user && c.authorId === user.id);

  const post = async (text: string, replyTo?: string) => {
    const ok = await send([{ type: 'comment', objectId, text, replyTo }]);
    if (ok) { setIsAdding(false); setReplyingTo(null); }
    return ok;
  };
  const remove = (c: ObjectComment) => {
    const replies = repliesOf(c.id).length;
    if (replies && !window.confirm(`Delete this comment and its ${replies} ${replies === 1 ? 'reply' : 'replies'}?`)) return;
    send([{ type: 'deleteComment', objectId, commentId: c.id }]);
  };

  const Item = ({ c, reply }: { c: ObjectComment; reply?: boolean }) => (
    <div className={cn(
      "group relative border rounded-md p-2 text-xs",
      c.authorRole === 'TECH' ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900" : "bg-muted/30 border-border",
      reply && "ml-4",
    )}>
      {(c.authorName || c.at) && (
        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground pr-6">
          {reply && <CornerDownRight className="w-3 h-3" />}
          <span className="font-semibold text-foreground">{c.authorName || 'Unknown'}</span>
          {c.authorRole && <span className="uppercase tracking-wider">{c.authorRole === 'TECH' ? 'Tech' : c.authorRole}</span>}
          {c.at && <span>· {when(c.at)}</span>}
        </div>
      )}
      <p className="whitespace-pre-wrap pr-6">{c.text}</p>
      {canDelete(c) && (
        <button
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
          onClick={() => remove(c)}
          title="Delete comment"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4" data-testid="object-comments">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <MessageSquare className="w-3 h-3" />
          Comments
        </div>
        {!isAdding && (
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setIsAdding(true)} title="Add a comment">
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isAdding && (
        <Composer placeholder="Add a comment..." autoFocus onPost={(t) => post(t)} onCancel={() => setIsAdding(false)} />
      )}

      <div className="space-y-2">
        {threads.length > 0 ? threads.map(c => (
          <div key={c.id} className="space-y-1.5">
            <Item c={c} />
            {repliesOf(c.id).map(r => <Item key={r.id} c={r} reply />)}
            {replyingTo === c.id ? (
              <div className="ml-4">
                <Composer placeholder={`Reply to ${c.authorName || 'comment'}...`} autoFocus onPost={(t) => post(t, c.id)} onCancel={() => setReplyingTo(null)} />
              </div>
            ) : (
              <button
                className="ml-4 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setReplyingTo(c.id)}
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
            )}
          </div>
        )) : !isAdding && (
          <div className="py-4 text-center text-xs text-muted-foreground italic border border-dashed rounded-md">
            No comments yet
          </div>
        )}
      </div>
    </div>
  );
};
