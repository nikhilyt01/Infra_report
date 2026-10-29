'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface NotificationItem {
  _id: string;
  type: 'report_resolved' | 'supervisor_signup' | 'urgent_escalation' | 'general';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  reportId?: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationDropdown() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications?limit=20');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Optional polling every 60s
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI update
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications();
    }
  };

  // Mark single as read & navigate
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      // Optimistic update
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );

      fetch(`/api/notifications/${notif._id}`, {
        method: 'PATCH',
      }).catch(console.error);
    }

    setIsOpen(false);
    if (notif.link) {
      // Ensure locale prefix
      const targetUrl = notif.link.startsWith(`/${locale}`)
        ? notif.link
        : `/${locale}${notif.link.startsWith('/') ? notif.link : `/${notif.link}`}`;
      router.push(targetUrl);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className={`relative p-2 rounded-xl border transition-all flex items-center justify-center ${
          isOpen
            ? 'bg-secondary border-primary/50 text-foreground ring-2 ring-primary/20 shadow-xs'
            : 'bg-secondary/60 hover:bg-secondary border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center justify-center animate-pulse shadow-xs border-2 border-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-2.5 top-[68px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl bg-card border border-border/80 shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col max-h-[calc(100vh-85px)]">
          {/* Header */}
          <div className="p-3.5 border-b border-border/60 flex items-center justify-between bg-secondary/30 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {unreadCount} new
                  </span>
                )}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors sm:hidden"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground">
                  You will receive updates when your reports are resolved or community tickets progress.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left hover:bg-secondary/40 ${
                    !notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'report_resolved'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : notif.type === 'supervisor_signup'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    {notif.type === 'report_resolved' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : notif.type === 'supervisor_signup' ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.isRead ? 'text-foreground font-bold' : 'text-foreground/90'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border/60 bg-secondary/20 text-center shrink-0">
            <Link
              href={`/${locale}/notifications`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 py-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
