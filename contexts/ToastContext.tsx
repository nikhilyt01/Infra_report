'use client';

import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, message, title, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 visible toasts

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toast = {
    success: useCallback(
      (message: string, title?: string, duration?: number) => addToast('success', message, title, duration),
      [addToast]
    ),
    error: useCallback(
      (message: string, title?: string, duration?: number) => addToast('error', message, title, duration),
      [addToast]
    ),
    info: useCallback(
      (message: string, title?: string, duration?: number) => addToast('info', message, title, duration),
      [addToast]
    ),
    warning: useCallback(
      (message: string, title?: string, duration?: number) => addToast('warning', message, title, duration),
      [addToast]
    ),
  };

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      {/* Toast Floating Notification Container */}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((item) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              border: 'border-emerald-500/30',
              bg: 'bg-card/95 dark:bg-zinc-900/95',
              text: 'text-emerald-600 dark:text-emerald-400',
              bar: 'bg-emerald-500',
            },
            error: {
              icon: AlertCircle,
              border: 'border-rose-500/30',
              bg: 'bg-card/95 dark:bg-zinc-900/95',
              text: 'text-rose-600 dark:text-rose-400',
              bar: 'bg-rose-500',
            },
            warning: {
              icon: AlertTriangle,
              border: 'border-amber-500/30',
              bg: 'bg-card/95 dark:bg-zinc-900/95',
              text: 'text-amber-600 dark:text-amber-400',
              bar: 'bg-amber-500',
            },
            info: {
              icon: Info,
              border: 'border-blue-500/30',
              bg: 'bg-card/95 dark:bg-zinc-900/95',
              text: 'text-blue-600 dark:text-blue-400',
              bar: 'bg-blue-500',
            },
          }[item.type];

          const IconComponent = typeConfig.icon;

          return (
            <div
              key={item.id}
              role={item.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto relative flex items-start gap-3 p-3.5 rounded-xl border ${typeConfig.border} ${typeConfig.bg} backdrop-blur-md shadow-lg shadow-black/10 transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
            >
              <div className={`mt-0.5 shrink-0 ${typeConfig.text}`}>
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                {item.title && (
                  <h4 className="text-xs font-semibold text-foreground tracking-tight leading-tight mb-0.5">
                    {item.title}
                  </h4>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {item.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Bottom accent line */}
              <div
                className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${typeConfig.bar} opacity-70`}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
