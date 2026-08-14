'use client';

import Navbar from '@/components/Navbar';
import HeatMapView from '@/components/HeatMapView';
import AreaStatistics from '@/components/AreaStatistics';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { MapPin, Navigation } from 'lucide-react';

interface AreaStat {
  area: string;
  totalReports: number;
  resolvedReports: number;
  resolutionRate: number;
}

export default function MapPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [areaStats, setAreaStats] = useState<AreaStat[]>([]);

  useEffect(() => {
    fetchAreaStats();
  }, []);

  const fetchAreaStats = async () => {
    try {
      const response = await fetch('/api/analytics/resolution-rate');
      const data = await response.json();
      
      if (data.success && data.data.byArea) {
        setAreaStats(data.data.byArea);
      }
    } catch (error) {
      console.error('Error fetching area stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Infrastructure Issue Map
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive geographic visualization of reported municipal issues and density heatmaps
            </p>
          </div>
          
          <Button
            onClick={() => router.push(`/${locale}/nearby-issues`)}
            className="w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 shadow-xs font-medium"
          >
            <MapPin className="w-4 h-4" />
            <span>Discover Nearby Issues</span>
          </Button>
        </div>

        {/* Heat Map Canvas Container */}
        <div className="w-full h-[680px] sm:h-[740px] md:h-[780px] rounded-2xl overflow-hidden border border-border/80 shadow-md relative bg-slate-900">
          <HeatMapView />
        </div>

        {/* Area Statistics Table & Breakdown */}
        <div className="pt-2">
          <AreaStatistics data={areaStats} />
        </div>
      </div>
    </div>
  );
}
