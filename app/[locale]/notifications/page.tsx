'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
  UserCheck,
  Filter,
  ArrowRight
} from 'lucide-react';

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
  const diffInDays = Math.floor(diffInDaysToNumber(diffInHours));
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

function diffInDaysToNumber(hours: number): number {
  return Math.floor(hours / 24);
}

export default function NotificationsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/login`);
    } else if (user) {
      fetchNotifications();
    }
  }, [user, authLoading, tab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = `/api/notifications?limit=50${tab === 'unread' ? '&unreadOnly=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

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
        toast.success('All notifications marked as read', 'Updated');
        setUnreadCount(data.unreadCount ?? 0);
        if (tab === 'unread') {
          setNotifications([]);
        }
      }
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic update
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );

    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      if (tab === 'unread') {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const target = notifications.find((n) => n._id === id);
    if (target && !target.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifications((prev) => prev.filter((n) => n._id !== id));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      toast.info('Notification removed');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
    }
  };

  const handleItemClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    if (notif.link) {
      const targetUrl = notif.link.startsWith(`/${locale}`)
        ? notif.link
        : `/${locale}${notif.link.startsWith('/') ? notif.link : `/${notif.link}`}`;
      router.push(targetUrl);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Notifications</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary shrink-0" />
              <span>Notification Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Stay updated on your reported issues, municipal action milestones, and status changes
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
                className="text-xs h-9 px-3 gap-1.5 font-medium"
              >
                <CheckCheck className="w-4 h-4 text-primary" />
                <span>Mark all as read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span>All Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('unread')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === 'unread'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                tab === 'unread' ? 'bg-white text-primary' : 'bg-rose-600 text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications Card List */}
        <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                  <Bell className="w-6 h-6 opacity-60" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {tab === 'unread'
                    ? "You're completely caught up! We'll notify you as soon as updates occur."
                    : 'Whenever issues you reported or upvoted get resolved by our municipal team, updates will show here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer group hover:bg-secondary/40 ${
                      !notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                  >
                    {/* Category / Type Icon */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        notif.type === 'report_resolved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : notif.type === 'supervisor_signup'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}
                    >
                      {notif.type === 'report_resolved' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : notif.type === 'supervisor_signup' ? (
                        <UserCheck className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors ${
                              !notif.isRead ? 'text-foreground font-bold' : 'text-foreground'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                              New
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo(notif.createdAt)}</span>
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Actions row */}
                      <div className="flex items-center justify-between gap-2 pt-2">
                        {notif.link ? (
                          <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                            <span>Inspect Issue</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!notif.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleMarkAsRead(notif._id, e)}
                              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                              <span className="hidden sm:inline">Mark read</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(notif._id, e)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
