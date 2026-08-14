'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import IssueProgressBar from '@/components/IssueProgressBar';
import ScreenReaderAnnouncer from '@/components/ScreenReaderAnnouncer';
import { 
  FileText, Eye, Settings, CheckCircle, Lock, XCircle, 
  Circle, AlertCircle, AlertTriangle, AlertOctagon,
  Construction, Lightbulb, Droplet, Droplets, Trash2, 
  Milestone, Trees, Bus, TrafficCone, Building2, Zap, Wrench,
  Camera, ClipboardList, RotateCcw, Target, Calendar,
  User, UserCog, Mail, MapPin, Navigation, Globe,
  Satellite, Search, ArrowLeft, ThumbsUp, BarChart3,
  Clock, Building
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
  upvotedBy: string[];
  resolvedAt?: string;
  resolutionNote?: string;
  resolutionImages?: string[];
  estimatedResolutionDate?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  const icons: Record<string, any> = {
    submitted: FileText,
    under_review: Eye,
    in_progress: Settings,
    resolved: CheckCircle,
    closed: Lock,
    rejected: XCircle,
  };
  const Icon = icons[status] || FileText;
  return <Icon className="w-4 h-4" />;
};

const PriorityIcon = ({ priority }: { priority: string }) => {
  const icons: Record<string, any> = {
    low: Circle,
    medium: AlertCircle,
    high: AlertTriangle,
    urgent: AlertOctagon,
  };
  const Icon = icons[priority] || Circle;
  return <Icon className="w-4 h-4" />;
};

const CategoryIcon = ({ category }: { category: string }) => {
  const icons: Record<string, any> = {
    potholes: Construction,
    'street lights': Lightbulb,
    'water supply': Droplet,
    drainage: Droplets,
    'garbage collection': Trash2,
    'roads & pavements': Milestone,
    'parks & gardens': Trees,
    'public transport': Bus,
    'traffic signals': TrafficCone,
    'public buildings': Building2,
    roads: Milestone,
    water: Droplet,
    electricity: Zap,
    sewage: Droplets,
    streetlight: Lightbulb,
    waste: Trash2,
    transport: Bus,
    park: Trees,
    building: Building,
    other: Wrench,
  };
  const Icon = icons[category.toLowerCase()] || Wrench;
  return <Icon className="w-4 h-4" />;
};

const statusColors = {
  submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  under_review: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  in_progress: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const priorityColors = {
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reports/${reportId}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.data);
        setAnnouncement(`Report loaded: ${data.data.title}. Status: ${data.data.status}`);
      } else {
        setError(data.error || 'Report not found');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-900/90 backdrop-blur-xl border-2 border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500 text-2xl">
              <XCircle className="w-6 h-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-lg">{error || 'Report not found'}</p>
            <Button onClick={() => router.push(`/${locale}/reports`)} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              <span className="mr-2">←</span>
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const estimatedDate = report.estimatedResolutionDate 
    ? new Date(report.estimatedResolutionDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not set';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20 relative overflow-hidden">
      {/* Screen Reader Announcements */}
      <ScreenReaderAnnouncer message={announcement} />
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
      
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 py-8 relative z-10 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/reports`)}
          className="mb-6 group hover:border-blue-500/50 transition-all border-gray-700"
          aria-label="Go back to reports list"
        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
          Back to Reports
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Bar Card */}
            <Card className="p-8 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Issue Progress
              </h2>
              <IssueProgressBar status={report.status} showLabels={true} size="lg" />
            </Card>

            {/* Header Card */}
            <Card className="p-8 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
              {/* Status & Priority Badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Badge className={`${statusColors[report.status as keyof typeof statusColors]} px-4 py-2 text-sm font-semibold border-2 backdrop-blur-sm`}>
                  <span className="mr-2"><StatusIcon status={report.status} /></span>
                  {report.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge className={`${priorityColors[report.priority as keyof typeof priorityColors]} px-4 py-2 text-sm font-semibold border-2 backdrop-blur-sm`}>
                  <span className="mr-2"><PriorityIcon priority={report.priority} /></span>
                  {report.priority.toUpperCase()} PRIORITY
                </Badge>
                <Badge className="bg-cyan-500/10 text-cyan-400 border-2 border-cyan-500/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                  <span className="mr-2"><CategoryIcon category={report.category} /></span>
                  {report.category}
                </Badge>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent leading-tight">
                {report.title}
              </h1>

              {/* Description */}
              <div className="prose prose-invert max-w-none">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="w-6 h-6 mt-1" />
                    <p className="text-gray-300 leading-relaxed text-lg">{report.description}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Images Gallery */}
            {report.images && report.images.length > 0 && (
              <Card className="p-8 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <Camera className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-white">Report Images</h2>
                  <Badge className="ml-auto bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {report.images.length} {report.images.length === 1 ? 'Photo' : 'Photos'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.images.map((image: string, index: number) => (
                    <a
                      key={index}
                      href={image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
                    >
                      <img
                        src={image}
                        alt={`Report image ${index + 1}`}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-white text-sm font-semibold">View Full Size</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Resolution Details */}
            {report.status === 'resolved' && report.resolutionNote && (
              <Card className="p-8 bg-gradient-to-br from-green-900/20 to-green-800/20 backdrop-blur-xl border-2 border-green-500/30 shadow-2xl shadow-green-500/10">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-green-400">Resolution Details</h2>
                </div>
                <div className="bg-green-950/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
                  <p className="text-green-100 leading-relaxed text-lg">{report.resolutionNote}</p>
                </div>
                
                {report.resolvedAt && (
                  <div className="mt-4 flex items-center gap-2 text-green-300">
                    <Calendar className="w-5 h-5" />
                    <span>Resolved on {new Date(report.resolvedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Resolution Images */}
                {report.resolutionImages && report.resolutionImages.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                      <Camera className="w-6 h-6" />
                      After Resolution
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {report.resolutionImages.map((image: string, index: number) => (
                        <a
                          key={index}
                          href={image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square rounded-xl overflow-hidden border-2 border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105"
                        >
                          <img
                            src={image}
                            alt={`Resolution image ${index + 1}`}
                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                <BarChart3 className="w-5 h-5" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      <span className="font-semibold">Views</span>
                    </span>
                    <span className="text-xs text-gray-500 ml-7">Total views on this report</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-400">{report.viewCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5" />
                      <span className="font-semibold">Upvotes</span>
                    </span>
                    <span className="text-xs text-gray-500 ml-7">Community support count</span>
                  </div>
                  <span className="text-2xl font-bold text-cyan-400">{report.upvotes || 0}</span>
                </div>
              </div>
            </Card>

            {/* Location Card */}
            <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5" />
                Location
              </h3>
              <div className="space-y-4">
                {report.area && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Area
                    </p>
                    <p className="font-semibold text-white text-lg">{report.area}</p>
                  </div>
                )}
                {report.address && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Address
                    </p>
                    <p className="text-white leading-relaxed">{report.address}</p>
                  </div>
                )}
                {report.landmark && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Landmark
                    </p>
                    <p className="text-white leading-relaxed">{report.landmark}</p>
                  </div>
                )}
                {report.location && report.location.coordinates && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Coordinates
                    </p>
                    <p className="font-mono text-sm text-cyan-400">
                      {report.location.coordinates[1].toFixed(6)}, {report.location.coordinates[0].toFixed(6)}
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => {
                    const [lng, lat] = report.location.coordinates;
                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-blue-500/20 group"
                >
                  <Navigation className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Open in Google Maps
                </Button>
              </div>
            </Card>

            {/* Satellite View Card */}
            {report.location && report.location.coordinates && (
              <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <Satellite className="w-6 h-6" />
                  <span>Satellite View</span>
                </h3>
                <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>High-resolution aerial view of the exact location</span>
                </p>
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
                  <img
                    src={
                      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                        ? `https://maps.googleapis.com/maps/api/staticmap?center=${report.location.coordinates[1]},${report.location.coordinates[0]}&zoom=18&size=600x600&scale=2&maptype=hybrid&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                        : `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${report.location.coordinates[0]},${report.location.coordinates[1]},19,0,0/800x800@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
                    }
                    alt="Satellite view"
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-2xl animate-pulse"></div>
                      <div className="absolute inset-0 w-8 h-8 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-300" />
                      <span className="text-xs text-white font-semibold">Satellite Clarity</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      const [lng, lat] = report.location.coordinates;
                      window.open(`https://www.google.com/maps/@${lat},${lng},21z/data=!3m1!1e3`, '_blank');
                    }}
                    variant="outline"
                    className="w-full text-sm border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/10"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Google Earth
                  </Button>
                  <Button
                    onClick={() => {
                      const [lng, lat] = report.location.coordinates;
                      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                    }}
                    variant="outline"
                    className="w-full text-sm border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Google Maps
                  </Button>
                </div>
              </Card>
            )}

            {/* Reporter Info */}
            {report.reportedBy && (
              <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <User className="w-6 h-6" />
                  Reported By
                </h3>
                <div className="flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/30 transition-colors">
                  {report.reportedBy.avatar ? (
                    <img
                      src={report.reportedBy.avatar}
                      alt={report.reportedBy.name}
                      className="w-14 h-14 rounded-full border-2 border-blue-500/30 shadow-lg shadow-blue-500/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-blue-500/30 shadow-lg shadow-blue-500/20">
                      {report.reportedBy.name?.[0]?.toUpperCase() || report.reportedBy.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {report.reportedBy.name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {report.reportedBy.email}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Assigned Manager */}
            {report.assignedTo && (
              <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-purple-500/20 shadow-2xl shadow-purple-500/10 hover:border-purple-500/40 transition-all duration-300">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <UserCog className="w-6 h-6" />
                  Assigned Manager
                </h3>
                <div className="flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/30 transition-colors">
                  {report.assignedTo.avatar ? (
                    <img
                      src={report.assignedTo.avatar}
                      alt={report.assignedTo.name}
                      className="w-14 h-14 rounded-full border-2 border-purple-500/30 shadow-lg shadow-purple-500/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-purple-500/30 shadow-lg shadow-purple-500/20">
                      {report.assignedTo.name?.[0]?.toUpperCase() || report.assignedTo.email?.[0]?.toUpperCase() || 'M'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {report.assignedTo.name}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {report.assignedTo.email}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Approved By */}
            {report.approvedBy && (
              <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-green-500/20 shadow-2xl shadow-green-500/10 hover:border-green-500/40 transition-all duration-300">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  Approved By
                </h3>
                <div className="flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-green-500/30 transition-colors">
                  {report.approvedBy.avatar ? (
                    <img
                      src={report.approvedBy.avatar}
                      alt={report.approvedBy.name}
                      className="w-14 h-14 rounded-full border-2 border-green-500/30 shadow-lg shadow-green-500/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-green-500/30 shadow-lg shadow-green-500/20">
                      {report.approvedBy.name?.[0]?.toUpperCase() || report.approvedBy.email?.[0]?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {report.approvedBy.name}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {report.approvedBy.email}
                    </p>
                    {report.approvedAt && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.approvedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Initiated By */}
            {report.initiatedBy && (
              <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-cyan-500/20 shadow-2xl shadow-cyan-500/10 hover:border-cyan-500/40 transition-all duration-300">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <Settings className="w-6 h-6 text-cyan-400" />
                  Resolution Initiated By
                </h3>
                <div className="flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-cyan-500/30 transition-colors">
                  {report.initiatedBy.avatar ? (
                    <img
                      src={report.initiatedBy.avatar}
                      alt={report.initiatedBy.name}
                      className="w-14 h-14 rounded-full border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                      {report.initiatedBy.name?.[0]?.toUpperCase() || report.initiatedBy.email?.[0]?.toUpperCase() || 'I'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {report.initiatedBy.name}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {report.initiatedBy.email}
                    </p>
                    {report.initiatedAt && (
                      <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.initiatedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card className="p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                <Clock className="w-6 h-6" />
                Timeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <span>Created</span>
                    </p>
                    <p className="font-semibold text-white">{createdDate}</p>
                    <p className="text-xs text-gray-500 mt-1">Report submitted by user</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <span>Last Updated</span>
                    </p>
                    <p className="font-semibold text-white">{updatedDate}</p>
                    <p className="text-xs text-gray-500 mt-1">Most recent status change</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <span>Estimated Resolution</span>
                    </p>
                    <p className="font-semibold text-white">{estimatedDate}</p>
                    <p className="text-xs text-gray-500 mt-1">Expected completion date</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
