import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type ImportReport = { imported: string[]; skipped: string[]; createdUsers: string[]; icons: number; missingFiles: number };

const listed = (names: string[]) => names.length > 8 ? `${names.slice(0, 8).join(', ')} and ${names.length - 8} more` : names.join(', ');

/**
 * Admin, project list: one ZIP with every project on the server (plans, PDFs, photos, icon library,
 * owners and shares) and its import — restores what is missing, skips projects that already exist.
 */
export const AdminBackup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/backup', { method: 'POST', body, credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setReport(data as ImportReport);
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/icons'] });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Import failed', description: err instanceof Error ? err.message : String(err) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      {/* A plain link: the browser downloads the (possibly large) ZIP straight from the server. */}
      <Button variant="outline" asChild>
        <a href="/api/admin/backup" download data-testid="backup-export">
          <Download className="h-4 w-4 mr-2" />
          Export all projects
        </a>
      </Button>
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={importing} data-testid="backup-import">
        {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArchiveRestore className="h-4 w-4 mr-2" />}
        {importing ? 'Importing…' : 'Import all projects'}
      </Button>
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={onImport} />

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup imported</DialogTitle>
          </DialogHeader>
          {report && (
            <div className="space-y-3 text-sm">
              <p><b>{report.imported.length}</b> project{report.imported.length === 1 ? '' : 's'} imported{report.imported.length ? `: ${listed(report.imported)}` : ''}.</p>
              {report.skipped.length > 0 && (
                <p className="text-muted-foreground">{report.skipped.length} already here, skipped (not overwritten): {listed(report.skipped)}.</p>
              )}
              {report.icons > 0 && <p className="text-muted-foreground">{report.icons} library icon{report.icons === 1 ? '' : 's'} added or matched.</p>}
              {report.createdUsers.length > 0 && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  New accounts created (with a random password — set one in User Management): {listed(report.createdUsers)}.
                </p>
              )}
              {report.missingFiles > 0 && (
                <p className="text-destructive">{report.missingFiles} file{report.missingFiles === 1 ? ' was' : 's were'} missing in the ZIP.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setReport(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
