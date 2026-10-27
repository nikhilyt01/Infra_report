import { ReportStatus } from '@/models/Report';

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
  isReopen?: boolean;
}

export interface TransitionOptions {
  note?: string;
  reason?: string;
  resolutionImages?: string[];
  userRole?: string;
}

export const TERMINAL_STATUSES: ReportStatus[] = ['resolved', 'rejected', 'closed'];
export const PENDING_STATUSES: ReportStatus[] = ['submitted', 'under_review'];

/**
 * Checks whether a given status is terminal (cannot be transitioned away without admin reopen).
 */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as ReportStatus);
}

/**
 * Validates status transitions on the server.
 * Enforces evidence rules (images for resolved, reasons for rejection/reopen).
 */
export function validateStatusTransition(
  fromStatus: string,
  toStatus: string,
  options: TransitionOptions = {}
): TransitionValidationResult {
  // If no change in status, transition is trivially valid
  if (fromStatus === toStatus) {
    return { valid: true };
  }

  const { note, reason, resolutionImages, userRole } = options;
  const explanation = (reason || note || '').trim();

  // Rule: Terminal states (resolved, rejected, closed) can ONLY be reopened by an admin with a logged reason
  if (isTerminalStatus(fromStatus)) {
    if (userRole !== 'admin') {
      return {
        valid: false,
        statusCode: 403,
        error: 'Only administrators can reopen resolved or rejected reports.',
      };
    }

    if (!explanation) {
      return {
        valid: false,
        statusCode: 400,
        error: 'A reason is required to reopen this report.',
      };
    }

    const allowedReopenTargets = ['in_progress', 'under_review', 'submitted'];
    if (!allowedReopenTargets.includes(toStatus)) {
      return {
        valid: false,
        statusCode: 400,
        error: `Cannot reopen report to status "${toStatus}". Allowed statuses: ${allowedReopenTargets.join(', ')}.`,
      };
    }

    return { valid: true, isReopen: true };
  }

  // Non-terminal transitions:
  switch (toStatus) {
    case 'in_progress': {
      // Allowed from pending (submitted or under_review)
      if (!PENDING_STATUSES.includes(fromStatus as ReportStatus)) {
        return {
          valid: false,
          statusCode: 400,
          error: `Cannot transition to "In Progress" from current status "${fromStatus}". Report must be Pending (Submitted / Under Review).`,
        };
      }
      return { valid: true };
    }

    case 'under_review': {
      // Allowed from submitted
      if (fromStatus !== 'submitted') {
        return {
          valid: false,
          statusCode: 400,
          error: `Cannot move to "Under Review" from "${fromStatus}". Only submitted reports can be put under review.`,
        };
      }
      return { valid: true };
    }

    case 'resolved': {
      // Rule: In Progress -> Resolved (REQUIRES at least 1 "after/resolution" image; note optional)
      if (fromStatus !== 'in_progress') {
        return {
          valid: false,
          statusCode: 400,
          error: 'Report must be "In Progress" before it can be marked as resolved.',
        };
      }

      if (!Array.isArray(resolutionImages) || resolutionImages.length === 0) {
        return {
          valid: false,
          statusCode: 400,
          error: 'At least one resolution image is required to mark the report as resolved.',
        };
      }

      // Filter and validate resolution images
      const validImages = resolutionImages.filter(
        (img) => typeof img === 'string' && img.trim().length > 0
      );

      if (validImages.length === 0) {
        return {
          valid: false,
          statusCode: 400,
          error: 'At least one valid resolution image URL is required.',
        };
      }

      if (validImages.length > 10) {
        return {
          valid: false,
          statusCode: 400,
          error: 'Maximum 10 resolution images allowed.',
        };
      }

      // Ensure each image is a URL, local upload path, or data URI
      for (const img of validImages) {
        const isUrl =
          img.startsWith('http://') ||
          img.startsWith('https://') ||
          img.startsWith('/uploads/') ||
          img.startsWith('data:image/');
        if (!isUrl) {
          return {
            valid: false,
            statusCode: 400,
            error: 'Invalid resolution image path or URL format.',
          };
        }
      }

      return { valid: true };
    }

    case 'rejected': {
      // Rule: Pending/In Progress -> Rejected (REQUIRES a reason text; image optional)
      const allowedToReject = [...PENDING_STATUSES, 'in_progress'];
      if (!allowedToReject.includes(fromStatus as ReportStatus)) {
        return {
          valid: false,
          statusCode: 400,
          error: `Cannot reject report from current status "${fromStatus}".`,
        };
      }

      if (!explanation || explanation.length < 3) {
        return {
          valid: false,
          statusCode: 400,
          error: 'A reason is required to reject the report.',
        };
      }

      return { valid: true };
    }

    case 'closed': {
      // Closed can only be transitioned from resolved
      if (fromStatus !== 'resolved') {
        return {
          valid: false,
          statusCode: 400,
          error: 'Only resolved reports can be closed.',
        };
      }
      return { valid: true };
    }

    default:
      return {
        valid: false,
        statusCode: 400,
        error: `Invalid status transition from "${fromStatus}" to "${toStatus}".`,
      };
  }
}
