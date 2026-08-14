/**
 * HeatMapView Component - Professional Google Maps & High-Res Map Engine
 * 
 * Clean, production-ready interface with:
 * - Native Google Maps engine when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured in .env.local
 * - Seamless zero-config fallback with high-res Satellite, Street, Dark, Light, Outdoors, and Navigation
 * - Floating interactive Zoom In (+) and Zoom Out (-) controls
 * - Interactive category markers with status coloring and urgent pulsing badges
 * - Heatmap layer with density gradient
 * - Interactive report detail popups with "Center on Map" animation
 * - Left Control Panel with Map Style Selector, Layers, Live Statistics, Quick Actions, and Legend
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import 'leaflet/dist/leaflet.css';
import { 
  Map as MapIcon, Layers, BarChart3, RotateCcw, 
  Info, Satellite, Building, Moon, Sun, Trees, 
  Compass, Construction, Lightbulb, Droplet, 
  Droplets, Trash2, Milestone, Wrench, Plus, Minus,
  Maximize2, Minimize2, Navigation, ChevronDown, ChevronUp,
  X, SlidersHorizontal
} from 'lucide-react';

interface Report {
  _id: string;
  title: string;
  description: string;
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
  status: string;
  priority: string;
  category: string;
  address: string;
  createdAt: string;
  upvotes: number;
}

interface HeatmapData {
  lng: number;
  lat: number;
  totalCount: number;
  resolvedCount: number;
  resolutionRate: number;
}

interface HeatMapViewProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#60a5fa' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1f2937' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#34d399' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1f2937' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#374151' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e5e7eb' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2563eb' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e40af' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#93c5fd' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1f2937' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#030712' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#030712' }],
  },
];

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e2f6' }],
  },
];

const NAVIGATION_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f59e0b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#fbbf24' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }],
  },
];

const TILE_LAYERS = {
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 22,
    maxNativeZoom: 20
  },
  street: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 22,
    maxNativeZoom: 20
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    maxNativeZoom: 19
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    maxNativeZoom: 19
  },
  outdoors: {
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    maxNativeZoom: 18
  },
  navigation: {
    url: 'https://mt{s}.google.com/vt/lyrs=r&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 22,
    maxNativeZoom: 20
  }
};

type MapStyleKey = 'satellite' | 'street' | 'dark' | 'light' | 'outdoors' | 'navigation';

export default function HeatMapView({ initialViewState }: HeatMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Google Maps refs
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleHeatmapRef = useRef<any>(null);
  const googleHeatCirclesRef = useRef<any[]>([]);
  const googleOverlaysRef = useRef<google.maps.OverlayView[]>([]);

  // Leaflet refs
  const leafletMapRef = useRef<any>(null);
  const leafletTileLayerRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const leafletHeatCirclesRef = useRef<any[]>([]);

  const [engine, setEngine] = useState<'google' | 'leaflet'>('leaflet');
  const [reports, setReports] = useState<Report[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('satellite');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);

  const defaultCenter = {
    lat: initialViewState?.latitude || 12.9716,
    lng: initialViewState?.longitude || 77.5946,
  };
  const defaultZoom = initialViewState?.zoom || 12;

  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  // Fetch Reports and Heatmap Data
  useEffect(() => {
    fetchReports();
    fetchHeatmapData();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports?limit=100');
      const data = await response.json();
      if (data.success) {
        setReports(data.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const response = await fetch('/api/analytics/heatmap');
      const data = await response.json();
      if (data.success) {
        setHeatmapData(data.data);
      }
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    }
  };

  const getMarkerColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: '#3b82f6',
      under_review: '#eab308',
      in_progress: '#8b5cf6',
      resolved: '#22c55e',
      closed: '#6b7280',
      rejected: '#dc2626',
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: '#6b7280',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#dc2626',
    };
    return colors[priority] || '#3b82f6';
  };

  const getCategoryIconSvg = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('pothole') || cat.includes('road')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"/><path d="M12 13v8"/><path d="M12 3v3"/></svg>`;
    }
    if (cat.includes('light')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
    }
    if (cat.includes('drain') || cat.includes('sewage')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`;
    }
    if (cat.includes('water')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
    }
    if (cat.includes('garbage') || cat.includes('waste')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  };

  const getCategoryIconReact = (category: string) => {
    const icons: Record<string, any> = {
      potholes: Construction,
      'street lights': Lightbulb,
      'water supply': Droplet,
      drainage: Droplets,
      'garbage collection': Trash2,
      'roads & pavements': Milestone,
      roads: Milestone,
      water: Droplet,
      streetlight: Lightbulb,
      waste: Trash2,
    };
    const Icon = icons[category.toLowerCase()] || Wrench;
    return <Icon className="w-5 h-5 text-white" />;
  };

  // Initialize Map (Google Maps if key is valid, otherwise high-res interactive fallback)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    // Cleanup any existing maps
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    if (googleHeatmapRef.current) {
      googleHeatmapRef.current.setMap(null);
      googleHeatmapRef.current = null;
    }
    googleOverlaysRef.current.forEach(o => o.setMap(null));
    googleOverlaysRef.current = [];
    googleMapRef.current = null;

    mapContainerRef.current.innerHTML = '';

    const initLeafletMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [defaultCenter.lat, defaultCenter.lng],
          zoom: defaultZoom,
          zoomControl: false,
          attributionControl: false,
        });

        leafletMapRef.current = map;
        setEngine('leaflet');

        const layerInfo = TILE_LAYERS[mapStyle] || TILE_LAYERS.satellite;
        const tileLayer = L.tileLayer(layerInfo.url, {
          attribution: layerInfo.attribution,
          maxZoom: layerInfo.maxZoom,
          maxNativeZoom: layerInfo.maxNativeZoom,
          subdomains: layerInfo.subdomains || ['a', 'b', 'c']
        }).addTo(map);

        leafletTileLayerRef.current = tileLayer;

        // Ensure tiles calculate size immediately
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 100);
      } catch (err) {
        console.error('Error initializing map engine:', err);
      }
    };

    if (apiKey && apiKey.length > 10) {
      (window as any).gm_authFailure = () => {
        console.warn('Google Maps auth failure, using high-res fallback');
        initLeafletMap();
      };

      setOptions({
        key: apiKey,
        v: '3.64',
      });

      Promise.all([
        importLibrary('maps'),
        importLibrary('visualization').catch(() => null),
      ]).then(([mapsLib]) => {
        if (!isMounted || !mapContainerRef.current) return;
        const { Map } = mapsLib;

        const map = new Map(mapContainerRef.current!, {
          center: defaultCenter,
          zoom: defaultZoom,
          mapTypeId: google.maps.MapTypeId.HYBRID,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          maxZoom: 21,
          minZoom: 3,
        });

        googleMapRef.current = map;
        setEngine('google');
        applyGoogleMapStyle(mapStyle, map);
      }).catch((err) => {
        console.warn('Google Maps loader failed, using fallback engine:', err);
        initLeafletMap();
      });
    } else {
      initLeafletMap();
    }

    return () => {
      isMounted = false;
      googleHeatCirclesRef.current.forEach((c) => c.setMap(null));
      googleHeatCirclesRef.current = [];
      if (googleHeatmapRef.current) {
        googleHeatmapRef.current.setMap(null);
        googleHeatmapRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [apiKey]);

  // Apply Google Map Style
  const applyGoogleMapStyle = useCallback((style: MapStyleKey, mapObj?: google.maps.Map | null) => {
    const map = mapObj || googleMapRef.current;
    if (!map || !window.google?.maps) return;

    switch (style) {
      case 'satellite':
        map.setMapTypeId(google.maps.MapTypeId.HYBRID);
        map.setOptions({ styles: null });
        break;
      case 'street':
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        map.setOptions({ styles: null });
        break;
      case 'dark':
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        map.setOptions({ styles: DARK_MAP_STYLE });
        break;
      case 'light':
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        map.setOptions({ styles: LIGHT_MAP_STYLE });
        break;
      case 'outdoors':
        map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
        map.setOptions({ styles: null });
        break;
      case 'navigation':
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        map.setOptions({ styles: NAVIGATION_MAP_STYLE });
        break;
    }
  }, []);

  // Switch Style on Active Map Engine
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current) {
      applyGoogleMapStyle(mapStyle);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      import('leaflet').then((LModule) => {
        const L = LModule.default;
        const map = leafletMapRef.current;
        if (!map) return;

        if (leafletTileLayerRef.current) {
          map.removeLayer(leafletTileLayerRef.current);
        }

        const layerInfo = TILE_LAYERS[mapStyle] || TILE_LAYERS.satellite;
        const newLayer = L.tileLayer(layerInfo.url, {
          attribution: layerInfo.attribution,
          maxZoom: layerInfo.maxZoom,
          maxNativeZoom: layerInfo.maxNativeZoom,
          subdomains: layerInfo.subdomains || ['a', 'b', 'c']
        }).addTo(map);

        leafletTileLayerRef.current = newLayer;
      });
    }
  }, [mapStyle, engine, applyGoogleMapStyle]);

  // Update Heatmap in Google Maps
  useEffect(() => {
    if (engine !== 'google' || !googleMapRef.current) return;
    const map = googleMapRef.current;

    if (googleHeatmapRef.current) {
      googleHeatmapRef.current.setMap(null);
      googleHeatmapRef.current = null;
    }
    googleHeatCirclesRef.current.forEach((c) => c.setMap(null));
    googleHeatCirclesRef.current = [];

    if (!showHeatmap) return;

    const points: any[] = [];
    reports.forEach((report) => {
      const [lng, lat] = report.location.coordinates;
      if (lat && lng) {
        points.push({
          location: new google.maps.LatLng(lat, lng),
          lat,
          lng,
          weight: report.priority === 'urgent' ? 3 : report.priority === 'high' ? 2 : 1,
        });
      }
    });

    heatmapData.forEach((item) => {
      if (item.lat && item.lng) {
        points.push({
          location: new google.maps.LatLng(item.lat, item.lng),
          lat: item.lat,
          lng: item.lng,
          weight: Math.max(item.totalCount, 1),
        });
      }
    });

    const HeatmapConstructor = (window as any).google?.maps?.visualization?.HeatmapLayer;
    if (HeatmapConstructor) {
      try {
        const heatmap = new HeatmapConstructor({
          data: points.map(p => ({ location: p.location, weight: p.weight })),
          map: map,
          radius: 30,
          opacity: 0.8,
          gradient: [
            'rgba(0, 0, 255, 0)',
            'rgba(65, 105, 225, 1)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 255, 0, 1)',
            'rgba(255, 255, 0, 1)',
            'rgba(255, 0, 0, 1)',
          ],
        });
        googleHeatmapRef.current = heatmap;
        return;
      } catch (e) {
        console.warn('HeatmapLayer initialization error, falling back to circles:', e);
      }
    }

    // High-performance SVG density circles fallback on Google Maps
    if (window.google?.maps?.Circle) {
      points.forEach((pt) => {
        const color = pt.weight >= 3 ? '#ef4444' : pt.weight >= 2 ? '#f59e0b' : '#3b82f6';
        const circle = new google.maps.Circle({
          strokeColor: color,
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: 0.3,
          map: map,
          center: { lat: pt.lat, lng: pt.lng },
          radius: Math.min(100 + pt.weight * 50, 400),
        });
        googleHeatCirclesRef.current.push(circle);
      });
    }
  }, [reports, heatmapData, showHeatmap, engine]);

  // Update Heatmap in Leaflet
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    leafletHeatCirclesRef.current.forEach(c => map.removeLayer(c));
    leafletHeatCirclesRef.current = [];

    if (!showHeatmap) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const circles: any[] = [];

      reports.forEach((report) => {
        const [lng, lat] = report.location.coordinates;
        if (lat && lng) {
          const circle = L.circle([lat, lng], {
            radius: 800,
            color: '#ef4444',
            fillColor: '#f97316',
            fillOpacity: 0.35,
            weight: 0
          }).addTo(map);
          circles.push(circle);
        }
      });

      heatmapData.forEach((item) => {
        if (item.lat && item.lng) {
          const circle = L.circle([item.lat, item.lng], {
            radius: 1200,
            color: '#3b82f6',
            fillColor: '#06b6d4',
            fillOpacity: 0.25,
            weight: 0
          }).addTo(map);
          circles.push(circle);
        }
      });

      leafletHeatCirclesRef.current = circles;
    });
  }, [reports, heatmapData, showHeatmap, engine]);

  // Update Markers in Google Maps
  useEffect(() => {
    if (engine !== 'google' || !googleMapRef.current) return;
    const map = googleMapRef.current;

    googleOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    googleOverlaysRef.current = [];

    if (!showMarkers) return;

    reports.forEach((report) => {
      const [lng, lat] = report.location.coordinates;
      if (!lat || !lng) return;

      const position = new google.maps.LatLng(lat, lng);
      const color = getMarkerColor(report.status);
      const isUrgent = report.priority === 'urgent';
      const iconSvg = getCategoryIconSvg(report.category);

      class MarkerOverlay extends google.maps.OverlayView {
        private containerDiv: HTMLDivElement | null = null;

        onAdd() {
          this.containerDiv = document.createElement('div');
          this.containerDiv.className = 'custom-gm-marker-wrapper';
          this.containerDiv.style.position = 'absolute';
          this.containerDiv.style.cursor = 'pointer';
          this.containerDiv.style.transform = 'translate(-50%, -50%)';
          this.containerDiv.style.zIndex = isUrgent ? '30' : '20';

          this.containerDiv.innerHTML = `
            <div 
              class="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transform hover:scale-125 transition-all duration-300 border-2 border-white"
              style="background-color: ${color}; box-shadow: 0 0 20px ${color}80;"
            >
              ${iconSvg}
              ${isUrgent ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>' : ''}
            </div>
          `;

          this.containerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedReport(report);
          });

          const panes = this.getPanes();
          panes?.overlayMouseTarget.appendChild(this.containerDiv);
        }

        draw() {
          if (!this.containerDiv) return;
          const projection = this.getProjection();
          if (!projection) return;

          const point = projection.fromLatLngToDivPixel(position);
          if (point) {
            this.containerDiv.style.left = `${point.x}px`;
            this.containerDiv.style.top = `${point.y}px`;
          }
        }

        onRemove() {
          if (this.containerDiv && this.containerDiv.parentElement) {
            this.containerDiv.parentElement.removeChild(this.containerDiv);
            this.containerDiv = null;
          }
        }
      }

      const overlay = new MarkerOverlay();
      overlay.setMap(map);
      googleOverlaysRef.current.push(overlay);
    });
  }, [reports, showMarkers, engine]);

  // Update Markers in Leaflet
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    leafletMarkersRef.current.forEach((m) => map.removeLayer(m));
    leafletMarkersRef.current = [];

    if (!showMarkers) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const markers: any[] = [];

      reports.forEach((report) => {
        const [lng, lat] = report.location.coordinates;
        if (!lat || !lng) return;

        const color = getMarkerColor(report.status);
        const isUrgent = report.priority === 'urgent';
        const iconSvg = getCategoryIconSvg(report.category);

        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div 
              class="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transform hover:scale-125 transition-all duration-300 border-2 border-white"
              style="background-color: ${color}; box-shadow: 0 0 20px ${color}80;"
            >
              ${iconSvg}
              ${isUrgent ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>' : ''}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => setSelectedReport(report));
        markers.push(marker);
      });

      leafletMarkersRef.current = markers;
    });
  }, [reports, showMarkers, engine]);

  // Zoom In
  const handleZoomIn = () => {
    if (engine === 'google' && googleMapRef.current) {
      const z = googleMapRef.current.getZoom() || 12;
      googleMapRef.current.setZoom(Math.min(z + 1, 21));
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  // Zoom Out
  const handleZoomOut = () => {
    if (engine === 'google' && googleMapRef.current) {
      const z = googleMapRef.current.getZoom() || 12;
      googleMapRef.current.setZoom(Math.max(z - 1, 3));
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  // Fly / Center to Report
  const flyToReport = (report: Report) => {
    const [lng, lat] = report.location.coordinates;
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(17);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 17, { duration: 1.5 });
    }
    setSelectedReport(report);
  };

  // Reset View
  const resetView = () => {
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.panTo(defaultCenter);
      googleMapRef.current.setZoom(defaultZoom);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.flyTo([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    }
  };

  // Locate User (Geolocate)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (engine === 'google' && googleMapRef.current) {
          googleMapRef.current.panTo({ lat: latitude, lng: longitude });
          googleMapRef.current.setZoom(16);
        } else if (engine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.flyTo([latitude, longitude], 16);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Could not determine your location. Please check location permissions.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.parentElement?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error(err));
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 relative overflow-hidden select-none">
      {/* Map Canvas Container - always mounted in DOM */}
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', minHeight: '100%', position: 'absolute', inset: 0, zIndex: 0 }}
        className="bg-slate-950" 
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-slate-400 text-sm font-medium">Loading infrastructure map...</p>
          </div>
        </div>
      )}

      {/* Floating Controls (Zoom In, Zoom Out, Geolocate, Fullscreen, Reset) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Zoom Controls */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg shadow-md flex flex-col overflow-hidden">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            className="p-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="p-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Locate Me (Geolocate) */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Find My Location"
          aria-label="Find My Location"
          className="p-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white shadow-md transition-colors flex items-center justify-center"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label="Toggle Fullscreen"
          className="p-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white shadow-md transition-colors flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Reset View Compass */}
        <button
          onClick={resetView}
          title="Reset Map View"
          aria-label="Reset View"
          className="p-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white shadow-md transition-colors flex items-center justify-center"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Report Interactive Popup / Modal Card */}
      {selectedReport && (
        <div className="absolute top-4 right-16 z-30 w-80 max-w-[calc(100vw-5rem)] pointer-events-auto animate-fade-in">
          <div className="p-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-start gap-3 pr-6 mb-3">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/20 shadow-xs"
                style={{ backgroundColor: getMarkerColor(selectedReport.status) }}
              >
                {getCategoryIconReact(selectedReport.category)}
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2">
                  {selectedReport.title}
                </h4>
                <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">
                  {selectedReport.category}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Status:</span>
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-semibold text-white uppercase tracking-wider"
                  style={{ backgroundColor: getMarkerColor(selectedReport.status) }}
                >
                  {selectedReport.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Priority:</span>
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-semibold text-white uppercase tracking-wider"
                  style={{ backgroundColor: getPriorityColor(selectedReport.priority) }}
                >
                  {selectedReport.priority}
                </span>
              </div>

              <div className="flex items-start gap-2 pt-1 border-t border-slate-800">
                <span className="text-slate-400 shrink-0">Location:</span>
                <span className="text-slate-200 text-right leading-tight line-clamp-2">{selectedReport.address}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Upvotes:</span>
                <span className="text-slate-200 font-semibold">👍 {selectedReport.upvotes || 0}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => flyToReport(selectedReport)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  📍 Center
                </button>
                <a
                  href={`/en/reports/${selectedReport._id}`}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-center rounded-lg font-medium text-xs transition-colors border border-slate-700 flex items-center justify-center"
                >
                  View Details →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Toggle Button */}
      <div className="absolute top-3 left-3 z-20 md:hidden pointer-events-auto">
        <button
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          className="px-3 py-2 bg-slate-900/95 hover:bg-slate-800 text-white rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
          aria-label="Toggle map layers and styles"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>{isControlsOpen ? 'Hide Controls' : 'Layers & Legend'}</span>
          {isControlsOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Left Control Panel */}
      <div className={`absolute left-3 z-20 pointer-events-none transition-all duration-300 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bottom-3 ${
        isControlsOpen ? 'top-14 block' : 'top-3 hidden md:block'
      }`}>
        <div className="h-full max-h-full overflow-y-auto overflow-x-hidden pointer-events-auto pr-1.5 space-y-2">
          {/* Mobile Panel Header with Close Button */}
          {isControlsOpen && (
            <div className="flex items-center justify-between p-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-lg md:hidden">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Map Controls
              </span>
              <button
                onClick={() => setIsControlsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Map Style Selector Section */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStyleOpen(!styleOpen)}
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-slate-300 hover:text-white transition-colors flex-1 text-left"
              >
                <MapIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Map Style</span>
                {styleOpen ? (
                  <ChevronUp className="w-3 h-3 text-slate-400 ml-auto mr-2" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-auto mr-2" />
                )}
              </button>
              <button
                onClick={resetView}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset Map Center"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {styleOpen && (
              <div className="grid grid-cols-3 gap-1 pt-2.5 animate-in fade-in-50 duration-200">
                {(['satellite', 'street', 'dark', 'light', 'outdoors', 'navigation'] as MapStyleKey[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={`px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all flex flex-col items-center gap-1 justify-center ${
                      mapStyle === style
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {style === 'satellite' && <Satellite className="w-3 h-3" />} 
                    {style === 'street' && <Building className="w-3 h-3" />} 
                    {style === 'dark' && <Moon className="w-3 h-3" />} 
                    {style === 'light' && <Sun className="w-3 h-3" />} 
                    {style === 'outdoors' && <Trees className="w-3 h-3" />} 
                    {style === 'navigation' && <Compass className="w-3 h-3" />} 
                    <span className="capitalize text-[10px] leading-none">{style}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Layers & Live Statistics Section */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg space-y-2">
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className="flex items-center justify-between w-full text-[11px] uppercase tracking-wider font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Active Layers & Stats</span>
              </span>
              {layersOpen ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {layersOpen && (
              <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[11px] text-slate-400">Toggle Layers</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={showHeatmap}
                        onChange={(e) => setShowHeatmap(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 accent-blue-600 cursor-pointer"
                      />
                      <span>Heatmap</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={showMarkers}
                        onChange={(e) => setShowMarkers(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 accent-blue-600 cursor-pointer"
                      />
                      <span>Markers</span>
                    </label>
                  </div>
                </div>

                {/* Compact Statistics Grid */}
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  <div className="p-1.5 bg-slate-800/60 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400">Total</p>
                    <p className="text-sm font-bold text-white leading-tight">{reports.length}</p>
                  </div>
                  <div className="p-1.5 bg-slate-800/60 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400">Resolved</p>
                    <p className="text-sm font-bold text-emerald-400 leading-tight">
                      {reports.filter(r => r.status === 'resolved').length}
                    </p>
                  </div>
                  <div className="p-1.5 bg-slate-800/60 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400">Pending</p>
                    <p className="text-sm font-bold text-amber-400 leading-tight">
                      {reports.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'in_progress').length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Legend Section */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg">
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="flex items-center justify-between w-full text-[11px] uppercase tracking-wider font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Status Legend</span>
              </span>
              {legendOpen ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {legendOpen && (
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 animate-in fade-in-50 duration-200">
                {[
                  { status: 'submitted', label: 'Submitted', color: '#3b82f6' },
                  { status: 'under_review', label: 'Under Review', color: '#eab308' },
                  { status: 'in_progress', label: 'In Progress', color: '#8b5cf6' },
                  { status: 'resolved', label: 'Resolved', color: '#22c55e' },
                ].map((item) => (
                  <div key={item.status} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-300 text-[11px] truncate font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
