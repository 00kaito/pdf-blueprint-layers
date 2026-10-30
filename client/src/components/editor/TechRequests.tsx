import React, {useEffect, useMemo, useState} from 'react';
import {Check, ClipboardCheck, Loader2, MessageSquare, Send, Undo2, X} from 'lucide-react';
import {useDocument, useUI, useUIDispatch} from '@/lib/editor-context';
import type {EditorObject} from '@/lib/types';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {useCurrentUser} from '@/hooks/useAuth';
import {useProjectOps} from '@/hooks/useProjectOps';
import {useFieldActions} from '@/hooks/useFieldActions';
import {useToast} from '@/hooks/use-toast';
import {getRacks, rackLabel} from '@/core/cable-routing';
import {feetPerUnit} from '@/core/measure';
import {defaultObjectNames} from '@/core/lv-icons';
import {REQUEST_COLOR} from './Canvas/ObjectRenderer';
import {cn} from '@/lib/utils';
import {describeChanges, effectiveChanges, hasChanges, isManager, normalizeComments, type RequestChanges, type TechOp} from '@shared/tech-ops';

const when = (at: string) => new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "Move 4.2 ft", "Rename "A" → "B"", "IDF → IDF 2" for the plan's scale and racks. */
const useDescribe = () => {
  const { state: docState } = useDocument();
  const racks = useMemo(() => getRacks(docState.objects), [docState.objects]);
  const fpu = feetPerUnit(docState.measureCalibration);
  return (changes: RequestChanges, from: { x: number; y: number; name?: string }) =>
    describeChanges(changes, from, { feetPerUnit: fpu, rackName: (id) => (id ? rackLabel(racks, id) : 'Nearest') });
};

/** Threads whose latest message is a technician's: a PM still owes an answer. */
export const awaitsReply = (o: EditorObject) => {
  const comments = normalizeComments(o.comments);
  return comments.filter(c => !c.replyTo).some(t => {
    const last = [t, ...comments.filter(c => c.replyTo === t.id)].pop()!;
    return last.authorRole === 'TECH';
  });
};

/**
 * "Send as a change request?" after a technician moved / renamed / re-assigned something. The
 * object stays where it was; the request (with an optional note) goes to the PM.
 */
export const TechRequestDialog = () => {
  const { state: uiState } = useUI();
  const uiDispatch = useUIDispatch();
  const { state: docState } = useDocument();
  const send = useProjectOps();
  const { toast } = useToast();
  const describe = useDescribe();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const draft = uiState.techRequestDraft;
  const obj = draft ? docState.objects.find(o => o.id === draft.objectId) : undefined;
  useEffect(() => { if (!draft) setNote(''); }, [draft]);

  const close = () => uiDispatch({ type: 'SET_TECH_REQUEST_DRAFT', payload: null });
  if (!draft || !obj) return null;
  // Together with what is already pending from this technician.
  const pending = obj.techRequest?.changes ?? {};
  const changes = effectiveChanges(obj, { ...pending, ...draft.changes });
  const lines = describe(changes, obj.techRequest?.from ?? obj);
  const name = obj.name || defaultObjectNames(docState.objects, docState.customIcons).get(obj.id);

  const submit = async () => {
    setBusy(true);
    const ok = await send([{ type: 'request', objectId: obj.id, changes: draft.changes, note: note.trim() || undefined }]);
    setBusy(false);
    if (ok) {
      toast({ title: 'Request sent', description: 'The PM will see it and approve or reject it.' });
      close();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[420px]" data-testid="tech-request-dialog">
        <DialogHeader>
          <DialogTitle>Send a change request?</DialogTitle>
          <DialogDescription>
            You can't change the plan directly. The PM gets this request for <b>{name}</b> and approves or rejects it;
            until then the plan stays as it is.
          </DialogDescription>
        </DialogHeader>
        {hasChanges(changes) ? (
          <ul className="text-sm space-y-1">
            {lines.map(l => (
              <li key={l} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: REQUEST_COLOR }} />{l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">That is how it already is — nothing to request.</p>
        )}
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why? (optional) — e.g. the wall is not where the plan shows it"
          className="text-sm min-h-[70px]"
        />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>Discard</Button>
          <Button onClick={submit} disabled={busy || !hasChanges(changes)} className="gap-1.5" data-testid="tech-request-send">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Approve / reject (with a reason) one request, or cancel it (its technician). */
const RequestActions = ({ obj, compact = false }: { obj: EditorObject; compact?: boolean }) => {
  const { data: user } = useCurrentUser();
  const send = useProjectOps();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const req = obj.techRequest;
  if (!req) return null;
  const run = async (ops: TechOp[]) => { setBusy(true); await send(ops); setBusy(false); };

  if (!isManager(user?.role)) {
    return req.byId === user?.id ? (
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={busy}
        onClick={() => run([{ type: 'cancelRequest', objectId: obj.id }])}>
        <Undo2 className="w-3 h-3" /> Withdraw
      </Button>
    ) : null;
  }
  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, sent to the technician)"
          className="h-7 text-xs flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') run([{ type: 'resolve', objectId: obj.id, approve: false, reason }]); if (e.key === 'Escape') setRejecting(false); }} />
        <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={busy}
          onClick={() => run([{ type: 'resolve', objectId: obj.id, approve: false, reason }])}>Reject</Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRejecting(false)}><X className="w-3 h-3" /></Button>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-1.5", !compact && "w-full")}>
      <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" disabled={busy}
        onClick={() => run([{ type: 'resolve', objectId: obj.id, approve: true }])} data-testid="request-approve">
        <Check className="w-3 h-3" /> Approve
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={busy} onClick={() => setRejecting(true)} data-testid="request-reject">
        <X className="w-3 h-3" /> Reject
      </Button>
    </div>
  );
};

/** The selected object's pending request (with the decision buttons), or the decision on the last one. */
export const TechRequestSection = ({ obj }: { obj: EditorObject }) => {
  const describe = useDescribe();
  const { data: user } = useCurrentUser();
  const req = obj.techRequest;
  const result = obj.requestResult;
  if (req) {
    return (
      <div className="rounded-md border p-2.5 space-y-2 text-xs" style={{ borderColor: REQUEST_COLOR, backgroundColor: `${REQUEST_COLOR}10` }} data-testid="tech-request-section">
        <div className="font-semibold" style={{ color: REQUEST_COLOR }}>Change request · {req.byName} · {when(req.at)}</div>
        <ul className="space-y-0.5">{describe(req.changes, req.from).map(l => <li key={l}>• {l}</li>)}</ul>
        {req.note && <p className="italic text-muted-foreground">“{req.note}”</p>}
        <RequestActions obj={obj} />
      </div>
    );
  }
  // The technician sees what became of their last request.
  if (result && !isManager(user?.role)) {
    return (
      <div className={cn("rounded-md border p-2.5 space-y-1 text-xs", result.approved ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-red-300 bg-red-50 dark:bg-red-950/20")}>
        <div className={cn("font-semibold", result.approved ? "text-green-700" : "text-red-700")}>
          Your request was {result.approved ? 'approved' : 'rejected'} by {result.byName} · {when(result.at)}
        </div>
        {result.reason && <p>{result.reason}</p>}
      </div>
    );
  }
  return null;
};

/**
 * Label field of a technician: they cannot rename, so a changed name becomes a rename request
 * (on Enter / leaving the field). Shows the requested name while it waits.
 */
export const TechLabelInput = ({ obj, className }: { obj: EditorObject; className?: string }) => {
  const { requestChange } = useFieldActions();
  const current = obj.techRequest?.changes.name ?? obj.name ?? '';
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current, obj.id]);
  const commit = () => {
    if (draft !== current) requestChange(obj.id, { name: draft });
  };
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(current); }}
      placeholder="No label"
      className={className}
      title="Changing the label sends a rename request to the PM"
      data-testid="tech-label-input"
    />
  );
};

/**
 * Toolbar button with what waits for someone: for a PM technicians' requests (approve / reject,
 * one by one or all at once) and comments with no answer yet; for a technician their own pending requests.
 */
export const RequestsButton = () => {
  const { state: docState } = useDocument();
  const uiDispatch = useUIDispatch();
  const { data: user } = useCurrentUser();
  const send = useProjectOps();
  const describe = useDescribe();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const manager = isManager(user?.role);
  const names = useMemo(() => defaultObjectNames(docState.objects, docState.customIcons), [docState.objects, docState.customIcons]);

  const requests = docState.objects.filter(o => o.techRequest && (manager || o.techRequest.byId === user?.id));
  const unanswered = manager ? docState.objects.filter(awaitsReply) : [];
  const count = requests.length + unanswered.length;
  if (!docState.projectId || !user) return null;

  const show = (id: string) => {
    uiDispatch({ type: 'SET_SELECTION', payload: [id] });
    uiDispatch({ type: 'OPEN_OBJECT_DETAILS' });
    setOpen(false);
  };
  const resolveAll = async (approve: boolean) => {
    const reason = approve ? undefined : window.prompt(`Reject all ${requests.length} requests? Reason (optional, sent to the technicians):`, '');
    if (!approve && reason === null) return;
    setBusy(true);
    await send(requests.map(o => ({ type: 'resolve' as const, objectId: o.id, approve, reason: reason || undefined })));
    setBusy(false);
  };

  return (
    <>
      <Button
        variant={count ? 'default' : 'ghost'} size="sm"
        className={cn("h-8 gap-1.5 text-xs", count > 0 && "text-white")}
        style={count ? { backgroundColor: REQUEST_COLOR } : undefined}
        onClick={() => setOpen(true)}
        title={manager ? 'Change requests and comments from technicians' : 'Your change requests'}
        data-testid="requests-button"
      >
        <ClipboardCheck className="w-4 h-4" />
        {manager ? 'Requests' : 'My requests'}
        {count > 0 && <span className="rounded-full bg-white/25 px-1.5 font-bold">{count}</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="requests-panel">
          <DialogHeader>
            <DialogTitle>{manager ? 'Requests from technicians' : 'My change requests'}</DialogTitle>
            <DialogDescription>
              {manager
                ? 'Approving applies the change to the plan; rejecting leaves the plan as it is (a reason goes to the technician).'
                : 'Waiting for the PM. Withdraw a request to drop it.'}
            </DialogDescription>
          </DialogHeader>

          {manager && requests.length > 1 && (
            <div className="flex gap-2">
              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => resolveAll(true)} data-testid="approve-all">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve all ({requests.length})
              </Button>
              <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => resolveAll(false)} data-testid="reject-all">
                <X className="w-3.5 h-3.5" /> Reject all
              </Button>
            </div>
          )}

          {requests.length === 0 && unanswered.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing waiting.</p>
          )}

          <div className="space-y-2">
            {requests.map(o => (
              <div key={o.id} className="rounded-md border p-2.5 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <button className="font-semibold hover:underline" onClick={() => show(o.id)}>{o.name || names.get(o.id)}</button>
                  <span className="text-muted-foreground">· {o.techRequest!.byName} · {when(o.techRequest!.at)}</span>
                </div>
                <div>{describe(o.techRequest!.changes, o.techRequest!.from).join(' · ')}</div>
                {o.techRequest!.note && <p className="italic text-muted-foreground">“{o.techRequest!.note}”</p>}
                <RequestActions obj={o} compact />
              </div>
            ))}
          </div>

          {unanswered.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comments waiting for an answer
              </h4>
              {unanswered.map(o => {
                const last = normalizeComments(o.comments).filter(c => c.authorRole === 'TECH').pop();
                return (
                  <button key={o.id} className="w-full text-left rounded-md border p-2 text-xs hover:bg-muted/40" onClick={() => show(o.id)}>
                    <span className="font-semibold">{o.name || names.get(o.id)}</span>
                    {last && <span className="text-muted-foreground"> · {last.authorName}: “{last.text.slice(0, 80)}{last.text.length > 80 ? '…' : ''}”</span>}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
