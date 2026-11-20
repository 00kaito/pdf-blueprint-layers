import React, {useEffect, useState} from 'react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {TOOL_SHORTCUTS} from '@/lib/tool-shortcuts';

/** Opens the dialog from anywhere (e.g. the main menu): `window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))`. */
export const OPEN_SHORTCUTS_EVENT = 'editor:open-shortcuts';

const GROUPS: { title: string; rows: [keys: string, what: string][] }[] = [
  {
    title: 'Tools',
    rows: [
      ...TOOL_SHORTCUTS.map((s): [string, string] => [s.key.toUpperCase(), s.label]),
      ['Esc', 'Ends what is in progress; again: back to Select (in Select: deselect)'],
    ],
  },
  {
    title: 'Selected objects',
    rows: [
      ['Enter / F2', 'Edit the label'],
      ['← ↑ → ↓', 'Move (Shift = further)'],
      ['Ctrl + arrow', 'Rotate 45° (→ ↑ clockwise, ← ↓ back)'],
      ['+ / −', 'Resize by 10%'],
      ['Delete / Backspace', 'Delete (also a selected cable route or jumper)'],
      ['Ctrl + C / Ctrl + V', 'Copy / paste at the pointer'],
      ['Ctrl + Shift + V', 'Paste with the next number'],
      ['Ctrl + click', 'Add to / remove from the selection'],
    ],
  },
  {
    title: 'Dragging an object',
    rows: [
      ['Shift', 'Move in 0.5 ft steps'],
      ['Ctrl / Alt', 'No snapping'],
    ],
  },
  {
    title: 'Drawing tools (route, wall, area, jumper, path measure)',
    rows: [
      ['Enter / double click', 'Finish a route, wall or area'],
      ['Backspace', 'Take back the last point'],
      ['Esc', 'Finish a route, wall or area; drop a jumper or path measure'],
    ],
  },
  {
    title: 'View and history',
    rows: [
      ['Ctrl + wheel', 'Zoom around the pointer'],
      ['Space + drag', 'Pan'],
      ['Ctrl + Z', 'Undo'],
      ['Ctrl + Y / Ctrl + Shift + Z', 'Redo'],
      ['?', 'This list'],
    ],
  },
];

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target as HTMLElement | null)?.isContentEditable;

/** Keyboard shortcuts, opened with `?` (or the main menu). */
export const ShortcutsDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="shortcuts-dialog">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>⌘ instead of Ctrl on a Mac.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map(g => (
            <section key={g.title}>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h4>
              <dl className="space-y-1 text-sm">
                {g.rows.map(([keys, what]) => (
                  <div key={keys} className="flex items-baseline justify-between gap-3">
                    <dt className="text-foreground">{what}</dt>
                    <dd className="shrink-0 font-mono text-xs"><kbd className="rounded border bg-muted px-1.5 py-0.5">{keys}</kbd></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
