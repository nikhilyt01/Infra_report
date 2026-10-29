import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Notification, { NotificationType } from '@/models/Notification';
import Report from '@/models/Report';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface DecodedAuthToken {
  userId?: string;
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
  name?: string;
}

/**
 * Extracts and verifies the authenticated user from the request cookie.
 */
export function getUserFromToken(request: NextRequest): DecodedAuthToken | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as DecodedAuthToken;
  } catch {
    return null;
  }
}

/**
 * Triggered when a report transitions to 'resolved'.
 * Creates a notification for:
 * (a) the original reporter
 * (b) every user who upvoted the report
 * Deduplicates recipients and excludes the actor who performed the resolution.
 */
export async function notifyReportResolved(
  reportId: string | mongoose.Types.ObjectId,
  actorId: string,
  actorName?: string
) {
  try {
    await connectDB();

    const report = await Report.findById(reportId).lean();
    if (!report) return [];

    const recipientsSet = new Set<string>();

    // (a) Original reporter
    const reporterId = report.reportedBy ? String((report.reportedBy as any)._id || report.reportedBy) : null;
    if (reporterId && reporterId !== String(actorId)) {
      recipientsSet.add(reporterId);
    }

    // (b) Upvoters
    if (Array.isArray(report.upvotedBy)) {
      for (const voter of report.upvotedBy) {
        const voterId = voter ? String((voter as any)._id || voter) : null;
        if (voterId && voterId !== String(actorId)) {
          recipientsSet.add(voterId);
        }
      }
    }

    const recipientIds = Array.from(recipientsSet);
    if (recipientIds.length === 0) return [];

    const notificationsToInsert = recipientIds.map((userId) => ({
      recipient: new mongoose.Types.ObjectId(userId),
      type: 'report_resolved' as NotificationType,
      title: `Issue Resolved: ${report.title}`,
      message: `Your reported or supported issue "${report.title}" has been resolved by our municipal field team.`,
      link: `/reports/${report._id}`,
      reportId: report._id,
      isRead: false,
      readAt: null,
      metadata: {
        actorId,
        actorName: actorName || 'Municipal Team',
        resolvedAt: new Date(),
      },
    }));

    return await Notification.insertMany(notificationsToInsert);
  } catch (err) {
    console.error('Failed to create report resolved notifications:', err);
    return [];
  }
}

/**
 * Triggered when a new supervisor registers with role 'supervisor'.
 * Creates a notification for all active managers and admins.
 */
export async function notifySupervisorSignup(
  supervisorId: string | mongoose.Types.ObjectId,
  supervisorName: string,
  supervisorCode: string
) {
  try {
    await connectDB();

    const managers = await User.find({
      role: { $in: ['manager', 'admin'] },
      isActive: true,
    }).select('_id email name');

    if (!managers || managers.length === 0) return [];

    const notificationsToInsert = managers.map((mgr) => ({
      recipient: mgr._id,
      type: 'supervisor_signup' as NotificationType,
      title: 'Field Supervisor Registration',
      message: `${supervisorName} (${supervisorCode}) registered as a Field Supervisor and is awaiting activation.`,
      link: '/dashboard/manager',
      relatedUserId: new mongoose.Types.ObjectId(String(supervisorId)),
      isRead: false,
      readAt: null,
      metadata: {
        supervisorId: String(supervisorId),
        supervisorCode,
        supervisorName,
      },
    }));

    return await Notification.insertMany(notificationsToInsert);
  } catch (err) {
    console.error('Failed to create supervisor signup notifications:', err);
    return [];
  }
}

/**
 * Automatically marks all supervisor approval notifications related to this supervisor as read.
 * Called in the same API call when a manager approves or revokes a supervisor.
 */
export async function markSupervisorNotificationsRead(
  supervisorId: string | mongoose.Types.ObjectId
) {
  try {
    await connectDB();

    const supervisorObjectId = mongoose.Types.ObjectId.isValid(supervisorId)
      ? new mongoose.Types.ObjectId(String(supervisorId))
      : supervisorId;

    const result = await Notification.updateMany(
      {
        type: 'supervisor_signup',
        relatedUserId: supervisorObjectId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return result;
  } catch (err) {
    console.error('Failed to mark supervisor notifications as read:', err);
    return null;
  }
}

/**
 * Triggered when a manager approves a supervisor account.
 * Creates an activation notification for the supervisor.
 */
export async function notifySupervisorApproved(
  supervisorId: string | mongoose.Types.ObjectId,
  supervisorName: string,
  managerName?: string
) {
  try {
    await connectDB();
    const recipientId = new mongoose.Types.ObjectId(String(supervisorId));

    return await Notification.create({
      recipient: recipientId,
      type: 'supervisor_approved' as NotificationType,
      title: 'Supervisor Account Approved 🎉',
      message: `Your supervisor account has been approved by ${managerName || 'Municipal Manager'}. You can now view and resolve assigned field reports.`,
      link: '/dashboard/supervisor',
      relatedUserId: recipientId,
      isRead: false,
      readAt: null,
      metadata: {
        supervisorName,
        approvedBy: managerName,
        approvedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to notify supervisor approved:', err);
    return null;
  }
}

/**
 * Triggered when a manager assigns a report to a supervisor.
 */
export async function notifyReportAssigned({
  reportId,
  reportTitle,
  category,
  area,
  supervisorId,
  managerName,
}: {
  reportId: string | mongoose.Types.ObjectId;
  reportTitle: string;
  category?: string;
  area?: string;
  supervisorId: string | mongoose.Types.ObjectId;
  managerName?: string;
}) {
  try {
    await connectDB();
    const recipientId = new mongoose.Types.ObjectId(String(supervisorId));
    const loc = area ? ` at ${area}` : '';
    const cat = category ? ` (${category})` : '';

    return await Notification.create({
      recipient: recipientId,
      type: 'report_assigned' as NotificationType,
      title: `New Task Assigned: ${reportTitle}`,
      message: `You have been assigned to handle "${reportTitle}"${cat}${loc} by ${managerName || 'Municipal Manager'}.`,
      link: `/reports/${reportId}`,
      reportId: new mongoose.Types.ObjectId(String(reportId)),
      isRead: false,
      readAt: null,
      metadata: {
        assignedBy: managerName,
        assignedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to notify report assigned:', err);
    return null;
  }
}

/**
 * Triggered when a report is unassigned or reassigned away from a supervisor.
 */
export async function notifyReportUnassigned({
  reportId,
  reportTitle,
  supervisorId,
  managerName,
}: {
  reportId: string | mongoose.Types.ObjectId;
  reportTitle: string;
  supervisorId: string | mongoose.Types.ObjectId;
  managerName?: string;
}) {
  try {
    await connectDB();
    const recipientId = new mongoose.Types.ObjectId(String(supervisorId));

    return await Notification.create({
      recipient: recipientId,
      type: 'general' as NotificationType,
      title: `Assignment Updated: ${reportTitle}`,
      message: `Report "${reportTitle}" is no longer assigned to you. Updated by ${managerName || 'Municipal Manager'}.`,
      link: `/reports/${reportId}`,
      reportId: new mongoose.Types.ObjectId(String(reportId)),
      isRead: false,
      readAt: null,
      metadata: {
        reassignedBy: managerName,
        unassignedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to notify report unassigned:', err);
    return null;
  }
}

/**
 * Triggered when an assigned report priority escalates to high or urgent via citizen upvotes.
 */
export async function notifyUrgentEscalation({
  reportId,
  reportTitle,
  supervisorId,
  newPriority,
  upvoteCount,
}: {
  reportId: string | mongoose.Types.ObjectId;
  reportTitle: string;
  supervisorId: string | mongoose.Types.ObjectId;
  newPriority: string;
  upvoteCount?: number;
}) {
  try {
    await connectDB();
    const recipientId = new mongoose.Types.ObjectId(String(supervisorId));

    return await Notification.create({
      recipient: recipientId,
      type: 'urgent_escalation' as NotificationType,
      title: `Priority Escalated: ${reportTitle}`,
      message: `Your assigned task "${reportTitle}" has escalated to ${newPriority.toUpperCase()} priority (${upvoteCount || 0} citizen upvotes). Immediate attention recommended.`,
      link: `/reports/${reportId}`,
      reportId: new mongoose.Types.ObjectId(String(reportId)),
      isRead: false,
      readAt: null,
      metadata: {
        priority: newPriority,
        upvotes: upvoteCount,
        escalatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to notify urgent escalation:', err);
    return null;
  }
}

