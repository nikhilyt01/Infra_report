'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { 
  Camera, X, MapPin, ArrowLeft, UploadCloud, 
  FileText, CheckCircle, AlertCircle, Loader2, Navigation
} from 'lucide-react';

export default function NewReportPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    area: '',
    landmark: '',
    priority: 'medium',
    location: {
      coordinates: [0, 0], // [longitude, latitude]
    },
  });

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          location: {
            coordinates: [longitude, latitude],
          },
        }));
        
        reverseGeocode(latitude, longitude);
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get your GPS location. Please enter address manually.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setFormData((prev) => ({
          ...prev,
          address: data.display_name,
          area: data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || '',
        }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const startCamera = async () => {
    if (selectedImages.length >= 10) {
      alert('Maximum 10 photos allowed per report');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
            } catch (playError) {
              console.error('Error playing video:', playError);
            }
          };
        }
      }, 100);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      alert(`Unable to access camera: ${error.message || 'Please check permissions.'}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error(e);
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
    setStream(null);
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera is initializing. Please wait a moment and try again.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const preview = canvas.toDataURL('image/jpeg');
          
          setSelectedImages((prev) => [...prev, file]);
          setImagePreview((prev) => [...prev, preview]);
          
          if (formData.location.coordinates[0] !== 0 && formData.location.coordinates[1] !== 0) {
            await captureSatelliteImage();
          }
          
          stopCamera();
        } else {
          alert('Failed to capture photo. Please try again.');
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedImages.length + files.length > 10) {
      alert('You can upload a maximum of 10 photos');
      return;
    }

    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      }
    });

    setSelectedImages((prev) => [...prev, ...validFiles]);
    setImagePreview((prev) => [...prev, ...previews]);
  };

  const captureSatelliteImage = async () => {
    try {
      const [lng, lat] = formData.location.coordinates;
      const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      
      let satelliteUrl = '';
      if (googleMapsKey) {
        satelliteUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=640x640&scale=2&maptype=hybrid&key=${googleMapsKey}`;
      } else if (mapboxToken) {
        const width = 1280;
        const height = 1280;
        satelliteUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},14,0,0/${width}x${height}@2x?access_token=${mapboxToken}`;
      } else {
        return;
      }

      const response = await fetch(satelliteUrl);
      if (!response.ok) return;

      const imageBlob = await response.blob();
      const satelliteFile = new File(
        [imageBlob], 
        `satellite-${Date.now()}.jpg`, 
        { type: 'image/jpeg' }
      );

      const satellitePreview = URL.createObjectURL(imageBlob);
      setSelectedImages((prev) => [...prev, satelliteFile]);
      setImagePreview((prev) => [...prev, satellitePreview]);
    } catch (error) {
      console.error('Satellite capture error:', error);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error(e);
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category.trim() || !formData.address.trim()) {
      alert('Please complete all required fields (*)');
      return;
    }

    if (formData.location.coordinates[0] === 0 && formData.location.coordinates[1] === 0) {
      alert('Please detect or pin your location before submitting');
      return;
    }

    setLoading(true);

    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const imageFormData = new FormData();
        selectedImages.forEach((file) => {
          imageFormData.append('files', file);
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });

        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          imageUrls = uploadData.data;
        } else {
          throw new Error('Image upload failed');
        }
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          images: imageUrls,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/${locale}/reports`);
      } else {
        throw new Error(data.error || 'Failed to submit report');
      }
    } catch (error: any) {
      console.error('Error submitting report:', error);
      alert(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
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
              <span className="text-foreground">New Issue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Report Infrastructure Issue
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/reports`)}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Reports</span>
          </Button>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Issue Classification */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>1. Issue Classification & Details</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Provide a clear title, category, and severity priority for civic authorities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium text-foreground">
                  Issue Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Deep pothole on 5th Cross Road, water stagnation"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={200}
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-medium text-foreground">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category"
                    placeholder="e.g., Roads, Street Lights, Drainage, Water Supply"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    maxLength={100}
                    required
                    className="h-10 text-sm"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="text-xs font-medium text-foreground">
                    Severity Priority
                  </Label>
                  <Select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="h-10 text-sm"
                  >
                    <option value="low">Low - Minor aesthetic issue</option>
                    <option value="medium">Medium - Standard repair required</option>
                    <option value="high">High - Causing safety/traffic hazard</option>
                    <option value="urgent">Urgent - Immediate safety risk</option>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="description" className="text-xs font-medium text-foreground">
                  Detailed Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the exact issue, dimensions, potential hazards, and how long it has persisted..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  required
                  className="text-sm leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Be specific to help municipal teams bring appropriate repair equipment.</span>
                  <span>{formData.description.length}/2000 chars</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Location Information */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>2. Geographic Location</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Detect your exact coordinates or specify address and landmark
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={locationLoading}
                  className="shrink-0 flex items-center gap-1.5 text-xs bg-secondary/50 font-medium"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-primary" />
                      <span>Use Current GPS Location</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {formData.location.coordinates[0] !== 0 && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-primary font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    GPS Coordinates Detected:
                  </span>
                  <span className="font-mono text-foreground font-semibold">
                    {formData.location.coordinates[1].toFixed(6)}, {formData.location.coordinates[0].toFixed(6)}
                  </span>
                </div>
              )}

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-medium text-foreground">
                  Exact Street Address / Location <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="Full road name, building number, cross street..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  required
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="area" className="text-xs font-medium text-foreground">
                    Area / Ward / Suburb
                  </Label>
                  <Input
                    id="area"
                    placeholder="e.g., Ward 4, Indiranagar"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landmark" className="text-xs font-medium text-foreground">
                    Nearby Landmark
                  </Label>
                  <Input
                    id="landmark"
                    placeholder="e.g., Near Metro Station Gate 2"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Live Photo Evidence */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Camera className="w-4 h-4 text-primary" />
                    <span>3. Live Photo Evidence (Camera Only)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture real-time on-site photos with your device camera (Max 10 photos)
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedImages.length}/10 captured
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Camera Live Viewfinder */}
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center border border-slate-800 shadow-lg">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-auto max-h-[440px] object-cover"
                    />
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                        Initializing camera feed...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-xs"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Snapshot
                    </Button>
                    <Button
                      type="button"
                      onClick={stopCamera}
                      variant="outline"
                      className="text-xs"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel Camera
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    disabled={selectedImages.length >= 10}
                    className="w-full h-20 border border-dashed border-border hover:border-primary hover:bg-secondary/50 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl"
                  >
                    <Camera className="w-6 h-6 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Open Camera to Take Live Photo</span>
                    <span className="text-[10px] text-muted-foreground">Photos must be captured live on site</span>
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
              
              {/* Photo Preview Grid */}
              {imagePreview.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Attached Photos:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {imagePreview.map((preview, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border border-border bg-secondary/50 aspect-video">
                        <img
                          src={preview}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-md"
                          title="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 pb-12">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/reports`)}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-medium"
            >
              Cancel & Return
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit Infrastructure Report</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
