'use client';

import { useState } from 'react';
import {
  Clock, CheckCircle, XCircle, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, UserCog, User, Shield, Bot,
  FileText, Camera, RotateCcw, ArrowRight,
} from 'lucide-react';

export interface HistoryEntry {
  _id: string;
  reportId: string;
  fromStatus?: string | null;
  toStatus?: string;
  note?: string;
  comment?: string;
  resolutionImages?: string[];
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  performedBy?: string;
  previousValue?: string;
  newValue?: string;
  actionType: string;
  timestamp: string;
  createdAt?: string;
  isSynthetic?: boolean;
}

interface StatusTimelineProps {
  history: HistoryEntry[];
  onImageClick?: (url: string) => void;
}

const ACTION_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: any;
  label: string;
}> = {
  created: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: FileText,
    label: 'Report Submitted',
  },
  status_changed: {
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    icon: ArrowRight,
    label: 'Status Changed',
  },
  resolved: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: CheckCircle,
    label: 'Issue Resolved',
  },
  reopened: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: RotateCcw,
    label: 'Report Reopened',
  },
  priority_changed: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: TrendingUp,
    label: 'Priority Escalated',
  },
  assigned: {
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    icon: UserCog,
    label: 'Report Assigned',
  },
  reassigned: {
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    icon: UserCog,
    label: 'Report Reassigned',
  },
};

const ROLE_BADGE: Record<string, { label: string; className: string; icon: any }> = {
  admin: {
    label: 'Administrator',
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: Shield,
  },
  manager: {
    label: 'Municipal Manager',
    className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    icon: UserCog,
  },
  supervisor: {
    label: 'Field Supervisor',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: UserCog,
  },
  user: {
    label: 'Citizen',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: User,
  },
  system: {
    label: 'System',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    icon: Bot,
  },
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusTransitionLabel(entry: HistoryEntry): string {
  if (entry.actionType === 'priority_changed') {
    const prev = entry.previousValue || entry.fromStatus || '?';
    const next = entry.newValue || entry.toStatus || '?';
    return `Priority: ${prev} → ${next}`;
  }
  if (entry.fromStatus && entry.toStatus) {
    return `${STATUS_LABELS[entry.fromStatus] || entry.fromStatus} → ${STATUS_LABELS[entry.toStatus] || entry.toStatus}`;
  }
  if (entry.toStatus) {
    return STATUS_LABELS[entry.toStatus] || entry.toStatus;
  }
  return '';
}

export default function StatusTimeline({ history, onImageClick }: StatusTimelineProps) {
  const INITIAL_SHOW = 3;
  const [expanded, setExpanded] = useState(false);

  const visibleEntries = expanded ? history : history.slice(0, INITIAL_SHOW);
  const hasMore = history.length > INITIAL_SHOW;

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        No history entries available for this report.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {visibleEntries.map((entry, index) => {
        const config = ACTION_CONFIG[entry.actionType] || ACTION_CONFIG.status_changed;
        const ActionIcon = config.icon;
        const actorRole = entry.actorRole || 'user';
        const roleBadge = ROLE_BADGE[actorRole] || ROLE_BADGE.user;
        const RoleIcon = roleBadge.icon;
        const entryNote = entry.note || entry.comment || '';
        const isLast = index === visibleEntries.length - 1;

        return (
          <div key={entry._id} className="relative flex gap-3">
            {/* Timeline vertical line */}
            {!isLast && (
              <div
                className="absolute left-[15px] top-[32px] bottom-0 w-[2px] bg-border/60"
                aria-hidden
              />
            )}

            {/* Timeline dot */}
            <div
              className={`relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border ${config.bgColor} ${config.borderColor}`}
            >
              <ActionIcon className={`w-3.5 h-3.5 ${config.color}`} />
            </div>

            {/* Content card */}
            <div className={`flex-1 pb-5 ${isLast ? 'pb-0' : ''}`}>
              <div
                className={`p-3.5 rounded-xl border ${config.borderColor} ${config.bgColor} space-y-2`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Action label */}
                    <span className={`text-xs font-bold ${config.color}`}>
                      {config.label}
                    </span>

                    {/* Status transition badge */}
                    {getStatusTransitionLabel(entry) && (
                      <span className="text-[10px] font-mono bg-background/60 border border-border/60 px-1.5 py-0.5 rounded text-foreground/80">
                        {getStatusTransitionLabel(entry)}
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(entry.timestamp || entry.createdAt || '')}
                  </span>
                </div>

                {/* Actor info */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-background/80 border border-border/60 flex items-center justify-center shrink-0">
                    <RoleIcon className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">
                    {entry.actorName || 'System'}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${roleBadge.className}`}
                  >
                    {roleBadge.label}
                  </span>
                </div>

                {/* Note */}
                {entryNote && (
                  <p className="text-[11px] text-foreground/80 leading-relaxed pl-7">
                    {entryNote}
                  </p>
                )}

                {/* Resolution image thumbnails */}
                {entry.resolutionImages && entry.resolutionImages.length > 0 && entry.actionType !== 'created' && (
                  <div className="flex gap-2 pl-7 pt-1 flex-wrap">
                    {entry.resolutionImages.map((img, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageClick?.(img);
                        }}
                        className="w-14 h-14 rounded-lg overflow-hidden border border-border/80 bg-secondary/50 cursor-pointer hover:border-primary transition-all shadow-xs group/thumb"
                      >
                        <img
                          src={img}
                          alt={`Evidence ${imgIdx + 1}`}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Expand / Collapse toggle */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Show full history ({history.length} entries)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
