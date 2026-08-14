'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Plus, Search, Filter, MapPin, Calendar, User, ThumbsUp, ArrowUpRight } from 'lucide-react';

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
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  upvotes: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
  });

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);

      const response = await fetch(`/api/reports?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        let filteredReports = data.data;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredReports = filteredReports.filter((report: Report) =>
            report.title.toLowerCase().includes(searchLower) ||
            report.description.toLowerCase().includes(searchLower) ||
            report.category.toLowerCase().includes(searchLower) ||
            report.address.toLowerCase().includes(searchLower)
          );
        }

        setReports(filteredReports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
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
    return map[status] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    };
    return map[priority] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Infrastructure Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Explore, filter, and track public municipal infrastructure tickets
            </p>
          </div>
          <Button
            onClick={() => router.push(`/${locale}/reports/new`)}
            className="flex items-center gap-2 px-4 py-2.5 shadow-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Report</span>
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Filter className="w-4 h-4 text-primary" />
              Filter Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-1.5">
                <Label htmlFor="search" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Search Title / Address
                </Label>
                <Input
                  id="search"
                  placeholder="Search keywords..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full h-9 text-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-medium text-muted-foreground">
                  Status
                </Label>
                <Select
                  id="status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full h-9 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-medium text-muted-foreground">
                  Category
                </Label>
                <Input
                  id="category"
                  placeholder="e.g. Roads, Water, Lighting..."
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            <p className="text-xs text-muted-foreground mt-3">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="border border-border/80 shadow-xs">
            <CardContent className="py-16 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No reports match the selected filters.</p>
              <Button onClick={() => router.push(`/${locale}/reports/new`)} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Submit a Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((report) => (
              <Card
                key={report._id}
                className="border border-border/80 hover:border-border hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col bg-card group"
                onClick={() => router.push(`/${locale}/reports/${report._id}`)}
              >
                {/* Image */}
                {report.images && report.images.length > 0 && (
                  <div className="w-full h-44 bg-muted relative overflow-hidden border-b border-border/60">
                    <img
                      src={report.images[0]}
                      alt={report.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1">
                      {report.title}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getPriorityBadge(report.priority)}`}>
                      {report.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-muted-foreground border border-border/60 capitalize">
                      {report.category}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{report.address}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <ThumbsUp className="w-3.5 h-3.5 text-primary" /> {report.upvotes || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
