'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import DuplicateDetector from '@/components/DuplicateDetector';
import {
  Camera, X, MapPin, ArrowLeft,
  FileText, CheckCircle, AlertCircle, Loader2,
  ShieldCheck, Lock,
} from 'lucide-react';

interface CapturedPhoto {
  file: File;
  preview: string;
  lat: number;
  lng: number;
  address: string;
  capturedAt: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const t = useTranslations('ReportForm');

  const [loading, setLoading] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [gpsLockLoading, setGpsLockLoading] = useState(false);
  const [error, setError] = useState('');
  // Duplicate-detection state
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [uniqueConfirmed, setUniqueConfirmed] = useState(false);
  const [upvotedExistingId, setUpvotedExistingId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    area: '',
    landmark: '',
    priority: 'medium',
    location: {
      coordinates: [0, 0] as [number, number],
    },
  });

  // ── Reverse geocode helper ──────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }, []);

  // ── Get GPS at time of capture ──────────────────────────────────
  const getCurrentGPS = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

  // ── Camera ──────────────────────────────────────────────────────
  const startCamera = async () => {
    if (capturedPhotos.length >= 10) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = async () => {
            try { await videoRef.current?.play(); } catch { /* ignore */ }
          };
        }
      }, 100);
    } catch (err: any) {
      setError(t('errCameraFail', { msg: err.message || 'Permission denied' }));
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
    streamRef.current = null;
    if (videoRef.current) { try { videoRef.current.srcObject = null; } catch { /* ignore */ } }
    setStream(null);
    setCameraActive(false);
  };

  /**
   * KEY FEATURE: Capture photo AND GPS at the same instant.
   * No gallery upload is allowed — the coordinates come from live geolocation
   * at the exact moment of shutter press, so they cannot be spoofed.
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError(t('errCameraInit'));
      return;
    }

    setGpsLockLoading(true);
    setError('');

    try {
      // 1. Grab GPS FIRST (before the blob is created, so timing is tight)
      const { lat, lng } = await getCurrentGPS();

      // 2. Paint frame to canvas and extract blob
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('blob null'))),
          'image/jpeg', 0.9
        )
      );

      const file = new File([blob], `live-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg');

      // 3. Reverse geocode the locked coordinates
      const resolvedAddress = await reverseGeocode(lat, lng);
      const areaGuess = resolvedAddress.split(',')[2]?.trim() || '';

      const photo: CapturedPhoto = {
        file,
        preview,
        lat,
        lng,
        address: resolvedAddress,
        capturedAt: new Date().toISOString(),
      };

      setCapturedPhotos((prev) => [...prev, photo]);

      // Auto-fill location fields from first photo
      if (capturedPhotos.length === 0) {
        setFormData((prev) => ({
          ...prev,
          location: { coordinates: [lng, lat] },
          address: prev.address || resolvedAddress,
          area: prev.area || areaGuess,
        }));
      }

      stopCamera();
    } catch (err: any) {
      if (err.code === 1) {
        setError('Location permission denied. Please allow location access and try again.');
      } else if (err.message === 'blob null') {
        setError(t('errCaptureFail'));
      } else {
        setError(`GPS error: ${err.message}`);
      }
    } finally {
      setGpsLockLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // If first photo removed, re-lock to remaining first photo's coords
      if (index === 0 && next.length > 0) {
        setFormData((fd) => ({
          ...fd,
          location: { coordinates: [next[0].lng, next[0].lat] },
          address: fd.address,
        }));
      } else if (next.length === 0) {
        setFormData((fd) => ({ ...fd, location: { coordinates: [0, 0] } }));
      }
      return next;
    });
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
    };
  }, []);

  const hasGPS = formData.location.coordinates[0] !== 0 && formData.location.coordinates[1] !== 0;

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.description.trim() || !formData.category.trim() || !formData.address.trim()) {
      setError(t('errRequiredFields'));
      return;
    }

    if (!hasGPS) {
      setError(t('errNoLocation'));
      return;
    }

    // Pre-submission duplicate check:
    // If not confirmed unique and no upvoted existing, query check-duplicate directly
    if (!uniqueConfirmed && !upvotedExistingId) {
      try {
        const dupRes = await fetch(
          `/api/reports/check-duplicate?lng=${formData.location.coordinates[0]}&lat=${formData.location.coordinates[1]}&category=${encodeURIComponent(formData.category)}`
        );
        const dupData = await dupRes.json();
        if (dupData.success && dupData.data && dupData.data.length > 0) {
          setHasDuplicates(true);
          setDuplicateCount(dupData.data.length);
          setError('Similar issues were reported nearby. Please check the duplicate suggestions above, upvote the existing issue or confirm yours is different.');
          // Scroll to duplicate detector
          window.scrollTo({ top: 350, behavior: 'smooth' });
          return;
        }
      } catch (e) {
        console.error('Pre-submit duplicate check failed:', e);
      }
    }

    setLoading(true);

    try {
      let imageUrls: string[] = [];
      if (capturedPhotos.length > 0) {
        const fd = new FormData();
        capturedPhotos.forEach((p) => fd.append('files', p.file));

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imageUrls = uploadData.data;
        } else {
          throw new Error(t('errUploadFail'));
        }
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, images: imageUrls }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/${locale}/reports`);
      } else {
        throw new Error(data.error || t('errSubmitFail'));
      }
    } catch (err: any) {
      setError(err.message || t('errSubmitFail'));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Link href={`/${locale}`} className="hover:text-foreground transition-colors">{t('breadcrumbHome')}</Link>
              <span>/</span>
              <Link href={`/${locale}/reports`} className="hover:text-foreground transition-colors">{t('breadcrumbReports')}</Link>
              <span>/</span>
              <span className="text-foreground">{t('breadcrumbNew')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
          </div>

          <Button
            type="button" variant="outline"
            onClick={() => router.push(`/${locale}/reports`)}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('backBtn')}</span>
          </Button>
        </div>

        {/* Global error */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive font-medium">{error}</span>
          </div>
        )}

        {/* Anti-spoof banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span className="text-primary/80 font-medium">{t('securityNote')}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section 1: Classification ───────────────────────── */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>{t('section1Title')}</span>
              </CardTitle>
              <CardDescription className="text-xs">{t('section1Desc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium text-foreground">
                  {t('titleLabel')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={t('titlePlaceholder')}
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
                    {t('categoryLabel')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category"
                    placeholder={t('categoryPlaceholder')}
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      setUniqueConfirmed(false);
                      setHasDuplicates(false);
                    }}
                    maxLength={100}
                    required
                    className="h-10 text-sm"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="text-xs font-medium text-foreground">
                    {t('priorityLabel')}
                  </Label>
                  <Select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="h-10 text-sm"
                  >
                    <option value="low">{t('priorityLow')}</option>
                    <option value="medium">{t('priorityMedium')}</option>
                    <option value="high">{t('priorityHigh')}</option>
                    <option value="urgent">{t('priorityUrgent')}</option>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="description" className="text-xs font-medium text-foreground">
                  {t('descriptionLabel')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder={t('descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  required
                  className="text-sm leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{t('descriptionHint')}</span>
                  <span>{formData.description.length}/2000</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Location (auto-filled from photo) ────── */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{t('section2Title')}</span>
              </CardTitle>
              <CardDescription className="text-xs">{t('section2Desc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* GPS Status Chip */}
              {hasGPS ? (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    {t('gpsDetected')}
                  </span>
                  <span className="font-mono text-foreground font-bold">
                    {formData.location.coordinates[1].toFixed(6)}, {formData.location.coordinates[0].toFixed(6)}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('gpsNone')}</span>
                </div>
              )}

              {/* Address (auto-filled but editable) */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-medium text-foreground">
                  {t('addressLabel')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder={t('addressPlaceholder')}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  required
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="area" className="text-xs font-medium text-foreground">{t('areaLabel')}</Label>
                  <Input
                    id="area"
                    placeholder={t('areaPlaceholder')}
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landmark" className="text-xs font-medium text-foreground">{t('landmarkLabel')}</Label>
                  <Input
                    id="landmark"
                    placeholder={t('landmarkPlaceholder')}
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Duplicate Detector (Geo + Category + Status within 100m) ─── */}
          {hasGPS && formData.category.trim().length >= 2 && !upvotedExistingId && (
            <DuplicateDetector
              lng={formData.location.coordinates[0]}
              lat={formData.location.coordinates[1]}
              category={formData.category}
              onDuplicatesFound={(found, count) => {
                setHasDuplicates(found);
                setDuplicateCount(count);
                if (!found) {
                  setUniqueConfirmed(true);
                }
              }}
              onConfirmUnique={() => setUniqueConfirmed(true)}
              onUpvotedExisting={(id) => {
                setUpvotedExistingId(id);
                setTimeout(() => router.push(`/${locale}/reports/${id}`), 1000);
              }}
            />
          )}

          {/* Confirmed unique feedback */}
          {hasDuplicates && uniqueConfirmed && !upvotedExistingId && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Confirmed as a distinct issue. Your report will be submitted independently.</span>
            </div>
          )}

          {/* Upvoted existing feedback */}
          {upvotedExistingId && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Upvote recorded! Skipping new report creation and redirecting to the existing issue…</span>
            </div>
          )}

          {/* ── Section 3: Live Camera Only ─────────────────────── */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Camera className="w-4 h-4 text-primary" />
                    <span>{t('section3Title')}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">{t('section3Desc')}</CardDescription>
                </div>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  {capturedPhotos.length}/10
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">

              {/* Live viewfinder */}
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-xl overflow-hidden min-h-[280px] flex items-center justify-center border border-slate-800 shadow-lg">
                    <video
                      ref={videoRef}
                      playsInline muted autoPlay
                      className="w-full h-auto max-h-[420px] object-cover"
                    />
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('cameraInit')}
                      </div>
                    )}
                    {/* GPS lock overlay while capturing */}
                    {gpsLockLoading && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <span className="text-sm font-semibold">Locking GPS coordinates…</span>
                        <span className="text-xs text-slate-400">Please hold still</span>
                      </div>
                    )}
                    {/* Crosshair overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-16 h-16 border-2 border-white/30 rounded-lg" />
                    </div>
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-emerald-400 text-[11px] font-bold px-2 py-1 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      disabled={gpsLockLoading}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs gap-2"
                    >
                      {gpsLockLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Locking GPS…</>
                      ) : (
                        <><Camera className="w-4 h-4" />{t('takeSnapshot')}</>
                      )}
                    </Button>
                    <Button type="button" onClick={stopCamera} variant="outline" className="text-xs gap-1.5">
                      <X className="w-4 h-4" />{t('cancelCamera')}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={capturedPhotos.length >= 10}
                  className="w-full h-24 border-2 border-dashed border-border hover:border-primary hover:bg-secondary/40
                    flex flex-col items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-6 h-6 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{t('openCamera')}</span>
                  <span className="text-[11px] text-muted-foreground">{t('openCameraHint')}</span>
                </button>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {/* Photo grid with GPS badges */}
              {capturedPhotos.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('attachedPhotos')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {capturedPhotos.map((photo, index) => (
                      <div
                        key={index}
                        className="relative group rounded-xl overflow-hidden border border-border bg-secondary/50 aspect-video"
                      >
                        <img
                          src={photo.preview}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1.5 right-1.5 bg-slate-900/90 text-white rounded-full p-1
                            opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {/* GPS locked badge */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span className="text-[9px] text-emerald-400 font-bold truncate">{t('photoGpsTag')}</span>
                          <span className="text-[8px] text-slate-400 ml-auto">#{index + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* GPS coordinates table */}
                  <div className="mt-2 p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
                    {capturedPhotos.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                        <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-mono text-foreground font-semibold">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                        <span className="text-muted-foreground truncate text-[10px] ml-auto">
                          {new Date(p.capturedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Action Bar ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 pb-12">
            <Button
              type="button" variant="outline"
              onClick={() => router.push(`/${locale}/reports`)}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-medium"
            >
              {t('cancelBtn')}
            </Button>

            <Button
              type="submit" disabled={loading}
              className="w-full sm:w-auto px-8 py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('submitting')}</span></>
              ) : (
                <><CheckCircle className="w-4 h-4" /><span>{t('submitBtn')}</span></>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
