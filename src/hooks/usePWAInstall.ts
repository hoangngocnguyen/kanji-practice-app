import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

// Capture early beforeinstallprompt globally before React mounts
let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let cachedInstalled = false;
const promptListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((cb) => cb());
  });

  window.addEventListener('appinstalled', () => {
    cachedInstalled = true;
    cachedDeferredPrompt = null;
    promptListeners.forEach((cb) => cb());
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => cachedDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      cachedInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        cachedInstalled ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    const ua = navigator.userAgent || '';
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/i.test(ua));
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const syncPrompt = () => {
      setDeferredPrompt(cachedDeferredPrompt);
      if (cachedInstalled) setIsInstalled(true);
    };
    promptListeners.add(syncPrompt);
    syncPrompt();

    const mq = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => checkStandalone();
    mq.addEventListener?.('change', onDisplayModeChange);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      promptListeners.delete(syncPrompt);
      mq.removeEventListener?.('change', onDisplayModeChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const target = deferredPrompt || cachedDeferredPrompt;
    if (!target) return 'unavailable';
    await target.prompt();
    const { outcome } = await target.userChoice;
    if (outcome === 'accepted') {
      cachedDeferredPrompt = null;
      cachedInstalled = true;
      setDeferredPrompt(null);
      setIsInstalled(true);
      promptListeners.forEach((cb) => cb());
    }
    return outcome;
  }, [deferredPrompt]);

  return {
    canInstallNative: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isOnline,
    promptInstall,
  };
}
