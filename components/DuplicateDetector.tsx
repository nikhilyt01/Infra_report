'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertTriangle, ThumbsUp, ArrowRight, X, Loader2,
  MapPin, Clock, CheckCircle2, RefreshCw, ExternalLink
} from 'lucide-react';

export interface DuplicateReport {
  _id: string;
  title: string;
  category: string;
  status: string;
  upvotes: number;
  userHasUpvoted?: boolean;
  thumbnail: string | null;
  address: string;
  createdAt: string;
  distanceMeters: number;
}

interface DuplicateDetectorProps {
  lng: number;
  lat: number;
  category: string;
  /** Called when the search returns results or clears */
  onDuplicatesFound?: (hasDuplicates: boolean, count: number) => void;
  /** Called when the user confirms their report is unique */
  onConfirmUnique: () => void;
  /** Called when the user upvotes an existing report and wants to discard theirs */
  onUpvotedExisting: (reportId: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  under_review: { label: 'Under Review', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

function timeAgo(dateString: string) {
  const s = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function DuplicateDetector({
  lng,
  lat,
  category,
  onDuplicatesFound,
  onConfirmUnique,
  onUpvotedExisting,
}: DuplicateDetectorProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [duplicates, setDuplicates] = useState<DuplicateReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!lng || !lat || !category.trim()) return;
    setLoading(true);
    setDismissed(false);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `/api/reports/check-duplicate?lng=${lng}&lat=${lat}&category=${encodeURIComponent(category)}`
      );
      const data = await res.json();
      if (data.success) {
        const found: DuplicateReport[] = data.data || [];
        setDuplicates(found);

        // Pre-populate already upvoted items from DB check
        const initialUpvoted = new Set<string>();
        found.forEach((r) => {
          if (r.userHasUpvoted) initialUpvoted.add(r._id);
        });
        setUpvotedIds(initialUpvoted);

        onDuplicatesFound?.(found.length > 0, found.length);
      } else {
        onDuplicatesFound?.(false, 0);
      }
    } catch {
      onDuplicatesFound?.(false, 0);
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [lng, lat, category, onDuplicatesFound]);

  // Auto-run with debounce when all inputs are ready
  useEffect(() => {
    if (lng && lat && category.trim().length >= 2) {
      const timer = setTimeout(check, 400);
      return () => clearTimeout(timer);
    }
  }, [lng, lat, category, check]);

  // Handle upvoting an existing report & skipping duplicate creation
  const handleUpvoteAndSkip = async (report: DuplicateReport) => {
    setUpvotingId(report._id);
    setStatusMessage(`Registering support for "${report.title}"...`);

    try {
      const isAlreadyUpvoted = report.userHasUpvoted || upvotedIds.has(report._id);

      if (!isAlreadyUpvoted) {
        const res = await fetch(`/api/reports/${report._id}/upvote`, { method: 'POST' });
        const data = await res.json();

        if (res.status === 401) {
          setStatusMessage('Please sign in to upvote. Redirecting to report...');
          setTimeout(() => router.push(`/${locale}/reports/${report._id}`), 1000);
          return;
        }

        if (data.success) {
          setUpvotedIds((prev) => new Set([...prev, report._id]));
          setDuplicates((prev) =>
            prev.map((d) =>
              d._id === report._id
                ? { ...d, upvotes: data.data.upvotes, userHasUpvoted: true }
                : d
            )
          );
        }
      }

      setStatusMessage('✓ Upvoted! Skipping duplicate & opening report...');
      setTimeout(() => {
        onUpvotedExisting(report._id);
      }, 700);
    } catch {
      setStatusMessage('Opening existing report...');
      setTimeout(() => {
        onUpvotedExisting(report._id);
      }, 700);
    } finally {
      setUpvotingId(null);
    }
  };

  const handleConfirmDifferent = () => {
    setDismissed(true);
    onConfirmUnique();
  };

  if (!checked && !loading) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-800 dark:text-amber-300 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
        <span>Scanning 50m radius for existing reports in this category…</span>
      </div>
    );
  }

  if (duplicates.length === 0 || dismissed) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-amber-500/5 overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-500/20 border-b border-amber-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {duplicates.length} similar issue{duplicates.length > 1 ? 's' : ''} already reported nearby!
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Within 50m · Category: <span className="font-semibold">{category}</span> · Currently Active
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 p-1.5 rounded-lg transition-colors"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 bg-amber-500/15 text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2 border-b border-amber-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Matching Reports Cards */}
      <div className="divide-y divide-amber-500/20">
        {duplicates.map((report) => {
          const isUpvoted = report.userHasUpvoted || upvotedIds.has(report._id);
          const isThisUpvoting = upvotingId === report._id;
          const statusInfo = STATUS_LABELS[report.status] ?? {
            label: report.status,
            color: 'bg-secondary text-muted-foreground border-border',
          };

          return (
            <div
              key={report._id}
              onClick={() => handleUpvoteAndSkip(report)}
              className={`flex items-start gap-3.5 p-4 transition-all cursor-pointer select-none group
                ${isUpvoted ? 'bg-amber-500/10 opacity-75' : 'hover:bg-amber-500/15 active:scale-[0.99]'}`}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-secondary border border-border/70 shadow-2xs">
                {report.thumbnail ? (
                  <img
                    src={report.thumbnail}
                    alt={report.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/40">
                    <MapPin className="w-5 h-5 opacity-40" />
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {report.title}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                    <MapPin className="w-3 h-3 text-amber-600" />
                    {report.distanceMeters}m away
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className={`w-3 h-3 ${isUpvoted ? 'text-primary fill-primary' : ''}`} />
                    <span className="font-semibold">{report.upvotes}</span> upvotes
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(report.createdAt)}
                  </span>
                </div>

                {report.address && (
                  <p className="text-[11px] text-muted-foreground truncate">{report.address}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleUpvoteAndSkip(report)}
                    disabled={isThisUpvoting || upvotingId !== null}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs
                      ${isUpvoted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isThisUpvoting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? 'fill-white' : ''}`} />
                    )}
                    <span>
                      {isThisUpvoting
                        ? 'Processing…'
                        : isUpvoted
                        ? 'Already Upvoted — Skip & View'
                        : 'This is it — Upvote & Skip'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/reports/${report._id}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                      text-muted-foreground hover:text-foreground hover:bg-secondary transition-all border border-border/70"
                  >
                    <span>View Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Escape Hatch Footer */}
      <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          Not the same issue? You can proceed to submit yours as a distinct report.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={check}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
          >
            <RefreshCw className="w-3 h-3" />
            Re-check
          </button>
          <button
            type="button"
            onClick={handleConfirmDifferent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
              bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
          >
            <span>No, mine is different — continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
