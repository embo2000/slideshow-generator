export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(deferredInstallPrompt));
};

export const initPwaInstallPromptCapture = () => {
  if (initialized) return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyListeners();
  });
};

export const getDeferredInstallPrompt = () => deferredInstallPrompt;

export const clearDeferredInstallPrompt = () => {
  deferredInstallPrompt = null;
  notifyListeners();
};

export const subscribeDeferredInstallPrompt = (
  listener: (prompt: BeforeInstallPromptEvent | null) => void
) => {
  listeners.add(listener);
  listener(deferredInstallPrompt);
  return () => {
    listeners.delete(listener);
  };
};
