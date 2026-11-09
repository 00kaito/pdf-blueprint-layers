import {useSyncExternalStore} from 'react';

/**
 * Installing the app on a phone / tablet (home-screen icon, opens full screen without the browser bars).
 *
 * - Android Chrome (and desktop Chrome / Edge) fire `beforeinstallprompt` when the app can be
 *   installed: it is kept here and replayed when the user taps "Install app". Needs HTTPS (or localhost),
 *   the manifest and the service worker (`public/manifest.webmanifest`, `public/sw.js`).
 * - iPhone / iPad Safari has no such event: the user adds it through Share → "Add to Home Screen";
 *   the app shows how (`InstallAppDialog`).
 * - Other browsers: the browser's own menu ("Install app" / "Add to Home screen").
 */

/** Chrome's install prompt event (not in the DOM typings). */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallState = {
  /** Running as the installed app (home-screen icon), not in a browser tab. */
  installed: boolean;
  /** The browser offered an install prompt we can show (Chrome / Edge). */
  canPrompt: boolean;
  platform: 'ios' | 'android' | 'other';
};

const detectPlatform = (): InstallState['platform'] => {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points tell them apart.
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
};

const isStandalone = () =>
  typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );

let deferred: InstallPromptEvent | null = null;
let state: InstallState = { installed: isStandalone(), canPrompt: false, platform: detectPlatform() };
const listeners = new Set<() => void>();
const set = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
};

/**
 * Called once at start-up (main.tsx), before React renders: Chrome may fire `beforeinstallprompt`
 * right after the page loads. Also registers the service worker.
 */
export const initInstallApp = () => {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for our button instead of Chrome's own mini-infobar.
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canPrompt: false, installed: true });
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', () => set({ installed: isStandalone() }));

  // Service workers need a secure context (HTTPS or localhost); elsewhere the app simply cannot be
  // installed through Chrome's prompt (iPhone "Add to Home Screen" still works).
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[PWA] Service worker not registered', err));
    });
  }
};

/**
 * Shows Chrome's install dialog (an event can be shown only once). 'none': there was none to show,
 * or the browser refused it — show the steps instead.
 */
export const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'none'> => {
  if (!deferred) return 'none';
  const event = deferred;
  deferred = null;
  set({ canPrompt: false });
  try {
    await event.prompt();
    return (await event.userChoice).outcome;
  } catch {
    return 'none';
  }
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Install state for the UI: whether to offer "Install app", and how. */
export const useInstallApp = () => {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  return {
    ...s,
    /** Worth offering: not installed yet, and either a prompt is ready or it is a phone / tablet. */
    available: !s.installed && (s.canPrompt || s.platform !== 'other'),
  };
};
