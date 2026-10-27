'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import IssueProgressBar from '@/components/IssueProgressBar';
import StatusUpdateModal from '@/components/StatusUpdateModal';
import {
  BarChart3, Clock, TrendingUp, CheckCircle,
  RotateCcw, Filter, MapPin, User, ThumbsUp,
  Check, ArrowUpRight, Loader2, ShieldCheck, AlertCircle,
  Camera, Eye, Bell, Search, UserCheck, UserX, X,
  Wrench, Copy, Sparkles, UserPlus, Users, CheckCheck
} from 'lucide-react';

interface Report {
  _id: string;
  title: string;
  status: string;
  priority: string;
  address: string;
  area: string;
  createdAt: string;
  reportedBy: {
    name: string;
    email: string;
  };
  categoryId: {
    name: string;
    icon: string;
  };
  upvotes: number;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    department?: string;
    supervisorCode?: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
  };
  initiatedBy?: {
    _id: string;
    name: string;
  };
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface SupervisorItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  supervisorCode?: string;
  department?: string;
  createdAt: string;
  approvedAt?: string;
}

interface Analytics {
  totalReports: number;
  resolvedReports: number;
  inProgressReports: number;
  submittedReports: number;
  resolutionRate: number;
  avgResolutionTimeHours: number;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

  // Notifications & Approvals Hub State
  const [showNotificationsHub, setShowNotificationsHub] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'general' | 'approvals'>('approvals');
  const [supervisors, setSupervisors] = useState<SupervisorItem[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [managerNotifications, setManagerNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Evidence-gated status modal state
  const [modalReport, setModalReport] = useState<{
    id: string;
    title: string;
    currentStatus: string;
    targetStatus: string;
    reportLocation?: [number, number];
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSupervisors();
    fetchNotifications();
  }, [statusFilter, areaFilter]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=30');
      const data = await res.json();
      if (data.success) {
        setManagerNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic UI update
    setUnreadCount(0);
    setManagerNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unreadCount ?? 0);
        toast.success('All notifications marked as read', 'Updated');
      }
    } catch {
      fetchNotifications();
    }
  };

  const handleToggleNotificationsHub = () => {
    const nextState = !showNotificationsHub;
    setShowNotificationsHub(nextState);
    if (nextState && unreadCount > 0) {
      handleMarkAllAsRead();
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let reportsUrl = '/api/reports?limit=50';
      if (statusFilter !== 'all') {
        reportsUrl += `&status=${statusFilter}`;
      }
      if (areaFilter !== 'all') {
        reportsUrl += `&area=${areaFilter}`;
      }

      const reportsResponse = await fetch(reportsUrl);
      const reportsData = await reportsResponse.json();

      if (reportsData.success) {
        setReports(reportsData.data);
      }

      const analyticsResponse = await fetch('/api/analytics/resolution-rate');
      const analyticsData = await analyticsResponse.json();

      if (analyticsData.success) {
        setAnalytics(analyticsData.data.overall);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async (query = '') => {
    setSupervisorsLoading(true);
    try {
      const url = `/api/manager/supervisors${query ? `?search=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSupervisors(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch supervisors:', e);
    } finally {
      setSupervisorsLoading(false);
    }
  };

  const handleSearchSupervisors = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSupervisors(supervisorSearch.trim());
  };

  const handleApproveSupervisor = async (supId: string) => {
    // Optimistically update notifications related to this supervisor
    setManagerNotifications((prev) =>
      prev.map((n) =>
        n.type === 'supervisor_signup' && String(n.relatedUserId) === String(supId)
          ? { ...n, isRead: true }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/manager/supervisors/${supId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Supervisor approved!', 'Supervisor Activated');
        fetchSupervisors(supervisorSearch.trim());
        fetchNotifications();
      } else {
        toast.error(data.error || 'Failed to approve supervisor');
        fetchNotifications();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error approving supervisor');
      fetchNotifications();
    }
  };

  const handleRevokeSupervisor = async (supId: string) => {
    // Optimistically update notifications related to this supervisor
    setManagerNotifications((prev) =>
      prev.map((n) =>
        n.type === 'supervisor_signup' && String(n.relatedUserId) === String(supId)
          ? { ...n, isRead: true }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/manager/supervisors/${supId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.info(data.message || 'Supervisor access revoked.', 'Access Revoked');
        fetchSupervisors(supervisorSearch.trim());
        fetchNotifications();
      } else {
        toast.error(data.error || 'Failed to revoke supervisor');
        fetchNotifications();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error revoking supervisor');
      fetchNotifications();
    }
  };

  const handleAssignReport = async (reportId: string, supervisorId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: supervisorId || null }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(supervisorId ? 'Work order assigned to field supervisor!' : 'Work order unassigned', 'Assignment Updated');
        fetchDashboardData();
      } else {
        toast.error(data.error || 'Failed to update assignment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating assignment');
    }
  };

  const openStatusModal = (report: Report, targetStatus: string) => {
    if (!user) {
      toast.error('You must be signed in to perform this action');
      return;
    }
    setModalReport({
      id: report._id,
      title: report.title,
      currentStatus: report.status,
      targetStatus,
      reportLocation: report.location?.coordinates,
    });
  };

  const handleApproveReport = async (reportId: string) => {
    if (!user) {
      toast.error('You must be signed in to perform this action');
      return;
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvedBy: user._id,
          status: 'under_review',
          note: 'Report reviewed and approved by municipal manager',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Report approved and moved to Under Review', 'Report Approved');
        fetchDashboardData();
      } else {
        toast.error(data.error || 'Failed to approve report');
      }
    } catch (error: any) {
      console.error('Error approving report:', error);
      toast.error(error.message || 'Error approving report');
    }
  };

  // Filter approved supervisors for the assignment dropdown
  const approvedSupervisors = useMemo(() => {
    return supervisors.filter((s) => s.isApproved);
  }, [supervisors]);

  // Pending supervisor count
  const pendingSupervisors = useMemo(() => {
    return supervisors.filter((s) => !s.isApproved);
  }, [supervisors]);

  // General notifications: Auto-escalated tickets or urgent unassigned tickets
  const generalAlerts = useMemo(() => {
    const escalated = reports.filter((r) => (r.upvotes || 0) >= 2 || r.priority === 'urgent');
    const unapproved = reports.filter((r) => r.status === 'submitted' && !r.approvedBy);
    return { escalated, unapproved };
  }, [reports]);

  const totalNotifications = unreadCount;

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      under_review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      in_progress: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      closed: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      rejected: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    };
    return map[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold',
    };
    return map[priority] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 flex-1">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Manager Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
              <span>City Manager Operations</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Review incoming citizen tickets, approve work orders, and assign field repair teams
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Notification & Approval Hub Button */}
            <Button
              onClick={handleToggleNotificationsHub}
              variant={showNotificationsHub ? 'default' : 'outline'}
              size="sm"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs font-semibold relative h-9"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Notifications & Approvals</span>
              {totalNotifications > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0">
                  {totalNotifications}
                </span>
              )}
            </Button>

            <Button
              onClick={() => {
                fetchDashboardData();
                fetchSupervisors();
              }}
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs font-medium h-9 shrink-0 px-3"
              title="Refresh Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Notifications & Supervisor Approval Hub (Expandable Card) */}
        {showNotificationsHub && (
          <Card className="border-2 border-amber-500/40 shadow-lg bg-card/95 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
            <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/60">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xs sm:text-sm font-bold text-foreground truncate">
                      Operations Notifications & Approvals Hub
                    </CardTitle>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">
                      Search supervisor IDs to activate field accounts and review community escalated tickets
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-secondary"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationsHub(false)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
                    aria-label="Close hub"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setNotificationTab('approvals')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${notificationTab === 'approvals'
                      ? 'bg-amber-500 text-gray-950 shadow-xs'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Supervisor Approvals</span>
                  {pendingSupervisors.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px]">
                      {pendingSupervisors.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationTab('general')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${notificationTab === 'general'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>General Alerts</span>
                  {generalAlerts.escalated.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-gray-950 rounded-full text-[10px]">
                      {generalAlerts.escalated.length}
                    </span>
                  )}
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-5">
              {/* TAB 1: SUPERVISOR APPROVALS */}
              {notificationTab === 'approvals' && (
                <div className="space-y-4">
                  {/* Search Bar for Supervisor ID */}
                  <form onSubmit={handleSearchSupervisors} className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={supervisorSearch}
                        onChange={(e) => setSupervisorSearch(e.target.value)}
                        placeholder="Search Supervisor ID (SUP-XXXXXX), Name..."
                        className="pl-9 text-xs h-9 bg-background border-border/80 uppercase font-mono tracking-wider"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" className="text-xs h-9 px-4 flex-1 sm:flex-none">
                        Search
                      </Button>
                      {supervisorSearch && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSupervisorSearch('');
                            fetchSupervisors('');
                          }}
                          className="text-xs h-9 px-3 flex-1 sm:flex-none"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </form>

                  {/* Supervisor List */}
                  {supervisorsLoading ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Searching supervisor directory...</span>
                    </div>
                  ) : supervisors.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground bg-secondary/30 rounded-xl border border-dashed border-border/80 px-4">
                      No supervisors found matching your search. Field supervisors can sign up on the registration page to generate an ID.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {supervisors.map((sup) => (
                        <div
                          key={sup._id}
                          className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2.5 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Supervisor ID Monospace Badge */}
                                <span className="font-mono text-xs font-black tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                  <span>{sup.supervisorCode || 'NO-ID'}</span>
                                  {sup.supervisorCode && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(sup.supervisorCode || '');
                                        setCopiedId(sup._id);
                                        setTimeout(() => setCopiedId(null), 2000);
                                      }}
                                      title="Copy ID"
                                      className="p-0.5 hover:bg-amber-500/20 rounded"
                                    >
                                      {copiedId === sup._id ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                      )}
                                    </button>
                                  )}
                                </span>

                                {/* Approval Status Badge */}
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${sup.isApproved
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                    }`}
                                >
                                  {sup.isApproved ? 'Approved & Active' : 'Pending Approval'}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-foreground truncate">{sup.name}</p>
                              <p className="text-[11px] text-muted-foreground break-all">{sup.email}</p>
                              {sup.department && (
                                <p className="text-[10px] text-primary font-medium truncate">
                                  Department: {sup.department}
                                </p>
                              )}
                            </div>

                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {new Date(sup.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                            {!sup.isApproved ? (
                              <Button
                                size="sm"
                                onClick={() => handleApproveSupervisor(sup._id)}
                                className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 w-full sm:w-auto"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve & Activate</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevokeSupervisor(sup._id)}
                                className="text-xs h-7 px-2.5 text-rose-600 hover:bg-rose-500/10 border-rose-500/30 gap-1 w-full sm:w-auto"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Revoke</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GENERAL NOTIFICATIONS & ALERTS */}
              {notificationTab === 'general' && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {managerNotifications.length === 0 && generalAlerts.escalated.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No notifications or urgent alerts right now.
                    </div>
                  ) : (
                    <>
                      {/* Database Persistent Notifications */}
                      {managerNotifications.map((n) => (
                        <div
                          key={n._id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs transition-all ${
                            !n.isRead
                              ? 'border-amber-500/40 bg-amber-500/5'
                              : 'border-border/80 bg-background/80'
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {n.type === 'supervisor_signup' ? 'Approval' : 'Alert'}
                              </span>
                              <span className="font-semibold text-foreground truncate max-w-[200px]">
                                {n.title}
                              </span>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {n.link && (
                              <Link
                                href={`/${locale}${n.link.startsWith('/') ? n.link : `/${n.link}`}`}
                                className="text-primary hover:underline text-xs font-semibold flex items-center gap-1"
                              >
                                <span>View</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Escalated Tickets Alerts */}
                      {generalAlerts.escalated.map((rep) => (
                        <div
                          key={rep._id}
                          className="p-3 rounded-xl border border-border/80 bg-background/80 flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                {rep.priority}
                              </span>
                              <span className="font-semibold text-foreground truncate max-w-[200px]">
                                {rep.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                (👍 {rep.upvotes} upvotes)
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{rep.address}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/${locale}/reports/${rep._id}`}
                              className="text-primary hover:underline text-xs font-semibold flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analytics Snapshot Grid */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">Total Tickets</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground mt-0.5">{analytics.totalReports}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">Pending Review</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {analytics.submittedReports}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">In Progress</p>
                  <p className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {analytics.inProgressReports}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">Resolved Rate</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {analytics.resolutionRate}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Bar */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-foreground">Filter Queue:</span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Status Filter */}
              <div className="col-span-1 sm:w-44">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs h-9 bg-card border-border/80"
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>

              {/* Area Filter */}
              <div className="col-span-1 sm:w-44">
                <Select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="w-full text-xs h-9 bg-card border-border/80"
                  aria-label="Filter by ward area"
                >
                  <option value="all">All Wards / Areas</option>
                  <option value="Central">Central Ward</option>
                  <option value="North">North Ward</option>
                  <option value="South">South Ward</option>
                  <option value="East">East Ward</option>
                  <option value="West">West Ward</option>
                </Select>
              </div>

              {/* Reset Filter Button */}
              {(statusFilter !== 'all' || areaFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setStatusFilter('all');
                    setAreaFilter('all');
                  }}
                  variant="ghost"
                  size="sm"
                  className="col-span-2 sm:col-span-1 text-xs h-8 sm:h-9 text-muted-foreground hover:text-foreground"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Queue Reports Table */}
        <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 pb-3 sm:pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Infrastructure Reports Queue</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({reports.length} records)
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect details, assign approved field supervisors, and manage resolution lifecycle
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading queue tickets...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center space-y-2 px-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="text-sm font-semibold text-foreground">No reports matching filter</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try clearing your status or ward filters to see more tickets in the queue.
                </p>
              </div>
            ) : (
              <div>
                {/* Desktop Data Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[1100px] border-collapse">
                    <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <tr>
                        <th className="py-3 px-4 min-w-[220px]">Issue Details</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-3">Ward / Area</th>
                        <th className="py-3 px-3">Reporter</th>
                        <th className="py-3 px-3 min-w-[175px]">Assigned Supervisor</th>
                        <th className="py-3 px-3 text-center">Approval</th>
                        <th className="py-3 px-3 text-center">Votes</th>
                        <th className="py-3 px-4 text-right min-w-[140px]">Lifecycle Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reports.map((report) => (
                        <tr
                          key={report._id}
                          onClick={() => router.push(`/${locale}/reports/${report._id}`)}
                          className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                        >
                          {/* Title & Progress */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {report.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {report.address}
                            </p>
                            <div className="mt-2 w-32">
                              <IssueProgressBar status={report.status} showLabels={false} size="sm" />
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(report.status)}`}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border uppercase ${getPriorityBadge(report.priority)}`}>
                              {report.priority}
                            </span>
                          </td>

                          {/* Area */}
                          <td className="py-3.5 px-3 text-muted-foreground font-medium whitespace-nowrap">
                            {report.area || 'City Area'}
                          </td>

                          {/* Reported By */}
                          <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                            {report.reportedBy?.name || 'Citizen'}
                          </td>

                          {/* Assigned Supervisor Dropdown */}
                          <td className="py-3.5 px-3 whitespace-nowrap min-w-[175px]" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={report.assignedTo?._id || ''}
                              onChange={(e) => handleAssignReport(report._id, e.target.value)}
                              className="h-8 text-xs w-44 bg-card border-border/80 rounded-lg px-2"
                              aria-label="Assign supervisor"
                            >
                              <option value="">Unassigned</option>
                              {approvedSupervisors.map((sup) => (
                                <option key={sup._id} value={sup._id}>
                                  {sup.name} ({sup.supervisorCode || sup.department || 'Field'})
                                </option>
                              ))}
                            </Select>
                          </td>

                          {/* Approval */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            {report.approvedBy ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                <Check className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            ) : (
                              <Button
                                onClick={() => handleApproveReport(report._id)}
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              >
                                Approve
                              </Button>
                            )}
                          </td>

                          {/* Votes */}
                          <td className="py-3.5 px-3 text-center text-muted-foreground font-semibold whitespace-nowrap">
                            👍 {report.upvotes || 0}
                          </td>

                          {/* Lifecycle Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {['resolved', 'rejected'].includes(report.status) && user?.role !== 'admin' ? (
                                <span className="text-[11px] text-muted-foreground italic px-2">
                                  {report.status === 'resolved' ? 'Resolved' : 'Rejected'}
                                </span>
                              ) : (
                                <Select
                                  value=""
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    if (next) {
                                      openStatusModal(report, next);
                                    }
                                  }}
                                  className="h-8 text-xs w-28 bg-card border-border/80 rounded-lg px-2 font-medium cursor-pointer"
                                  aria-label="Lifecycle action"
                                >
                                  <option value="" disabled>
                                    Action...
                                  </option>
                                  {['submitted', 'under_review'].includes(report.status) && (
                                    <option value="in_progress">Start Work</option>
                                  )}
                                  {report.status === 'in_progress' && (
                                    <option value="resolved">Resolve Issue</option>
                                  )}
                                  {!['resolved', 'rejected', 'closed'].includes(report.status) && (
                                    <option value="rejected">Reject Report</option>
                                  )}
                                  {user?.role === 'admin' && ['resolved', 'rejected'].includes(report.status) && (
                                    <option value="in_progress">Reopen Ticket</option>
                                  )}
                                </Select>
                              )}

                              <Link
                                href={`/${locale}/reports/${report._id}`}
                                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                title="Open Ticket Details"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards View */}
                <div className="block md:hidden divide-y divide-border/60">
                  {reports.map((report) => (
                    <div
                      key={report._id}
                      onClick={() => router.push(`/${locale}/reports/${report._id}`)}
                      className="p-3.5 sm:p-4 space-y-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      {/* Top Row: Title & Badges */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2">
                            {report.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${getStatusBadge(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                          <p className="line-clamp-1 text-[11px] sm:text-xs">
                            {report.address}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full">
                        <IssueProgressBar status={report.status} showLabels={false} size="sm" />
                      </div>

                      {/* Details Row: Area, Priority, Reporter, Votes */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getPriorityBadge(report.priority)}`}>
                          {report.priority}
                        </span>
                        <span className="bg-secondary/80 px-2 py-0.5 rounded text-[10px] font-medium text-foreground">
                          {report.area || 'Ward Area'}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">By {report.reportedBy?.name || 'Citizen'}</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">👍 {report.upvotes || 0}</span>
                      </div>

                      {/* Field Supervisor Assignment on Mobile */}
                      <div className="flex items-center justify-between gap-2 pt-1 bg-secondary/20 p-2 rounded-lg border border-border/40" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[11px] sm:text-xs">Supervisor:</span>
                        </div>
                        <Select
                          value={report.assignedTo?._id || ''}
                          onChange={(e) => handleAssignReport(report._id, e.target.value)}
                          className="h-8 text-xs flex-1 max-w-[210px] bg-card border-border/80 rounded-md"
                          aria-label="Assign supervisor"
                        >
                          <option value="">Unassigned</option>
                          {approvedSupervisors.map((sup) => (
                            <option key={sup._id} value={sup._id}>
                              {sup.name} ({sup.supervisorCode || sup.department || 'Field'})
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                        {/* Approval State */}
                        <div>
                          {report.approvedBy ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-xs bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleApproveReport(report._id)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 font-medium"
                            >
                              Approve
                            </Button>
                          )}
                        </div>

                        {/* Status Select & View */}
                        <div className="flex items-center gap-2">
                          {['resolved', 'rejected'].includes(report.status) && user?.role !== 'admin' ? (
                            <span className="text-[11px] text-muted-foreground italic px-2">
                              {report.status === 'resolved' ? 'Resolved' : 'Rejected'}
                            </span>
                          ) : (
                            <Select
                              value=""
                              onChange={(e) => {
                                const next = e.target.value;
                                if (next) {
                                  openStatusModal(report, next);
                                }
                              }}
                              className="h-8 text-xs w-32 bg-card border-border/80 rounded-md px-2 font-medium cursor-pointer"
                              aria-label="Lifecycle action"
                            >
                              <option value="" disabled>
                                Action...
                              </option>
                              {['submitted', 'under_review'].includes(report.status) && (
                                <option value="in_progress">Start Work</option>
                              )}
                              {report.status === 'in_progress' && (
                                <option value="resolved">Resolve Issue</option>
                              )}
                              {!['resolved', 'rejected', 'closed'].includes(report.status) && (
                                <option value="rejected">Reject Report</option>
                              )}
                              {user?.role === 'admin' && ['resolved', 'rejected'].includes(report.status) && (
                                <option value="in_progress">Reopen</option>
                              )}
                            </Select>
                          )}

                          <Link
                            href={`/${locale}/reports/${report._id}`}
                            className="h-8 w-8 rounded-md bg-secondary/80 hover:bg-secondary text-foreground transition-colors flex items-center justify-center shrink-0 border border-border/60"
                            title="Open Ticket"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evidence-Gated Status Update Modal */}
      {modalReport && (
        <StatusUpdateModal
          isOpen={Boolean(modalReport)}
          onClose={() => setModalReport(null)}
          reportId={modalReport.id}
          reportTitle={modalReport.title}
          currentStatus={modalReport.currentStatus}
          targetStatus={modalReport.targetStatus}
          reportLocation={modalReport.reportLocation}
          onSuccess={() => {
            fetchDashboardData();
            setModalReport(null);
          }}
        />
      )}
    </div>
  );
}
