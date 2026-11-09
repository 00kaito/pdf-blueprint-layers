import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AccountSelect, NO_ACCOUNT, type DirectoryUser } from './ZipImport';

type Person = { id: string; username: string };

/**
 * Share dialog part: people an import found no account for. Linking one to an account here gives
 * that account their photos, comments and requests in this project (and, if ticked, access).
 * Hidden when there is nobody to link.
 */
export const ImportedPeople = ({ projectId }: { projectId: string | null }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const people = useQuery<Person[]>({
    queryKey: ['/api/projects', projectId, 'people'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/people`, { credentials: 'include' });
      return res.ok ? res.json() : [];
    },
    enabled: !!projectId,
  });
  const directory = useQuery<DirectoryUser[]>({
    queryKey: ['/api/users/directory'],
    queryFn: async () => {
      const res = await fetch('/api/users/directory', { credentials: 'include' });
      return res.ok ? res.json() : [];
    },
    enabled: !!projectId && (people.data?.length ?? 0) > 0,
  });
  const [choice, setChoice] = useState<Record<string, { userId: string; share: boolean }>>({});
  const [linking, setLinking] = useState<string | null>(null);

  if (!projectId || !people.data?.length) return null;

  const suggested = (p: Person) =>
    directory.data?.find(u => u.username.toLowerCase() === p.username.toLowerCase())?.id ?? NO_ACCOUNT;

  const link = async (p: Person) => {
    const c = choice[p.id] ?? { userId: suggested(p), share: true };
    if (!c.userId) return;
    setLinking(p.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/people/${p.id}/link`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: c.userId, share: c.share }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const account = directory.data?.find(u => u.id === c.userId)?.username;
      toast({ title: `${p.username} → ${account}`, description: c.share ? 'Linked and shared.' : 'Linked.' });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'people'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not link', description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-2 border-t pt-4" data-testid="imported-people">
      <div className="text-sm font-medium">People from the import without an account</div>
      <p className="text-xs text-muted-foreground">
        Link a person to an account here: their photos, comments and requests in this project become that account's.
      </p>
      {people.data.map(p => {
        const c = choice[p.id] ?? { userId: suggested(p), share: true };
        return (
          <div key={p.id} className="flex items-center gap-2" data-testid={`imported-person-${p.username}`}>
            <span className="w-24 shrink-0 truncate text-sm font-medium" title={p.username}>{p.username}</span>
            <div className="min-w-0 flex-1">
              <AccountSelect
                value={c.userId}
                onChange={id => setChoice(s => ({ ...s, [p.id]: { ...c, userId: id } }))}
                directory={directory.data ?? []}
              />
            </div>
            <label className="flex shrink-0 items-center gap-1 text-xs">
              <Checkbox checked={c.share} onCheckedChange={v => setChoice(s => ({ ...s, [p.id]: { ...c, share: v === true } }))} />
              Share
            </label>
            <Button size="sm" variant="outline" disabled={!c.userId || linking === p.id} onClick={() => link(p)}>
              {linking === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            </Button>
          </div>
        );
      })}
    </div>
  );
};
