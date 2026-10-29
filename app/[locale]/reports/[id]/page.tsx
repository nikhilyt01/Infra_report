'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import IssueProgressBar from '@/components/IssueProgressBar';
import StatusUpdateModal from '@/components/StatusUpdateModal';
import StatusTimeline, { HistoryEntry } from '@/components/StatusTimeline';
import BeforeAfterComparison from '@/components/BeforeAfterComparison';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import 'leaflet/dist/leaflet.css';
import {
  FileText, CheckCircle, Construction, Lightbulb, Droplet,
  Droplets, Trash2, Milestone, Trees, Bus, Zap, Wrench,
  Camera, Calendar, User, UserCog, Mail, MapPin, Navigation, Globe,
  Satellite, ArrowLeft, ThumbsUp, Clock, Check, Loader2,
  AlertCircle, ShieldAlert, TrendingUp, RotateCcw, History
} from 'lucide-react';

interface Report {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  address: string;
  area?: string;
  landmark?: string;
  images: string[];
  reportedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  approvedAt?: string;
  initiatedBy?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  initiatedAt?: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  viewCount: number;
  upvotes: number;
  upvoted?: boolean; // Whether the signed-in viewer has upvoted this report
  resolvedAt?: string;
  resolutionNote?: string;
  resolutionImages?: string[];
  estimatedResolutionDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Mini Interactive Satellite Map Component
function MiniSatelliteMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;

    let mapInstance: any = null;

    import('leaflet').then((L) => {
      if (!containerRef.current) return;

      // Clean up previous leaflet instance if any
      if ((containerRef.current as any)._leaflet_id) {
        (containerRef.current as any)._leaflet_id = null;
      }

      mapInstance = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: false,
      });

      // High-resolution Google Satellite Hybrid tiles
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
        maxNativeZoom: 20,
      }).addTo(mapInstance);

      // Pulse pin marker
      const markerIcon = L.divIcon({
        className: 'custom-satellite-pin',
        html: `
          <div style="position:relative;width:18px;height:18px;">
            <div style="position:absolute;inset:0;background:#ef4444;border-radius:50%;opacity:0.75;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative;width:18px;height:18px;background:#ef4444;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 12px rgba(239,68,68,0.9);"></div>
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([lat, lng], { icon: markerIcon }).addTo(mapInstance);
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[200px] rounded-xl overflow-hidden border border-border/80 bg-slate-950 shadow-inner relative z-0 isolate"
      style={{ zIndex: 0 }}
    />
  );
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';
  const reportId = params.id as string;

  const { user } = useAuth();
  const { toast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // History / timeline state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Evidence-gated lifecycle modal state
  const [modalTargetStatus, setModalTargetStatus] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Only municipal admin and approved manager (and in Phase 4 supervisor) can perform lifecycle actions
  const isManagerOrAdmin = Boolean(
    user && (user.role === 'admin' || (user.role === 'manager' && user.isApproved))
  );

  // Supervisor permissions
  const isSupervisor = Boolean(user && user.role === 'supervisor');
  const assignedSupervisorId = report?.assignedTo
    ? (typeof report.assignedTo === 'object'
        ? (report.assignedTo as any)._id?.toString() || (report.assignedTo as any).id?.toString()
        : String(report.assignedTo))
    : null;
  const isAssignedSupervisor = Boolean(
    isSupervisor &&
    user?.isApproved &&
    assignedSupervisorId &&
    user?._id &&
    assignedSupervisorId === String(user._id)
  );

  // Can the current user see the lifecycle controls card at all?
  const canSeeControls = isManagerOrAdmin || (isSupervisor && user?.isApproved);

  const handleApprove = async () => {
    if (!user || !report) return;
    setIsActionLoading(true);
    try {
      const response = await fetch(`/api/reports/${report._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: user._id,
          status: 'under_review',
          note: 'Report verified and approved by municipal manager',
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Report approved and moved to Under Review', 'Report Approved');
        setReport(data.data);
      } else {
        toast.error(data.error || 'Failed to approve report');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error approving report');
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchHistory();
  }, [reportId]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reports/${reportId}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.data);
        // Hydrate the button from the server, otherwise a reload always shows
        // "not upvoted" and the next click would silently remove your vote.
        setUpvoted(Boolean(data.data.upvoted));
      } else {
        setError(data.error || 'Report ticket not found');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report ticket');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/history`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!report || upvoteLoading) return;
    setUpvoteLoading(true);
    try {
      const res = await fetch(`/api/reports/${report._id}/upvote`, { method: 'POST' });

      // Upvoting requires an account — send guests to sign in.
      if (res.status === 401) {
        router.push(`/${locale}/login?message=login_required&redirect=/${locale}/reports/${report._id}`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        // Trust the server's count and priority rather than adjusting by ±1,
        // so the UI can't drift from the database.
        setReport(prev =>
          prev
            ? { ...prev, upvotes: data.data.upvotes, priority: data.data.priority }
            : null
        );
        setUpvoted(data.data.upvoted);

        if (data.data.escalated) {
          toast.success(`Priority auto-escalated to ${data.data.priority.toUpperCase()} due to high community demand!`, 'Community Escalation');
          fetchHistory();
        } else {
          toast.info(data.data.upvoted ? 'Upvoted! Thank you for supporting this issue.' : 'Upvote removed', 'Report Feedback');
        }
      }
    } catch (e) {
      console.error('Upvote error:', e);
    } finally {
      setUpvoteLoading(false);
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

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      potholes: Construction,
      'street lights': Lightbulb,
      'water supply': Droplet,
      drainage: Droplets,
      'garbage collection': Trash2,
      'roads & pavements': Milestone,
      'parks & gardens': Trees,
      'public transport': Bus,
      roads: Milestone,
      water: Droplet,
      electricity: Zap,
      streetlight: Lightbulb,
      waste: Trash2,
    };
    const Icon = icons[category.toLowerCase()] || Wrench;
    return <Icon className="w-4 h-4 text-primary" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border border-border/80 shadow-md p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Report Not Found</h3>
              <p className="text-xs text-muted-foreground">{error || 'This ticket may have been removed or is unavailable.'}</p>
            </div>
            <Button onClick={() => router.push(`/${locale}/reports`)} className="w-full text-xs">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Return to All Reports
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const [lng, lat] = report.location?.coordinates || [0, 0];
  const hasValidLocation = lat !== 0 && lng !== 0;

  const createdDate = new Date(report.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const updatedDate = new Date(report.updatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1">
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href={`/${locale}/reports`} className="hover:text-foreground transition-colors">
                Reports
              </Link>
              <span>/</span>
              <span className="text-foreground font-mono">#{report._id.substring(report._id.length - 6)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground line-clamp-1">
              {report.title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handleUpvote}
              disabled={upvoteLoading}
              variant="outline"
              size="sm"
              className={`flex items-center gap-1.5 text-xs font-semibold ${upvoted ? 'bg-primary/10 text-primary border-primary/30' : ''
                }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${upvoted ? 'fill-primary text-primary' : ''}`} />
              <span>{report.upvotes || 0} Upvotes</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${locale}/reports`)}
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Progress Bar Card */}
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardHeader className="p-5 pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold flex items-center justify-between text-foreground">
                  <span>Resolution Lifecycle</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(report.status)}`}>
                    {report.status.replace('_', ' ').toUpperCase()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <IssueProgressBar status={report.status} showLabels={true} size="lg" />

                {/* Manager/Admin/Supervisor Lifecycle Action Controls */}
                {canSeeControls && (
                  <div className="pt-4 mt-4 border-t border-border/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                        <span>Authorized Lifecycle Controls</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isAssignedSupervisor && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Assigned Supervisor
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono capitalize">
                          {user?.role}
                        </span>
                      </div>
                    </div>

                    {/* If supervisor but NOT assigned to this report, show warning */}
                    {isSupervisor && !isAssignedSupervisor && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed">
                          This work order is not assigned to your queue. Only the assigned field supervisor or municipal manager can make changes.
                        </p>
                      </div>
                    )}

                    {/* Only show action buttons if manager/admin OR if supervisor is assigned */}
                    {(isManagerOrAdmin || isAssignedSupervisor) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {report.status === 'submitted' && (
                          <>
                            {/* Only managers/admins can approve reports */}
                            {isManagerOrAdmin && (
                              <Button
                                size="sm"
                                onClick={handleApprove}
                                disabled={isActionLoading}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Report</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalTargetStatus('in_progress')}
                              className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
                            >
                              Start Work (In Progress)
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalTargetStatus('rejected')}
                              className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            >
                              Reject Report
                            </Button>
                          </>
                        )}

                        {report.status === 'under_review' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setModalTargetStatus('in_progress')}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-medium"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Start Field Work (In Progress)</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalTargetStatus('rejected')}
                              className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            >
                              Reject Report
                            </Button>
                          </>
                        )}

                        {report.status === 'in_progress' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setModalTargetStatus('resolved')}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-semibold shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Resolve Issue (Upload Photo Evidence)</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalTargetStatus('rejected')}
                              className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            >
                              Reject Report
                            </Button>
                          </>
                        )}

                        {['resolved', 'rejected'].includes(report.status) && (
                          <>
                            {user?.role === 'admin' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setModalTargetStatus('in_progress')}
                                className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 font-medium"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reopen Ticket (Admin Audit)</span>
                              </Button>
                            ) : (
                              <p className="text-[11px] text-muted-foreground italic">
                                Report finalized. Only system administrators can reopen resolved or rejected reports.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Issue Details Card */}
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Badges Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadge(report.status)}`}>
                    {report.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border uppercase ${getPriorityBadge(report.priority)}`}>
                    {report.priority} PRIORITY
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-foreground border border-border/60 flex items-center gap-1.5 capitalize">
                    {getCategoryIcon(report.category)}
                    <span>{report.category}</span>
                  </span>
                </div>

                {/* Title & Description */}
                <div className="space-y-2 pt-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {report.title}
                  </h2>
                  <div className="p-4 bg-secondary/40 rounded-xl border border-border/60 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {report.description}
                  </div>
                </div>

                {/* Photo Evidence Gallery */}
                {report.images && report.images.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-primary" />
                        <span>Live Photo Evidence ({report.images.length})</span>
                      </h3>
                      <span className="text-[11px] text-muted-foreground">Click to view full size</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {report.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedImage(img)}
                          className="relative aspect-video rounded-lg overflow-hidden border border-border/80 bg-secondary/50 cursor-pointer group shadow-xs hover:border-primary transition-all"
                        >
                          <img
                            src={img}
                            alt={`Evidence #${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                            Photo #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Completion Note */}
                {report.status === 'resolved' && report.resolutionNote && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Resolution Completed</span>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {report.resolutionNote}
                    </p>
                    {report.resolvedAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Resolved on {new Date(report.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Before / After Comparison (only for resolved reports) */}
            {report.status === 'resolved' && report.resolutionImages && report.resolutionImages.length > 0 && (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardContent className="p-5 sm:p-6">
                  <BeforeAfterComparison
                    beforeImages={report.images || []}
                    afterImages={report.resolutionImages}
                    resolvedAt={report.resolvedAt}
                    resolutionNote={report.resolutionNote}
                  />
                </CardContent>
              </Card>
            )}

            {/* Dynamic Timeline & Audit History */}
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardHeader className="p-5 pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <span>Audit Trail & Timeline</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {history.length} {history.length === 1 ? 'entry' : 'entries'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {/* Summary stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="p-3 bg-secondary/40 rounded-lg border border-border/60 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Submitted On</p>
                    <p className="text-xs font-bold text-foreground">{createdDate}</p>
                    <p className="text-[10px] text-muted-foreground">Citizen creation</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-lg border border-border/60 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Last Status Update</p>
                    <p className="text-xs font-bold text-foreground">{updatedDate}</p>
                    <p className="text-[10px] text-muted-foreground">Municipal activity</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-lg border border-border/60 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target Resolution</p>
                    <p className="text-xs font-bold text-primary">
                      {report.estimatedResolutionDate
                        ? new Date(report.estimatedResolutionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Standard SLA'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Expected delivery</p>
                  </div>
                </div>

                {/* Dynamic Timeline */}
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading timeline...</span>
                  </div>
                ) : (
                  <StatusTimeline
                    history={history}
                    onImageClick={(url) => setSelectedImage(url)}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Satellite & Aerial Map Card */}
            <Card className="border border-border/80 shadow-xs bg-card overflow-hidden relative z-0 isolate">
              <CardHeader className="p-5 pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Satellite className="w-4 h-4 text-primary" />
                    <span>High-Res Satellite View</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Zoom: 17x</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {hasValidLocation ? (
                  <>
                    {/* Live Satellite Mini Map Viewport */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-slate-950 shadow-inner z-0 isolate">
                      <MiniSatelliteMap lat={lat} lng={lng} />

                      <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded pointer-events-none z-10">
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                      </div>
                    </div>

                    {/* Map Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
                        className="text-xs flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-primary" />
                        <span>Google Maps</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/maps/@${lat},${lng},21z/data=!3m1!1e3`, '_blank')}
                        className="text-xs flex items-center justify-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        <span>Earth 3D</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Location coordinates not recorded for this report.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Geographic Address Card */}
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardHeader className="p-5 pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Location & Ward Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Street Address</p>
                  <p className="text-foreground font-medium mt-0.5 leading-relaxed">{report.address}</p>
                </div>

                {report.area && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ward / Suburb</p>
                    <p className="text-foreground font-semibold mt-0.5">{report.area}</p>
                  </div>
                )}

                {report.landmark && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Landmark</p>
                    <p className="text-foreground mt-0.5">{report.landmark}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reporter Profile Card */}
            {report.reportedBy && (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardHeader className="p-5 pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <User className="w-4 h-4 text-primary" />
                    <span>Reported By Citizen</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                      {report.reportedBy.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{report.reportedBy.name || 'Citizen'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{report.reportedBy.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Municipal Operations Team Card */}
            {(report.approvedBy || report.assignedTo || report.initiatedBy) && (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardHeader className="p-5 pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <UserCog className="w-4 h-4 text-primary" />
                    <span>Municipal Response Team</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs">
                  {report.approvedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Officer Approved:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {report.approvedBy.name}
                      </span>
                    </div>
                  )}

                  {report.initiatedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Repair Initiated By:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {report.initiatedBy.name}
                      </span>
                    </div>
                  )}

                  {report.assignedTo && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assigned Manager:</span>
                      <span className="font-semibold text-foreground">
                        {report.assignedTo.name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={selectedImage}
              alt="Full size evidence"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Evidence-Gated Status Update Modal */}
      {modalTargetStatus && report && (
        <StatusUpdateModal
          isOpen={Boolean(modalTargetStatus)}
          onClose={() => setModalTargetStatus(null)}
          reportId={report._id}
          reportTitle={report.title}
          currentStatus={report.status}
          targetStatus={modalTargetStatus}
          onSuccess={(updatedReport) => {
            setReport(updatedReport);
            setModalTargetStatus(null);
            fetchReport();
            fetchHistory();
          }}
        />
      )}
    </div>
  );
}
