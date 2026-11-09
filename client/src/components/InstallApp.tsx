import React, {useState} from 'react';
import {Download, EllipsisVertical, Share, SquarePlus} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {promptInstall, useInstallApp} from '@/lib/install-app';
import {cn} from '@/lib/utils';

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
    <span className="pt-0.5 leading-snug">{children}</span>
  </li>
);

const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 align-middle text-xs font-medium">{children}</span>
);

/** How to add the app to the home screen where the browser has no install prompt for us. */
const InstallAppDialog = ({ open, onOpenChange, platform }: {
  open: boolean; onOpenChange: (open: boolean) => void; platform: 'ios' | 'android' | 'other';
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[400px]" data-testid="install-app-dialog">
      <DialogHeader>
        <DialogTitle>Install the app</DialogTitle>
        <DialogDescription>
          Adds a Blueprints icon to your home screen; the app then opens full screen, without the browser bars.
        </DialogDescription>
      </DialogHeader>
      {platform === 'ios' ? (
        <ol className="space-y-3 text-sm">
          <Step n={1}>
            In Safari, tap <Key><Share className="h-3.5 w-3.5" /> Share</Key> (bottom bar on iPhone, top on iPad).
            In Chrome, the Share button is in the address bar.
          </Step>
          <Step n={2}>Scroll down and tap <Key><SquarePlus className="h-3.5 w-3.5" /> Add to Home Screen</Key>.</Step>
          <Step n={3}>Tap <Key>Add</Key>. Open the app from the new icon.</Step>
        </ol>
      ) : (
        <ol className="space-y-3 text-sm">
          <Step n={1}>Open the browser menu <Key><EllipsisVertical className="h-3.5 w-3.5" /></Key> (top right in Chrome).</Step>
          <Step n={2}>Tap <Key>Install app</Key> or <Key>Add to Home screen</Key>.</Step>
          <Step n={3}>Confirm. Open the app from the new icon.</Step>
        </ol>
      )}
      {platform !== 'ios' && (
        <p className="text-xs text-muted-foreground">
          Not in the menu? Installing needs a secure (https) address of the server.
        </p>
      )}
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>OK</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/**
 * "Install app": Chrome's own install dialog when the browser offers one, otherwise the steps for
 * this device. `available` is false once the app runs installed (or on a desktop without a prompt).
 * Render `dialog` somewhere next to the button.
 */
export const useInstallAppAction = () => {
  const install = useInstallApp();
  const [helpOpen, setHelpOpen] = useState(false);
  const start = async () => {
    // Chrome's own dialog when there is one (the user's "no" is an answer, not a reason for the
    // steps); otherwise — iPhone, other browsers, no https — the steps for this device.
    if (await promptInstall() === 'none') setHelpOpen(true);
  };
  return {
    available: install.available,
    start,
    dialog: <InstallAppDialog open={helpOpen} onOpenChange={setHelpOpen} platform={install.platform} />,
  };
};

/** A plain "Install app" button (login page, project list); renders nothing when not useful. */
export const InstallAppButton = ({ className, variant = 'outline' }: { className?: string; variant?: 'outline' | 'ghost' }) => {
  const { available, start, dialog } = useInstallAppAction();
  if (!available) return null;
  return (
    <>
      <Button variant={variant} className={cn('gap-2', className)} onClick={start} data-testid="install-app">
        <Download className="h-4 w-4" />
        Install app
      </Button>
      {dialog}
    </>
  );
};
