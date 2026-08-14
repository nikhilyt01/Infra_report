'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Menu } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed in this session
    const sessionDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (sessionDismissed) {
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Always show banner after 2 seconds (fallback for all devices)
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 2000);

    // Try to capture beforeinstallprompt event (Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android - use native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }

      setDeferredPrompt(null);
      setShowBanner(false);
    } else if (isIOS) {
      // iOS - banner stays open with instructions
      // Don't close, let user read instructions
    } else {
      // Other browsers - show instructions
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 md:left-auto md:right-4 md:w-[420px] bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-2xl border-2 border-blue-400/30 p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-all"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="h-14 w-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Install InfraReport App
          </h3>
          
          {isIOS ? (
            // iOS Instructions
            <div className="space-y-2">
              <p className="text-sm text-blue-100">
                Tap <Menu className="inline h-4 w-4 mx-1" /> Share button, then "Add to Home Screen"
              </p>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-xs text-white space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
                  <span>Tap Share button (bottom)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
                  <span>Scroll and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
                  <span>Tap "Add"</span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            // Android with native prompt
            <div className="space-y-3">
              <p className="text-sm text-blue-100">
                Get quick access, offline support, and app-like experience!
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full bg-white hover:bg-blue-50 text-blue-600 px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Install Now
              </button>
            </div>
          ) : (
            // Fallback instructions for other browsers
            <div className="space-y-2">
              <p className="text-sm text-blue-100">
                Install from browser menu for best experience
              </p>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-xs text-white space-y-1">
                <div className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  <span>Tap browser menu (⋮)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Select "Install app" or "Add to Home screen"</span>
                </div>
              </div>
            </div>
          )}

          {!isIOS && !deferredPrompt && (
            <button
              onClick={handleDismiss}
              className="mt-3 text-xs text-blue-200 hover:text-white underline"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
