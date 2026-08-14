'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ARNavigationOverlay from '@/components/ARNavigationOverlay';
import {
  MapPin, Navigation, Loader2, AlertCircle, Target,
  Radio, Eye, ArrowRight, Radar,
  Construction, Lightbulb, Droplet, Droplets, 
  Trash2, Milestone, Trees, Bus, Wrench
} from 'lucide-react';

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  address: string;
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
  createdAt: string;
}

interface IssueWithDistance extends Issue {
  distance: number; // in meters
  bearing: number; // in degrees
}

export default function NearbyIssuesPage() {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [issues, setIssues] = useState<IssueWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDistance | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const calculateBearing = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360;
  };

  const fetchNearbyIssues = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reports/nearby?lat=${lat}&lng=${lng}&radius=5&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        const issuesWithDistance: IssueWithDistance[] = data.data.map((issue: Issue) => {
          const [issueLng, issueLat] = issue.location.coordinates;
          const distance = calculateDistance(lat, lng, issueLat, issueLng);
          const bearing = calculateBearing(lat, lng, issueLat, issueLng);

          return {
            ...issue,
            distance,
            bearing,
          };
        });

        issuesWithDistance.sort((a, b) => a.distance - b.distance);
        setIssues(issuesWithDistance);
      } else {
        setError(data.error || 'Failed to fetch nearby issues');
      }
    } catch (err: any) {
      console.error('Error fetching nearby issues:', err);
      setError(err.message || 'Failed to fetch nearby issues');
    } finally {
      setLoading(false);
    }
  };

  const updateDistances = (lat: number, lng: number) => {
    setIssues((prevIssues) =>
      prevIssues
        .map((issue) => {
          const [issueLng, issueLat] = issue.location.coordinates;
          const distance = calculateDistance(lat, lng, issueLat, issueLng);
          const bearing = calculateBearing(lat, lng, issueLat, issueLng);
          return { ...issue, distance, bearing };
        })
        .sort((a, b) => a.distance - b.distance)
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        fetchNearbyIssues(latitude, longitude);

        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: newLat, longitude: newLng } = pos.coords;
            setUserLocation({ lat: newLat, lng: newLng });
            updateDistances(newLat, newLng);
          },
          (err) => {
            console.error('Watch position error:', err);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
          }
        );

        watchIdRef.current = watchId;
        setIsTracking(true);
      },
      (err) => {
        console.error('Initial position error:', err);
        setError(err.message || 'Failed to get location');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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
    return Icon;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      under_review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      in_progress: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
    return map[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="pb-2 border-b border-border/60">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Radar className="w-6 h-6 text-primary" />
            <span>Discover Nearby Issues</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time GPS detection of reported infrastructure issues with Augmented Reality navigation
          </p>
        </div>

        {/* Location Tracking Card */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {isTracking ? (
                    <Radio className="w-5 h-5 text-primary animate-pulse" />
                  ) : (
                    <Target className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    {isTracking ? 'Active GPS Tracking' : 'GPS Device Location'}
                  </h3>
                  {userLocation ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Coordinates: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Click "Start Tracking" to detect public reports near your device
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {!isTracking ? (
                  <Button
                    onClick={startTracking}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center gap-2 px-5 py-2.5 font-medium shadow-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        <span>Start Tracking</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={stopTracking}
                    variant="outline"
                    className="w-full sm:w-auto text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    Stop Tracking
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-xs text-rose-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issues List */}
        {issues.length > 0 && (
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Nearby Issues Found ({issues.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3">
                {issues.map((issue) => {
                  const CategoryIcon = getCategoryIcon(issue.category);
                  const isVeryClose = issue.distance <= 10;

                  return (
                    <div
                      key={issue._id}
                      className={`p-4 rounded-xl border transition-all ${
                        isVeryClose
                          ? 'bg-blue-500/10 border-primary/40 shadow-xs'
                          : 'bg-secondary/40 border-border/60 hover:border-border hover:bg-secondary/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CategoryIcon className="w-4 h-4 text-primary shrink-0" />
                            <h4 className="font-semibold text-base text-foreground truncate">
                              {issue.title}
                            </h4>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2.5">
                            {issue.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(issue.status)}`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {issue.address}
                            </span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                          <div className="text-right">
                            <div className="text-lg font-bold tracking-tight text-foreground">
                              {issue.distance < 1000
                                ? `${issue.distance.toFixed(0)}m`
                                : `${(issue.distance / 1000).toFixed(2)}km`}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Distance</div>
                          </div>

                          <div className="flex items-center gap-2">
                            {userLocation && (
                              <Button
                                onClick={() => setSelectedIssue(issue)}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 text-xs shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>AR View</span>
                              </Button>
                            )}

                            <Button
                              onClick={() => router.push(`/en/reports/${issue._id}`)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No issues found */}
        {!loading && issues.length === 0 && userLocation && (
          <Card className="border border-border/80 shadow-xs">
            <CardContent className="py-16 text-center space-y-2">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <h3 className="text-base font-semibold text-foreground">No Issues Found Nearby</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                There are no open infrastructure tickets reported within a 5km radius of your location.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AR Navigation Overlay */}
      {selectedIssue && userLocation && (
        <ARNavigationOverlay
          issue={selectedIssue}
          userLocation={userLocation}
          distance={selectedIssue.distance}
          bearing={selectedIssue.bearing}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
