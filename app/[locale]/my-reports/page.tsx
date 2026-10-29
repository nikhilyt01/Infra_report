'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ThumbsUp,
  Building2,
  BarChart3,
  Loader2,
  Plus,
  ArrowUpRight,
  FolderOpen,
  CheckCircle as CheckCircleIcon
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
  images: string[];
  createdAt: string;
  viewCount: number;
  upvotes: number;
  reportedBy?: { name: string; email: string };
  assignedTo?: { name: string; email: string };
  latestStatusNote?: string;
  resolutionImages?: string[];
  resolvedAt?: string;
}

interface CityStats {
  city: string;
  area: string;
  totalCityIssues: number;
  statusBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  areaStats?: {
    totalAreaIssues: number;
    statusBreakdown: Record<string, number>;
  };
}

const statusConfig: Record<string, { label: string; badge: string; progressColor: string; icon: any }> = {
  submitted: { 
    label: 'Submitted', 
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', 
    progressColor: 'bg-blue-500',
    icon: FileText 
  },
  under_review: { 
    label: 'Under Review', 
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', 
    progressColor: 'bg-amber-500',
    icon: Clock 
  },
  in_progress: { 
    label: 'In Progress', 
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', 
    progressColor: 'bg-indigo-500',
    icon: TrendingUp 
  },
  resolved: { 
    label: 'Resolved', 
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', 
    progressColor: 'bg-emerald-500',
    icon: CheckCircle 
  },
  closed: { 
    label: 'Closed', 
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', 
    progressColor: 'bg-slate-500',
    icon: XCircle 
  },
  rejected: { 
    label: 'Rejected', 
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
    progressColor: 'bg-rose-500',
    icon: AlertCircle 
  },
};

const priorityBadges: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

export default function MyReportsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [cityStats, setCityStats] = useState<CityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'under_review' | 'in_progress' | 'resolved'>('all');
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) {
      router.push(`/${locale}/login?message=login_required&redirect=/${locale}/my-reports`);
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const reportsRes = await fetch(`/api/reports/my-reports?status=${activeTab}`);
      const reportsData = await reportsRes.json();
      
      if (reportsData.success) {
        setMyReports(reportsData.reports);
        setCounts(reportsData.counts || {});
      }
      
      const cityRes = await fetch('/api/reports/city-stats');
      const cityData = await cityRes.json();
      
      if (cityData.success) {
        setCityStats(cityData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">My Reports</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              My Submitted Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Track real-time resolution updates and municipal progress on your reported tickets
            </p>
          </div>

          <Button
            onClick={() => router.push(`/${locale}/reports/new`)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 shadow-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Issue</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading your reports & analytics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left/Main Column - Reports */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/60">
                {[
                  { key: 'all', label: 'All Reports' },
                  { key: 'submitted', label: 'Submitted' },
                  { key: 'under_review', label: 'Under Review' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'resolved', label: 'Resolved' },
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  const count = counts[tab.key] ?? (tab.key === 'all' ? myReports.length : 0);

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-card text-foreground font-semibold shadow-xs border border-border/80'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Reports List */}
              {myReports.length === 0 ? (
                <Card className="border border-border/80 shadow-xs">
                  <CardContent className="p-16 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">No reports found in this tab</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {activeTab === 'all'
                          ? "You haven't filed any infrastructure reports yet."
                          : `No reports currently under "${activeTab.replace('_', ' ')}" status.`}
                      </p>
                    </div>
                    <Button onClick={() => router.push(`/${locale}/reports/new`)} size="sm">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Create New Report
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {myReports.map((report) => {
                    const statusInfo = statusConfig[report.status] || statusConfig.submitted;
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <Card
                        key={report._id}
                        onClick={() => router.push(`/${locale}/reports/${report._id}`)}
                        className="border border-border/80 hover:border-border hover:shadow-md transition-all cursor-pointer bg-card overflow-hidden group"
                      >
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {/* Image Thumbnail */}
                            {report.images && report.images.length > 0 && (
                              <div className="w-full sm:w-32 h-28 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/60">
                                <img
                                  src={report.images[0]}
                                  alt={report.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            
                            {/* Card Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {report.title}
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${priorityBadges[report.priority] || priorityBadges.medium}`}>
                                    {report.priority.toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${statusInfo.badge}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    <span>{statusInfo.label}</span>
                                  </span>
                                </div>
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {report.description}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
                                <div className="flex items-center gap-1 truncate max-w-[200px]">
                                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate">{report.address}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>{formatDate(report.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{report.upvotes || 0} upvotes</span>
                                </div>
                              </div>

                              {/* Latest status note */}
                              {report.latestStatusNote && (
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
                                  &ldquo;{report.latestStatusNote}&rdquo;
                                </p>
                              )}

                              {/* Resolved badge with thumbnail */}
                              {report.status === 'resolved' && (
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                    <CheckCircleIcon className="w-3 h-3" />
                                    Resolved
                                  </span>
                                  {report.resolutionImages && report.resolutionImages.length > 0 && (
                                    <div className="w-8 h-8 rounded-md overflow-hidden border border-emerald-500/30 shrink-0">
                                      <img
                                        src={report.resolutionImages[0]}
                                        alt="After"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-muted-foreground border border-border/60 capitalize">
                                    {report.category}
                                  </span>
                                  {report.area && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-muted-foreground border border-border/60">
                                      {report.area}
                                    </span>
                                  )}
                                </div>

                                <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                  <span>Details</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column - City & Area Statistics */}
            <div className="space-y-4">
              {/* City Overview Card */}
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="p-5 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Locality Profile</p>
                      <h3 className="text-lg font-bold text-foreground truncate">
                        {cityStats?.city || 'Local Municipal Ward'}
                      </h3>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg border border-border/60 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">City Tickets</p>
                      <p className="text-xl font-bold text-foreground mt-0.5">{cityStats?.totalCityIssues || 0}</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-border/60 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Ward Issues</p>
                      <p className="text-xl font-bold text-primary mt-0.5">{cityStats?.areaStats?.totalAreaIssues || myReports.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Breakdown Card */}
              {cityStats && cityStats.statusBreakdown && (
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-5 pb-3 border-b border-border/60">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span>Citywide Resolution Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {Object.entries(cityStats.statusBreakdown).map(([status, count]) => {
                      const config = statusConfig[status];
                      if (!config) return null;
                      
                      const StatusIcon = config.icon;
                      const percentage = Math.round((count / Math.max(1, cityStats.totalCityIssues)) * 100);
                      
                      return (
                        <div key={status} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-foreground">
                              <StatusIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium">{config.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{count}</span>
                              <span className="text-[10px] text-muted-foreground">({percentage}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-secondary rounded-full overflow-hidden h-1.5">
                            <div
                              className={`h-full ${config.progressColor} rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Top Categories Breakdown */}
              {cityStats && cityStats.categoryBreakdown && Object.keys(cityStats.categoryBreakdown).length > 0 && (
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-5 pb-3 border-b border-border/60">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Top Reported Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-2">
                    {Object.entries(cityStats.categoryBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([category, count], index) => (
                        <div
                          key={category}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-muted-foreground font-bold">#{index + 1}</span>
                            <span className="font-medium text-foreground truncate capitalize">{category}</span>
                          </div>
                          <Badge variant="secondary" className="text-[11px] font-mono shrink-0">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
