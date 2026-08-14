'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  Navigation2, MapPin, AlertCircle, Compass,
  Construction, Lightbulb, Droplet, Droplets, 
  Trash2, Milestone, Trees, Bus, Wrench, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Extend DeviceOrientationEvent for iOS webkit properties
interface DeviceOrientationEventWithWebkit extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

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

interface ARNavigationOverlayProps {
  issue: Issue;
  userLocation: { lat: number; lng: number };
  distance: number; // in meters
  bearing: number; // in degrees
  onClose: () => void;
}

export default function ARNavigationOverlay({
  issue,
  userLocation,
  distance,
  bearing,
  onClose
}: ARNavigationOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState<number>(0);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);

  // Bulletproof camera stop function
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const eventWithWebkit = event as DeviceOrientationEventWithWebkit;
    
    if (event.alpha !== null) {
      let heading = event.alpha;
      
      if (eventWithWebkit.webkitCompassHeading !== undefined) {
        heading = eventWithWebkit.webkitCompassHeading;
      } else {
        heading = 360 - event.alpha;
      }
      
      setDeviceOrientation(heading);
      setCompassHeading(heading);
    }
  }, []);

  const requestCompassPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setNeedsPermission(false);
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      } catch (e) {
        console.error('Error granting orientation permission:', e);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Request camera access
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Camera access error:', err);
          setCameraError(err.message || 'Failed to access phone camera');
        }
      }
    };

    startCamera();

    // Check device orientation support
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        // iOS 13+ requires user gesture
        setNeedsPermission(true);
      } else {
        // Android and standard browsers
        window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    return () => {
      isMounted = false;
      stopCamera();
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any);
    };
  }, [stopCamera, handleOrientation]);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      under_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return colors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  // Calculate arrow rotation relative to phone compass heading
  const arrowRotation = bearing - deviceOrientation;
  let relativeAngle = arrowRotation;
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;
  
  const VIEWING_ANGLE = 45;
  const isInView = Math.abs(relativeAngle) <= VIEWING_ANGLE;
  const CategoryIcon = getCategoryIcon(issue.category);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden select-none touch-none">
      {/* Camera Live Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* iOS Compass Permission Request Banner */}
      {needsPermission && (
        <div className="absolute top-16 left-4 right-4 z-50 pointer-events-auto flex justify-center">
          <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 max-w-sm w-full">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />
              <div>
                <p className="text-xs font-semibold text-white">Enable iPhone Compass</p>
                <p className="text-[10px] text-slate-300">Tap to sync device gyro sensors</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={requestCompassPermission}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 h-auto font-medium shadow-xs shrink-0"
            >
              Enable
            </Button>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50 pointer-events-auto">
          <Card className="max-w-md w-full bg-slate-900 border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Camera Access Error</h3>
            <p className="text-sm text-slate-400">{cameraError}</p>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Close View
            </button>
          </Card>
        </div>
      )}

      {/* AR HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Directional Guidance Arrow */}
        {isInView ? (
          <>
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                style={{ 
                  transform: `rotate(${relativeAngle}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="relative"
              >
                <svg className="w-20 h-20 sm:w-24 sm:h-24 text-blue-500 drop-shadow-[0_0_24px_rgba(59,130,246,0.95)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L12 18M12 18L6 12M12 18L18 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-blue-500/40 shadow-lg">
                  <p className="text-white font-bold text-xs whitespace-nowrap">
                    {distance.toFixed(1)}m
                  </p>
                </div>
              </div>
            </div>

            {/* Distance Display - Top Center */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-500/40 shadow-xl">
                <p className="text-sm font-bold text-white text-center">
                  {distance.toFixed(1)} <span className="text-xs text-emerald-400 font-medium">m away</span>
                </p>
              </div>
            </div>
          </>
        ) : (
          /* "Turn around" guidance */
          <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-xs px-4">
            <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/40 shadow-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-400">Target Out of View</p>
                <p className="text-xs text-slate-300">
                  {relativeAngle > 0 ? 'Turn Right' : 'Turn Left'} ({Math.abs(Math.round(relativeAngle))}°)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Issue Summary Card - Bottom on Phone */}
        <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-4 space-y-2.5 max-w-md w-full">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500/10 p-2 rounded-lg shrink-0 text-blue-400 border border-blue-500/20">
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{issue.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{issue.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(issue.status)}`}>
                {issue.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                {issue.category}
              </span>
            </div>

            <div className="pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span className="truncate">{issue.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Close button - Top Right */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 bg-slate-900/90 hover:bg-slate-800 text-white p-2.5 rounded-full backdrop-blur-md border border-slate-700 shadow-xl pointer-events-auto transition-colors z-50 flex items-center justify-center"
          title="Exit AR View"
          aria-label="Exit AR View"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Compass Heading Indicator - Bottom Left */}
        <div className="absolute bottom-24 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <Navigation2 
              className="w-4 h-4 text-blue-400 transition-transform duration-200"
              style={{ transform: `rotate(${-deviceOrientation}deg)` }}
            />
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Compass</p>
              <p className="text-xs font-bold text-white">{Math.round(deviceOrientation)}°</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
