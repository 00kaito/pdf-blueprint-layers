import React, {useState} from 'react';
import {Cable, ChevronLeft, Download, Layers, LogOut, Menu, Spline, Palette, User, Video} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Separator} from '@/components/ui/separator';
import {Sheet, SheetContent, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {useDocument, useUI} from '@/lib/editor-context';
import {useCurrentUser, useLogout} from '@/hooks/useAuth';
import {hasCctvObjects, useToggleCoverage} from './CctvTools';
import {cn} from '@/lib/utils';
import {useInstallAppAction} from '@/components/InstallApp';

const Row = ({ icon: Icon, label, checked, onChange, testId }: {
  icon: typeof Menu; label: string; checked: boolean; onChange: () => void; testId: string;
}) => (
  <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 active:bg-muted">
    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
  </label>
);

/**
 * Phone menu (hamburger, slides in from the left so it takes no room on the plan): back to all
 * projects, what the plan shows, and whole layers on / off — single objects cannot be hidden here.
 */
export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { state: docState, dispatch } = useDocument();
  const { state: uiState } = useUI();
  const toggleCoverage = useToggleCoverage();
  const install = useInstallAppAction();

  const allProjects = () => {
    setOpen(false);
    dispatch({ type: 'RESET_EDITOR' });
  };

  const onLogout = () => {
    logout.mutate(undefined, { onSuccess: () => dispatch({ type: 'RESET_EDITOR' }) });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 h-10 w-10 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        data-testid="mobile-menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-[85vw] max-w-xs flex-col gap-0 p-0" data-testid="mobile-menu-sheet">
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            {user && (
              <div className="flex items-center gap-2 pr-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{user.username}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{user.role}</span>
                </div>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-2">
            <button
              type="button"
              onClick={allProjects}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium active:bg-muted"
              data-testid="mobile-menu-all-projects"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              All projects
            </button>
            {install.available && (
              <button
                type="button"
                // The steps dialog lives outside the sheet, so closing the menu does not close it.
                onClick={() => { setOpen(false); install.start(); }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium active:bg-muted"
                data-testid="mobile-menu-install"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                Install app
              </button>
            )}

            <Separator className="my-2" />
            <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Show</div>
            <Row
              icon={Palette}
              label="Color by status"
              checked={uiState.showStatusColors}
              onChange={() => dispatch({ type: 'TOGGLE_STATUS_COLORS' })}
              testId="mobile-menu-status-colors"
            />
            {hasCctvObjects(docState.objects) && (
              <Row
                icon={Video}
                label="Camera coverage"
                checked={uiState.showCameraCoverage}
                onChange={toggleCoverage}
                testId="mobile-menu-coverage"
              />
            )}
            <Row
              icon={Spline}
              label="Cable routes"
              checked={uiState.showCableRoutes}
              onChange={() => dispatch({ type: 'TOGGLE_CABLE_ROUTES' })}
              testId="mobile-menu-cable-routes"
            />
            <Row
              icon={Cable}
              label="All jumpers"
              checked={uiState.showJumpers}
              onChange={() => dispatch({ type: 'TOGGLE_JUMPERS' })}
              testId="mobile-menu-jumpers"
            />

            {docState.layers.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Layers</div>
                {/* Top layer first, as in the desktop layer panel. */}
                {[...docState.layers].reverse().map(layer => (
                  <label
                    key={layer.id}
                    className={cn("flex min-h-11 items-center gap-3 rounded-lg px-2 active:bg-muted", !layer.visible && "text-muted-foreground")}
                  >
                    <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{layer.name}</span>
                    <Switch
                      checked={layer.visible}
                      onCheckedChange={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layer.id })}
                      data-testid={`mobile-menu-layer-${layer.id}`}
                    />
                  </label>
                ))}
              </>
            )}
          </div>

          {user && (
            <div className="border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onLogout}
                disabled={logout.isPending}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium text-destructive active:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {install.dialog}
    </>
  );
};
