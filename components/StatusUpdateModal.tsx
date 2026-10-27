'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Upload, Trash2, Loader2, CheckCircle2, 
  AlertTriangle, ArrowRight, ShieldAlert, Sparkles 
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
}

export default function StatusUpdateModal({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  currentStatus,
  targetStatus,
  onSuccess,
}: StatusUpdateModalProps) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isResolving = targetStatus === 'resolved';
  const isRejecting = targetStatus === 'rejected';
  const isTerminal = ['resolved', 'rejected', 'closed'].includes(currentStatus);
  const isReopening = isTerminal && ['in_progress', 'under_review', 'submitted'].includes(targetStatus);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setNote('');
      setSelectedFiles([]);
      setImagePreviews([]);
      setIsSubmitting(false);
      setUploadProgress('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, targetStatus]);

  // Clean up blob preview URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviews]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isSubmitting) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedFiles.length + files.length > 4) {
      toast.warning('Maximum 4 resolution photos allowed');
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } else {
        toast.error(`"${file.name}" is not a valid image file.`);
      }
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);

    // Reset input value so same file can be re-selected if removed
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    if (imagePreviews[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (skipNote = false) => {
    const noteText = skipNote ? '' : note.trim();

    // Rejection validation
    if (isRejecting && noteText.length < 3) {
      toast.error('Please provide a reason to reject this report');
      textareaRef.current?.focus();
      return;
    }

    // Reopening validation
    if (isReopening && noteText.length < 3) {
      toast.error('A reason is required to reopen this report');
      textareaRef.current?.focus();
      return;
    }

    // Resolution validation
    if (isResolving && selectedFiles.length === 0) {
      toast.error('Please upload at least 1 resolution photo as evidence');
      return;
    }

    setIsSubmitting(true);

    try {
      let resolutionImages: string[] = [];

      // If resolving, upload files first via /api/upload
      if (isResolving && selectedFiles.length > 0) {
        setUploadProgress('Uploading resolution evidence...');
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('files', file));

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

      setUploadProgress('Updating report status...');

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

      // Show specific toast message
      if (isResolving) {
        toast.success('Report marked as resolved with photo evidence!', 'Resolution Verified');
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
        if (!isSubmitting && e.target === e.currentTarget) onClose();
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
            onClick={onClose}
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

          {/* Evidence Image Uploader (Required for Resolved) */}
          {isResolving && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Resolution Photo Evidence *</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    At least 1 resolution photo is required to prove the work is completed.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {selectedFiles.length} / 4
                </span>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {imagePreviews.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border/80 bg-secondary/40 group shadow-xs"
                    >
                      <img
                        src={url}
                        alt={`Resolution proof #${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        disabled={isSubmitting}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-destructive text-white transition-colors"
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Actions (File Picker & Camera Capture) */}
              {selectedFiles.length < 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* File browser */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="h-10 text-xs flex items-center justify-center gap-2 border-dashed border-border/80 hover:border-primary"
                  >
                    <Upload className="w-4 h-4 text-primary" />
                    <span>Choose Photos</span>
                  </Button>

                  {/* Direct Camera Capture (Mobile-friendly) */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="h-10 text-xs flex items-center justify-center gap-2 border-dashed border-border/80 hover:border-primary"
                  >
                    <Camera className="w-4 h-4 text-emerald-500" />
                    <span>Take Live Camera Photo</span>
                  </Button>
                </div>
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

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-secondary/20 flex items-center justify-between gap-2.5">
          {/* Skip button for optional note (non-rejecting, non-reopening) */}
          {!isRejecting && !isReopening ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || (isResolving && selectedFiles.length === 0)}
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
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs hidden sm:inline-flex"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={
                isSubmitting ||
                (isResolving && selectedFiles.length === 0) ||
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
                  <span>Submitting...</span>
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
