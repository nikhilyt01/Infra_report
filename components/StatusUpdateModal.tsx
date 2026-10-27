'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Camera, Trash2, Loader2, CheckCircle2,
  ShieldAlert, Sparkles, VideoOff, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

export interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  currentStatus: string;
  targetStatus: string;
  onSuccess: (updatedReport: any) => void;
  /** Report site coordinates [longitude, latitude] – required for GPS gate when resolving */
  reportLocation?: [number, number];
}

export default function StatusUpdateModal({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  currentStatus,
  targetStatus,
  onSuccess,
  reportLocation,
}: StatusUpdateModalProps) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [capturedPreviews, setCapturedPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isResolving = targetStatus === 'resolved';
  const isRejecting = targetStatus === 'rejected';
  const isTerminal = ['resolved', 'rejected', 'closed'].includes(currentStatus);
  const isReopening = isTerminal && ['in_progress', 'under_review', 'submitted'].includes(targetStatus);

  // ---------- GPS helpers ----------
  function haversineMetres(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
  ): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
    });
  }

  // ---------- Camera helpers ----------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraOpen(false);
    setCameraError('');
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraError('');
    setCameraReady(false);
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err?.name === 'NotFoundError'
          ? 'No camera device found on this device.'
          : `Camera error: ${err?.message || 'Unknown error'}`;
      setCameraError(msg);
      setCameraReady(false);
    }
  }, []);

  const flipCamera = async () => {
    const next: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const timestamp = Date.now();
      const file = new File([blob], `live-photo-${timestamp}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      setCapturedFiles((prev) => [...prev, file]);
      setCapturedPreviews((prev) => [...prev, previewUrl]);
      // Close camera after capture
      stopCamera();
      toast.success('Photo captured!', 'Live Photo');
    }, 'image/jpeg', 0.92);
  };

  const removeCapture = (index: number) => {
    if (capturedPreviews[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPreviews[index]);
    }
    setCapturedFiles((prev) => prev.filter((_, i) => i !== index));
    setCapturedPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Lifecycle ----------
  useEffect(() => {
    if (isOpen) {
      setNote('');
      setCapturedFiles([]);
      setCapturedPreviews([]);
      setIsSubmitting(false);
      setUploadProgress('');
      setCameraOpen(false);
      setCameraError('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      stopCamera();
    }
  }, [isOpen, targetStatus, stopCamera]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      capturedPreviews.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isSubmitting) return;
      if (e.key === 'Escape') {
        if (cameraOpen) { stopCamera(); } else { onClose(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose, cameraOpen, stopCamera]);

  if (!isOpen) return null;

  // ---------- Submit ----------
  const handleSubmit = async (skipNote = false) => {
    const noteText = skipNote ? '' : note.trim();

    if (isRejecting && noteText.length < 3) {
      toast.error('Please provide a reason to reject this report');
      textareaRef.current?.focus();
      return;
    }
    if (isReopening && noteText.length < 3) {
      toast.error('A reason is required to reopen this report');
      textareaRef.current?.focus();
      return;
    }
    if (isResolving && capturedFiles.length === 0) {
      toast.error('Please take a live on-site photo before resolving');
      return;
    }

    setIsSubmitting(true);

    try {
      // GPS gate for resolution
      if (isResolving && reportLocation) {
        setUploadProgress('Verifying your GPS location…');
        let pos: GeolocationPosition;
        try {
          pos = await getCurrentPosition();
        } catch (geoErr: any) {
          const msg =
            geoErr?.code === 1
              ? 'Location permission denied. Please allow location access and try again.'
              : 'Unable to get your GPS location. Please try again.';
          toast.error(msg, 'Location Required');
          setIsSubmitting(false);
          setUploadProgress('');
          return;
        }

        const [reportLng, reportLat] = reportLocation; // GeoJSON: [lng, lat]
        const distance = haversineMetres(
          pos.coords.latitude, pos.coords.longitude,
          reportLat, reportLng,
        );

        const THRESHOLD_M = 500;
        if (distance > THRESHOLD_M) {
          toast.error(
            `You are ${Math.round(distance)} m away from the reported site. You must be within ${THRESHOLD_M} m to resolve this report.`,
            'Too Far From Site',
          );
          setIsSubmitting(false);
          setUploadProgress('');
          return;
        }
      }

      let resolutionImages: string[] = [];

      // Upload captured photos
      if (isResolving && capturedFiles.length > 0) {
        setUploadProgress('Uploading live evidence photos…');
        const formData = new FormData();
        capturedFiles.forEach((file) => formData.append('files', file));

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Failed to upload resolution images');
        }
        resolutionImages = uploadData.data;
      }

      setUploadProgress('Updating report status…');

      const payload: any = {
        status: targetStatus,
        note: noteText || undefined,
        reason: isRejecting || isReopening ? noteText : undefined,
        resolutionNote: isResolving ? noteText : undefined,
        resolutionImages: isResolving ? resolutionImages : undefined,
      };

      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update report status');
      }

      if (isResolving) {
        toast.success('Report marked as resolved with live photo evidence!', 'Resolution Verified ✅');
      } else if (isRejecting) {
        toast.info('Report status updated to Rejected', 'Report Rejected');
      } else if (isReopening) {
        toast.warning('Report reopened for further action', 'Report Reopened');
      } else {
        toast.success(`Status updated to ${targetStatus.replace('_', ' ')}`, 'Status Updated');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      console.error('Lifecycle status update error:', err);
      toast.error(err.message || 'Error updating status. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const getTargetBadge = () => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      in_progress: { label: 'In Progress', bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-600 dark:text-indigo-400' },
      resolved: { label: 'Resolved', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' },
      rejected: { label: 'Rejected', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-600 dark:text-rose-400' },
      under_review: { label: 'Under Review', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
      submitted: { label: 'Submitted', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-600 dark:text-blue-400' },
    };
    return map[targetStatus] || { label: targetStatus, bg: 'bg-secondary', text: 'text-foreground' };
  };

  const badge = getTargetBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (!isSubmitting && e.target === e.currentTarget && !cameraOpen) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-status-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-card text-card-foreground border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:inset-x-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80 bg-secondary/30">
          <div className="space-y-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status Update
              </span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
            <h3 id="modal-status-title" className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
              {reportTitle}
            </h3>
          </div>

          <button
            type="button"
            onClick={cameraOpen ? stopCamera : onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Reopen Warning Banner */}
          {isReopening && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-xs">Admin Audit Action</p>
                <p className="text-[11px] leading-relaxed">
                  This report was previously finalized. Reopening requires a mandatory audit reason.
                </p>
              </div>
            </div>
          )}

          {/* Note / Reason Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="status-note" className="font-semibold text-foreground text-xs flex items-center gap-1">
                <span>{isRejecting ? 'Rejection Reason *' : isReopening ? 'Audit Reason *' : 'Status Note'}</span>
                {!isRejecting && !isReopening && (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                )}
              </label>
              <span className={`text-[11px] font-mono ${note.length > 280 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                {note.length} / 280
              </span>
            </div>

            <textarea
              id="status-note"
              ref={textareaRef}
              rows={3}
              value={note}
              maxLength={280}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isResolving
                  ? 'e.g. Repaired street lighting line, tested fixture and restored lighting.'
                  : isRejecting
                  ? 'e.g. Duplicate report of ticket #8402, or outside municipal ward boundary.'
                  : isReopening
                  ? 'e.g. Quality inspection failed, repaving required by contractor.'
                  : 'e.g. Field crew deployed to the location.'
              }
              className="w-full p-3 rounded-xl bg-background border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary text-xs text-foreground placeholder:text-muted-foreground outline-hidden transition-all resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* ============================================================
              LIVE CAMERA SECTION (only for resolution)
          ============================================================ */}
          {isResolving && (
            <div className="space-y-3 pt-1">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Live On-Site Photo Evidence *</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Open camera → take a live photo at the site. GPS is verified on submit.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {capturedFiles.length} / 4
                </span>
              </div>

              {/* Captured photo previews */}
              {capturedPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {capturedPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border/80 bg-secondary/40 group shadow-xs"
                    >
                      <img
                        src={url}
                        alt={`Live proof #${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeCapture(idx)}
                        disabled={isSubmitting}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-destructive text-white transition-colors"
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                        #{idx + 1} 📍
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Live Camera Viewfinder ---- */}
              {cameraOpen ? (
                <div className="rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-black relative">
                  {/* Video stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video object-cover"
                  />
                  {/* Hidden canvas for snapshot */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera loading / error overlay */}
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-xs">Starting camera…</span>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-3 text-white p-4 text-center">
                      <VideoOff className="w-8 h-8 text-rose-400" />
                      <p className="text-xs text-rose-300">{cameraError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startCamera(facingMode)}
                        className="text-xs text-white border-white/30 hover:bg-white/10"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    </div>
                  )}

                  {/* Camera controls overlay */}
                  {cameraReady && (
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-between p-3 bg-gradient-to-t from-black/70 to-transparent">
                      {/* Flip camera */}
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Flip camera"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {/* Capture button */}
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="w-14 h-14 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
                        title="Capture photo"
                      >
                        <Camera className="w-6 h-6" />
                      </button>

                      {/* Close camera */}
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Close camera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ---- Open Camera button ---- */
                capturedFiles.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startCamera(facingMode)}
                    disabled={isSubmitting}
                    className="w-full h-12 text-xs flex items-center justify-center gap-2 border-2 border-emerald-500/60 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📍 Open Live Camera</span>
                  </Button>
                )
              )}

              {/* GPS note */}
              {!cameraOpen && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Your GPS coordinates will be verified against the report site before submission.
                </p>
              )}
            </div>
          )}

          {/* Progress Banner */}
          {uploadProgress && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-primary font-medium text-xs animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-secondary/20 flex items-center justify-between gap-2.5">
          {!isRejecting && !isReopening ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || (isResolving && capturedFiles.length === 0) || cameraOpen}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip Note
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cameraOpen ? stopCamera : onClose}
              disabled={isSubmitting}
              className="text-xs hidden sm:inline-flex"
            >
              {cameraOpen ? 'Close Camera' : 'Cancel'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={
                isSubmitting ||
                cameraOpen ||
                (isResolving && capturedFiles.length === 0) ||
                (isRejecting && note.trim().length < 3) ||
                (isReopening && note.trim().length < 3)
              }
              className={`text-xs font-semibold px-4 flex items-center gap-1.5 ${
                isResolving
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : isRejecting
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm {badge.label}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
