import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import JSZip from 'jszip';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** What the server answers after an import (see server/backup.ts ImportReport). */
export type ImportReport = {
  imported: string[]; projectIds: string[]; skipped: string[]; copied: string[];
  matchedUsers: string[]; unknownUsers: string[]; sharedWith: string[]; sameServer: boolean;
  icons: number; missingFiles: number;
};

type Person = { id: string; username: string };
type Manifest = {
  serverId?: string;
  users?: Person[];
  projects?: { name: string; ownerId: string; sharedWith: string[] }[];
};
export type DirectoryUser = { id: string; username: string; role: string };
type PeopleMapping = Record<string, { userId: string | null; share: boolean }>;

type Pending = {
  people: Person[];
  /** People who had (any of) the projects in the ZIP: owner or shared. */
  hadAccess: Set<string>;
  directory: DirectoryUser[];
  projectNames: string[];
  resolve: (mapping: PeopleMapping | null) => void;
};

// One pending "who is who" question at a time, answered by <ZipImportHost /> (rendered once in the app).
let pending: Pending | null = null;
const listeners = new Set<() => void>();
const setPending = (p: Pending | null) => { pending = p; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

const readManifest = async (file: File): Promise<Manifest | null> => {
  try {
    const zip = await JSZip.loadAsync(file);
    const entry = zip.file('backup.json');
    return entry ? JSON.parse(await entry.async('string')) as Manifest : null;
  } catch {
    return null; // not readable here — the server says what is wrong with it
  }
};

const getJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/**
 * Imports a project / backup ZIP through `endpoint`. From another server, first asks who is who
 * (an account here for each person, and who gets the project shared); from this server, or an
 * older ZIP without people, it goes straight in. Resolves null when the dialog is cancelled.
 */
export const importZip = async (
  file: File, endpoint: string,
  /** Called once the questions are answered and the upload starts (e.g. to show a busy overlay). */
  onUpload?: () => void,
): Promise<ImportReport | null> => {
  const manifest = await readManifest(file);
  let people: PeopleMapping | undefined;
  const persons = manifest?.users ?? [];
  if (manifest && persons.length > 0) {
    const { serverId } = await getJson<{ serverId: string }>('/api/server-info');
    if (!manifest.serverId || manifest.serverId !== serverId) {
      const directory = await getJson<DirectoryUser[]>('/api/users/directory');
      const hadAccess = new Set((manifest.projects ?? []).flatMap(p => [p.ownerId, ...p.sharedWith]));
      const answer = await new Promise<PeopleMapping | null>(resolve =>
        setPending({ people: persons, hadAccess, directory, projectNames: (manifest.projects ?? []).map(p => p.name), resolve }));
      if (!answer) return null;
      people = answer;
    }
  }
  onUpload?.();
  const body = new FormData();
  if (people) body.append('people', JSON.stringify(people));
  body.append('file', file);
  const res = await fetch(endpoint, { method: 'POST', body, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data as ImportReport;
};

/** Short summary of an import for a toast / report. */
export const describeImport = (r: ImportReport) => [
  r.copied.length ? 'already on this server — imported as a copy' : '',
  r.matchedUsers.length ? `linked: ${r.matchedUsers.join(', ')}` : '',
  r.sharedWith.length ? `shared with: ${r.sharedWith.join(', ')}` : '',
  r.unknownUsers.length ? `without an account (link them later in Share): ${r.unknownUsers.join(', ')}` : '',
  r.missingFiles ? `${r.missingFiles} file(s) missing in the ZIP` : '',
].filter(Boolean).join('; ');

export const NO_ACCOUNT = '';

/** Account picker: "no account" or one of this server's accounts. */
export const AccountSelect = ({ value, onChange, directory, testId }: {
  value: string; onChange: (id: string) => void; directory: DirectoryUser[]; testId?: string;
}) => (
  <select
    className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm"
    value={value}
    onChange={e => onChange(e.target.value)}
    data-testid={testId}
  >
    <option value={NO_ACCOUNT}>— no account (keep as imported)</option>
    {directory.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
  </select>
);

/** The "who is who" dialog of `importZip`. Render once, high in the tree. */
export const ZipImportHost = () => {
  const current = useSyncExternalStore(subscribe, () => pending);
  const [choices, setChoices] = useState<PeopleMapping>({});

  // Start: the account with the same username where there is one (to confirm), never shared unless ticked.
  useEffect(() => {
    if (!current) return;
    const byName = new Map(current.directory.map(u => [u.username.toLowerCase(), u.id]));
    setChoices(Object.fromEntries(current.people.map(p => [p.id, { userId: byName.get(p.username.toLowerCase()) ?? null, share: false }])));
  }, [current]);

  const people = useMemo(() => current
    ? [...current.people].sort((a, b) => Number(current.hadAccess.has(b.id)) - Number(current.hadAccess.has(a.id)) || a.username.localeCompare(b.username))
    : [], [current]);

  const finish = (mapping: PeopleMapping | null) => {
    current?.resolve(mapping);
    setPending(null);
  };
  const set = (id: string, patch: Partial<PeopleMapping[string]>) =>
    setChoices(c => {
      const next = { ...c[id], ...patch };
      if (!next.userId) next.share = false;
      return { ...c, [id]: next };
    });

  return (
    <Dialog open={!!current} onOpenChange={open => !open && finish(null)}>
      <DialogContent className="max-w-2xl" data-testid="import-people-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Who is who?</DialogTitle>
          <DialogDescription>
            {current?.projectNames.length === 1 ? `"${current.projectNames[0]}"` : `${current?.projectNames.length ?? 0} projects`} come
            from another server. Pick the account here for each person — their photos, comments and requests become that
            account's. Accounts with the same name are suggested; check them. You own the imported project; tick
            "Share" for the people who should open it. No accounts are created.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">In the ZIP</th>
                <th className="p-2 font-medium">Account here</th>
                <th className="p-2 font-medium text-center">Share</th>
              </tr>
            </thead>
            <tbody>
              {people.map(p => {
                const choice = choices[p.id] ?? { userId: null, share: false };
                return (
                  <tr key={p.id} className="border-t" data-testid={`import-person-${p.username}`}>
                    <td className="p-2 align-middle">
                      <div className="font-medium">{p.username}</div>
                      {current?.hadAccess.has(p.id) && <div className="text-[10px] text-muted-foreground">had access to the project</div>}
                    </td>
                    <td className="p-2 align-middle">
                      <AccountSelect
                        value={choice.userId ?? NO_ACCOUNT}
                        onChange={id => set(p.id, { userId: id || null })}
                        directory={current?.directory ?? []}
                        testId={`import-account-${p.username}`}
                      />
                    </td>
                    <td className="p-2 text-center align-middle">
                      <Checkbox
                        checked={choice.share}
                        disabled={!choice.userId}
                        onCheckedChange={v => set(p.id, { share: v === true })}
                        aria-label={`Share with ${p.username}`}
                        data-testid={`import-share-${p.username}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => finish(null)}>Cancel</Button>
          <Button onClick={() => finish(choices)} data-testid="import-people-confirm">Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
