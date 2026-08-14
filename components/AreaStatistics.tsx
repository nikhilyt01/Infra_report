'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, FileText, CheckCircle, Clock, BarChart3,
  Eye, Construction, Lightbulb, Droplet, Droplets, 
  Trash2, Milestone, Trees, Bus, Wrench, Calendar, 
  ThumbsUp, X, Mail
} from 'lucide-react';

interface AreaStat {
  area: string;
  totalReports: number;
  resolvedReports: number;
  resolutionRate: number;
}

interface Report {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  address: string;
  area: string;
  createdAt: string;
  upvotes: number;
}

interface AreaStatisticsProps {
  data: AreaStat[];
  title?: string;
}

export default function AreaStatistics({ data, title = 'Statistics by Area' }: AreaStatisticsProps) {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaReports, setAreaReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchAreaReports = async (area: string) => {
    setLoadingReports(true);
    try {
      const response = await fetch(`/api/reports?area=${encodeURIComponent(area)}`);
      const result = await response.json();
      
      if (result.success) {
        setAreaReports(result.data);
        setSelectedArea(area);
      }
    } catch (error) {
      console.error('Error fetching area reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const closeModal = () => {
    setSelectedArea(null);
    setAreaReports([]);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      under_review: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      in_progress: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };
    return map[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      urgent: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    };
    return map[priority] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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
      electricity: Lightbulb,
      streetlight: Lightbulb,
      waste: Trash2,
    };
    const Icon = icons[category.toLowerCase()] || Wrench;
    return <Icon className="w-4 h-4 text-primary shrink-0" />;
  };

  if (!data || data.length === 0) {
    return (
      <Card className="border border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No area statistics available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {data.map((stat, index) => (
              <div
                key={index}
                onClick={() => fetchAreaReports(stat.area)}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/60 hover:border-border transition-all cursor-pointer group shadow-2xs"
              >
                {/* Left Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {stat.area}
                    </h4>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      stat.resolutionRate >= 80 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : stat.resolutionRate >= 60 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}>
                      {stat.resolutionRate.toFixed(0)}% Resolved
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Total: <strong className="text-foreground">{stat.totalReports}</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Resolved: <strong className="text-foreground">{stat.resolvedReports}</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pending: <strong className="text-foreground">{stat.totalReports - stat.resolvedReports}</strong></span>
                    </span>
                  </div>
                </div>

                {/* Right Progress Bar */}
                <div className="w-full sm:w-36 flex flex-col justify-center shrink-0">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        stat.resolutionRate >= 80
                          ? 'bg-emerald-500'
                          : stat.resolutionRate >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${stat.resolutionRate}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 text-right font-medium">
                    {stat.resolvedReports}/{stat.totalReports} completed
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Row */}
          <div className="mt-6 pt-5 border-t border-border/60">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 rounded-lg bg-secondary/40 border border-border/40">
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {data.reduce((sum, stat) => sum + stat.totalReports, 0)}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Total Reports</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/40 border border-border/40">
                <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {data.reduce((sum, stat) => sum + stat.resolvedReports, 0)}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Resolved</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/40 border border-border/40">
                <p className="text-2xl font-bold tracking-tight text-primary">
                  {(
                    (data.reduce((sum, stat) => sum + stat.resolvedReports, 0) /
                      Math.max(1, data.reduce((sum, stat) => sum + stat.totalReports, 0))) *
                    100
                  ).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Average Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for Area Reports */}
      {selectedArea && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-b border-border p-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>{selectedArea} Reports</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed list of all infrastructure issues filed in this locality
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-120px)]">
              {loadingReports ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <p className="text-xs text-muted-foreground mt-3">Loading reports...</p>
                </div>
              ) : areaReports.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Mail className="w-5 h-5" />
                    No reports found in this area
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {areaReports.map((report) => (
                    <div
                      key={report._id}
                      onClick={() => router.push(`/en/reports/${report._id}`)}
                      className="bg-secondary/40 border border-border/80 hover:border-primary/40 rounded-xl p-4 cursor-pointer transition-all hover:bg-secondary/80 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {getCategoryIcon(report.category)}
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {report.title}
                            </h3>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {report.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(report.status)}`}>
                              {report.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getPriorityBadge(report.priority)}`}>
                              {report.priority}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {report.address}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
