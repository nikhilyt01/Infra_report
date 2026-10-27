'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import IssueProgressBar from '@/components/IssueProgressBar';
import StatusUpdateModal from '@/components/StatusUpdateModal';
import { 
  BarChart3, Clock, TrendingUp, CheckCircle, 
  RotateCcw, Filter, MapPin, User, ThumbsUp, 
  Check, ArrowUpRight, Loader2, ShieldCheck, AlertCircle,
  Camera, Eye
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
  approvedBy?: {
    _id: string;
    name: string;
  };
  initiatedBy?: {
    _id: string;
    name: string;
  };
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

  // Evidence-gated status modal state
  const [modalReport, setModalReport] = useState<{
    id: string;
    title: string;
    currentStatus: string;
    targetStatus: string;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [statusFilter, areaFilter]);

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

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Manager Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-primary" />
              <span>City Manager Operations</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Review incoming citizen tickets, approve work orders, and assign repair teams
            </p>
          </div>

          <Button
            onClick={fetchDashboardData}
            variant="outline"
            size="sm"
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Tickets</span>
          </Button>
        </div>

        {/* Analytics Snapshot Grid */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border/80 shadow-xs bg-card ">
              <CardContent className="p-5 flex items-center gap-4 mt-2">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-primary flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Tickets</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{analytics.totalReports}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-5 flex items-center gap-4 mt-2">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Review</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {analytics.submittedReports}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-5 flex items-center gap-4 mt-2">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {analytics.inProgressReports}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-5 flex items-center gap-4 mt-2">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Resolution Rate</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {analytics.resolutionRate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Controls Bar */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground mt-2">
                <Filter className="w-4 h-4 text-primary " />
                <span>Filter Queue:</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 text-xs w-full sm:w-44"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </Select>

                <Select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="h-9 text-xs w-full sm:w-44"
                >
                  <option value="all">All Wards / Areas</option>
                  <option value="Ward 1">Ward 1</option>
                  <option value="Ward 2">Ward 2</option>
                  <option value="Ward 3">Ward 3</option>
                  <option value="Ward 4">Ward 4</option>
                  <option value="Ward 5">Ward 5</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table Card */}
        <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Assigned Reports Queue ({reports.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect details, verify civic hazards, and update resolution lifecycle states
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
              <div className="py-16 text-center space-y-2">
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
                  <table className="w-full text-left text-xs min-w-[900px]">
                    <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Issue Details</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-3">Ward / Area</th>
                        <th className="py-3 px-3">Reporter</th>
                        <th className="py-3 px-3">Approval</th>
                        <th className="py-3 px-3">Votes</th>
                        <th className="py-3 px-4 text-right">Lifecycle Action</th>
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

                          {/* Approved By */}
                          <td className="py-3.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {report.approvedBy ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-xs">
                                <Check className="w-3.5 h-3.5" />
                                <span>{report.approvedBy.name}</span>
                              </span>
                            ) : (
                              <Button
                                onClick={() => handleApproveReport(report._id)}
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              >
                                Approve
                              </Button>
                            )}
                          </td>

                          {/* Votes */}
                          <td className="py-3.5 px-3 text-muted-foreground font-semibold whitespace-nowrap">
                            👍 {report.upvotes || 0}
                          </td>

                          {/* Action Select */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Action Buttons */}
                              {['submitted', 'under_review'].includes(report.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openStatusModal(report, 'in_progress')}
                                  className="h-7 text-[11px] px-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
                                >
                                  Start Work
                                </Button>
                              )}

                              {report.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openStatusModal(report, 'resolved')}
                                  className="h-7 text-[11px] px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 font-semibold flex items-center gap-1"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>Resolve</span>
                                </Button>
                              )}

                              {/* Lifecycle Selector Dropdown */}
                              <Select
                                value={report.status}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  if (next !== report.status) {
                                    openStatusModal(report, next);
                                  }
                                }}
                                className="h-7 text-[11px] w-28 bg-card border-border/80"
                                aria-label="Lifecycle action"
                              >
                                <option value={report.status} disabled>
                                  Action...
                                </option>
                                {['submitted', 'under_review'].includes(report.status) && (
                                  <option value="in_progress">In Progress</option>
                                )}
                                {report.status === 'in_progress' && (
                                  <option value="resolved">Resolve (Evidence)</option>
                                )}
                                {!['resolved', 'rejected', 'closed'].includes(report.status) && (
                                  <option value="rejected">Reject (Reason)</option>
                                )}
                                {user?.role === 'admin' && ['resolved', 'rejected'].includes(report.status) && (
                                  <option value="in_progress">Reopen (Admin)</option>
                                )}
                              </Select>

                              <Link 
                                href={`/${locale}/reports/${report._id}`}
                                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
                      className="p-4 space-y-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      {/* Top Row: Title & Badges */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-foreground hover:text-primary transition-colors leading-tight">
                            {report.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${getStatusBadge(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {report.address}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full">
                        <IssueProgressBar status={report.status} showLabels={false} size="sm" />
                      </div>

                      {/* Details Row: Area, Priority, Reporter */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${getPriorityBadge(report.priority)}`}>
                          {report.priority}
                        </span>
                        <span className="bg-secondary/80 px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                          {report.area || 'Ward Area'}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] truncate">By {report.reportedBy?.name || 'Citizen'}</span>
                        <span>•</span>
                        <span className="text-[11px] font-semibold text-foreground">👍 {report.upvotes || 0}</span>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                        {/* Approval State */}
                        <div>
                          {report.approvedBy ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-xs">
                              <Check className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleApproveReport(report._id)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            >
                              Approve
                            </Button>
                          )}
                        </div>

                        {/* Status Select & View */}
                        <div className="flex items-center gap-1.5">
                          {report.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => openStatusModal(report, 'resolved')}
                              className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Resolve</span>
                            </Button>
                          )}

                          <Select
                            value={report.status}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (next !== report.status) {
                                openStatusModal(report, next);
                              }
                            }}
                            className="h-7 text-[11px] w-28 bg-card border-border/80"
                            aria-label="Lifecycle action"
                          >
                            <option value={report.status} disabled>
                              Action...
                            </option>
                            {['submitted', 'under_review'].includes(report.status) && (
                              <option value="in_progress">In Progress</option>
                            )}
                            {report.status === 'in_progress' && (
                              <option value="resolved">Resolve (Photo)</option>
                            )}
                            {!['resolved', 'rejected', 'closed'].includes(report.status) && (
                              <option value="rejected">Reject</option>
                            )}
                            {user?.role === 'admin' && ['resolved', 'rejected'].includes(report.status) && (
                              <option value="in_progress">Reopen</option>
                            )}
                          </Select>

                          <Link 
                            href={`/${locale}/reports/${report._id}`}
                            className="p-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-foreground transition-colors flex items-center justify-center"
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
          onSuccess={() => {
            fetchDashboardData();
            setModalReport(null);
          }}
        />
      )}
    </div>
  );
}
