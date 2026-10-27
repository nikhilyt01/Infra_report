'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import StatusUpdateModal from '@/components/StatusUpdateModal';
import IssueProgressBar from '@/components/IssueProgressBar';
import {
  ClipboardCheck, MapPin, Navigation, Camera, Clock,
  CheckCircle2, AlertCircle, RotateCcw, Wrench, ShieldAlert,
  Copy, Check, ArrowUpRight, Loader2, Sparkles, User, ExternalLink
} from 'lucide-react';

interface AssignedReport {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  address: string;
  area?: string;
  landmark?: string;
  images?: string[];
  resolutionImages?: string[];
  resolutionNote?: string;
  createdAt: string;
  upvotes: number;
  reportedBy?: { name: string; email: string };
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

// Haversine distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m away`;
  }
  return `${(meters / 1000).toFixed(1)}km away`;
}

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const { user, loading: authLoading, checkAuth } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Supervisor Coordinates
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Status Modal State
  const [modalReport, setModalReport] = useState<{
    id: string;
    title: string;
    currentStatus: string;
    targetStatus: string;
    reportLocation?: [number, number];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, authLoading, router, locale]);

  useEffect(() => {
    if (user && user.isApproved) {
      fetchAssignedTasks();
      acquireLocation();
    }
  }, [user]);

  const acquireLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by device');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationError('GPS permission denied or unavailable');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const fetchAssignedTasks = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?assignedTo=${user._id}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setReports(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch assigned tasks:', e);
      toast.error('Could not load assigned tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          note: `Field supervisor ${user?.name || ''} initiated on-site repair work.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Work order moved to In Progress!', 'Work Started');
        fetchAssignedTasks();
      } else {
        toast.error(data.error || 'Failed to start work');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  // Distance annotated and sorted reports
  const annotatedReports = useMemo(() => {
    return reports.map((rep) => {
      let distanceMeters: number | null = null;
      if (userCoords && rep.location?.coordinates) {
        const [repLng, repLat] = rep.location.coordinates;
        distanceMeters = calculateDistance(userCoords.lat, userCoords.lng, repLat, repLng);
      }
      return { ...rep, distanceMeters };
    });
  }, [reports, userCoords]);

  const filteredReports = useMemo(() => {
    let list = annotatedReports;
    if (activeTab === 'pending') {
      list = list.filter((r) => r.status === 'under_review' || r.status === 'submitted');
    } else if (activeTab === 'in_progress') {
      list = list.filter((r) => r.status === 'in_progress');
    } else if (activeTab === 'resolved') {
      list = list.filter((r) => r.status === 'resolved');
    }

    // Sort: Nearest first if GPS active, otherwise active tasks first
    return list.sort((a, b) => {
      if (a.distanceMeters !== null && b.distanceMeters !== null) {
        return a.distanceMeters - b.distanceMeters;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [annotatedReports, activeTab]);

  const metrics = useMemo(() => {
    const total = reports.length;
    const inProgress = reports.filter((r) => r.status === 'in_progress').length;
    const pending = reports.filter((r) => r.status === 'under_review' || r.status === 'submitted').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return { total, inProgress, pending, resolved };
  }, [reports]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-2">Authenticating supervisor...</p>
      </div>
    );
  }

  // Pending Approval Gate Screen
  if (user && user.role === 'supervisor' && !user.isApproved) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-2 border-amber-500/40 shadow-xl bg-card text-center p-6 sm:p-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Pending Municipal Approval
              </span>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                Supervisor Account Inactive
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Welcome, <span className="font-semibold text-foreground">{user.name}</span>. Your field supervisor account for <span className="font-semibold text-foreground">{user.department || 'Maintenance'}</span> must be approved by your Municipal Manager before you can receive work orders.
              </p>
            </div>

            {/* Supervisor ID Card */}
            <div className="p-4 bg-secondary/60 rounded-xl border border-border/80 space-y-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Your Unique Supervisor ID
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-black text-amber-500 tracking-wider">
                  {user.supervisorCode || 'Generating...'}
                </span>
                {user.supervisorCode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(user.supervisorCode || '');
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                      toast.success('Supervisor ID copied to clipboard!');
                    }}
                    className="h-8 px-2.5 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Give this ID to your Municipal Manager. They can search and approve you immediately in their Manager Portal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await checkAuth();
                  toast.info('Checking approval status...');
                }}
                className="text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Check Approval Status</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(`/${locale}`)}
                className="text-xs"
              >
                Return to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-amber-500/30">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                <span>Field Operations</span>
              </span>
              {user?.department && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                  {user.department}
                </span>
              )}
              {user?.supervisorCode && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-background border border-border/80 text-foreground">
                  ID: {user.supervisorCode}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-amber-500 shrink-0" />
              <span>My Assigned Work Orders</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Direct field queue for on-site infrastructure inspection, repair, and live evidence resolution.
            </p>
          </div>

          {/* GPS Quick Action */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={acquireLocation}
              disabled={locating}
              className="text-xs gap-1.5 border-border/80"
              title="Acquire live GPS coordinates to calculate proximity to tasks"
            >
              {locating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <MapPin className={`w-3.5 h-3.5 ${userCoords ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              )}
              <span>
                {userCoords ? 'GPS Active' : 'Acquire GPS'}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAssignedTasks}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Assigned</p>
              <p className="text-2xl font-black text-foreground">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-amber-500">Pending Start</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.pending}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-indigo-500">In Progress</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{metrics.inProgress}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-emerald-500">Resolved</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.resolved}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-2 overflow-x-auto">
          {[
            { id: 'all', label: `All Tasks (${metrics.total})` },
            { id: 'pending', label: `Pending Start (${metrics.pending})` },
            { id: 'in_progress', label: `In Progress (${metrics.inProgress})` },
            { id: 'resolved', label: `Completed (${metrics.resolved})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-xs text-muted-foreground">Loading assigned work orders...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card rounded-2xl border border-dashed border-border/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No work orders in this view</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeTab === 'all'
                ? 'Your manager has not assigned any reports to your queue yet. Check back soon or contact your municipal manager.'
                : 'No tasks match the selected filter tab.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => {
              const [repLng, repLat] = report.location?.coordinates || [0, 0];
              const isNearby = report.distanceMeters !== null && report.distanceMeters <= 200;

              return (
                <Card
                  key={report._id}
                  className="border border-border/80 hover:border-amber-500/50 shadow-xs hover:shadow-md transition-all bg-card overflow-hidden flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              report.status === 'resolved'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : report.status === 'in_progress'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {report.status.replace('_', ' ')}
                          </span>

                          {/* Priority Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              report.priority === 'urgent'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : report.priority === 'high'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {report.priority}
                          </span>

                          {/* Category Badge */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground border border-border/60">
                            {report.category}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-foreground line-clamp-1 hover:text-primary transition-colors">
                          <Link href={`/${locale}/reports/${report._id}`}>
                            {report.title}
                          </Link>
                        </h3>
                      </div>

                      {/* Distance Badge */}
                      {report.distanceMeters !== null && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold shrink-0 border ${
                            isNearby
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse'
                              : 'bg-secondary text-muted-foreground border-border/60'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          <span>{isNearby ? 'On Site' : formatDistance(report.distanceMeters)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {report.description}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {/* Location Address */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-1">{report.address}</span>
                    </div>

                    {/* Image preview thumbnail if available */}
                    {report.images && report.images.length > 0 && (
                      <div className="flex gap-2">
                        {report.images.slice(0, 3).map((img, idx) => (
                          <div key={idx} className="w-16 h-12 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-secondary">
                            <img src={img} alt="Original issue" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Progress Indicator */}
                    <IssueProgressBar status={report.status} showLabels={false} size="sm" />

                    {/* Action Buttons Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                      {/* Navigate external link */}
                      {repLat !== 0 && repLng !== 0 ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${repLat},${repLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Directions</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No coordinates</span>
                      )}

                      {/* Action buttons based on lifecycle */}
                      <div className="flex items-center gap-2">
                        {/* Start Work button */}
                        {['submitted', 'under_review'].includes(report.status) && (
                          <Button
                            size="sm"
                            onClick={() => handleStartWork(report._id)}
                            className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Start Work</span>
                          </Button>
                        )}

                        {/* Resolve button (geo-fenced live camera) */}
                        {report.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setModalReport({
                                id: report._id,
                                title: report.title,
                                currentStatus: report.status,
                                targetStatus: 'resolved',
                                reportLocation: report.location?.coordinates,
                              })
                            }
                            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Resolve on Site</span>
                          </Button>
                        )}

                        {/* Resolved indicator */}
                        {report.status === 'resolved' && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Resolved</span>
                          </span>
                        )}

                        {/* View full ticket */}
                        <Link
                          href={`/${locale}/reports/${report._id}`}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="View public details"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Strict Geo-Fenced Resolution Modal with Live Camera Only */}
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
            setModalReport(null);
            fetchAssignedTasks();
            toast.success('Work order resolved with verified on-site evidence!', 'Resolved Successfully');
          }}
        />
      )}
    </div>
  );
}
