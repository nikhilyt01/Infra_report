import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import ReportHistory from '@/models/ReportHistory';
import User from '@/models/User';

// GET /api/reports/[id]/history - Retrieve complete audit trail history for a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const report = await Report.findById(id)
      .populate({ path: 'reportedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'assignedTo', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'approvedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'initiatedBy', select: 'name email avatar', strictPopulate: false });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const rep: any = report;

    // Fetch existing immutable history entries, oldest first for chronological timeline
    const rawHistory = await ReportHistory.find({ reportId: id }).sort({ createdAt: 1, timestamp: 1 });

    // Collect user IDs needing lookup
    const userIdsToFetch = new Set<string>();
    rawHistory.forEach((h: any) => {
      const uId = h.actorId || h.performedBy;
      if (uId && typeof uId === 'string' && uId.length === 24) {
        userIdsToFetch.add(uId);
      }
    });

    const foundUsers = userIdsToFetch.size > 0
      ? await User.find({ _id: { $in: Array.from(userIdsToFetch) } }).select('name email role')
      : [];
    const userMap = new Map<string, any>();
    foundUsers.forEach((u: any) => userMap.set(String(u._id), u));

    // Normalize and enrich each history entry
    const history = rawHistory.map((h: any) => {
      const entry = h.toObject ? h.toObject() : { ...h };
      const actorUser = userMap.get(String(entry.actorId || entry.performedBy || ''));

      const fromStatus = entry.fromStatus !== undefined ? entry.fromStatus : entry.previousValue;
      const toStatus = entry.toStatus || entry.newValue;
      const note = entry.note || entry.comment;
      
      let actorName = entry.actorName;
      let actorRole = entry.actorRole;

      if (!actorName && actorUser) {
        actorName = actorUser.name || actorUser.email;
      }
      if (!actorRole && actorUser) {
        actorRole = actorUser.role;
      }

      // Fallbacks if user details are missing
      if (!actorName || !actorRole) {
        if (entry.actionType === 'created') {
          actorName = actorName || rep.reportedBy?.name || 'Citizen';
          actorRole = actorRole || 'user';
        } else if (entry.actionType === 'priority_changed' && (entry.comment?.includes('demand') || entry.comment?.includes('upvote'))) {
          actorName = actorName || 'Community Signal';
          actorRole = actorRole || 'system';
        } else {
          actorName = actorName || rep.approvedBy?.name || 'Municipal Officer';
          actorRole = actorRole || 'manager';
        }
      }

      let resImages = entry.resolutionImages;
      if (entry.actionType === 'resolved' && (!resImages || resImages.length === 0)) {
        resImages = rep.resolutionImages || [];
      }

      return {
        ...entry,
        fromStatus,
        toStatus,
        note,
        actorName,
        actorRole,
        resolutionImages: resImages,
      };
    });

    // Backward compatibility: If no history exists, synthesize sensible default entries from report data
    if (!history || history.length === 0) {
      const syntheticEntries: any[] = [
        {
          _id: `synth-${report._id}-created`,
          reportId: String(report._id),
          fromStatus: null,
          toStatus: 'submitted',
          note: 'Issue reported by citizen',
          resolutionImages: report.images || [],
          actorId: rep.reportedBy?._id ? String(rep.reportedBy._id) : undefined,
          actorName: rep.reportedBy?.name || 'Citizen',
          actorRole: 'user',
          actionType: 'created',
          createdAt: report.createdAt || new Date(),
          timestamp: report.createdAt || new Date(),
          isSynthetic: true,
        },
      ];

      if (rep.approvedBy && rep.approvedAt) {
        syntheticEntries.push({
          _id: `synth-${report._id}-approved`,
          reportId: String(report._id),
          fromStatus: 'submitted',
          toStatus: 'under_review',
          note: 'Report reviewed and approved by municipal officer',
          resolutionImages: [],
          actorId: rep.approvedBy._id ? String(rep.approvedBy._id) : undefined,
          actorName: rep.approvedBy.name || 'Municipal Officer',
          actorRole: 'manager',
          actionType: 'status_changed',
          createdAt: rep.approvedAt,
          timestamp: rep.approvedAt,
          isSynthetic: true,
        });
      }

      if (rep.initiatedBy && rep.initiatedAt) {
        syntheticEntries.push({
          _id: `synth-${report._id}-initiated`,
          reportId: String(report._id),
          fromStatus: rep.approvedBy ? 'under_review' : 'submitted',
          toStatus: 'in_progress',
          note: 'Field repair work initiated',
          resolutionImages: [],
          actorId: rep.initiatedBy._id ? String(rep.initiatedBy._id) : undefined,
          actorName: rep.initiatedBy.name || 'Field Officer',
          actorRole: 'manager',
          actionType: 'status_changed',
          createdAt: rep.initiatedAt,
          timestamp: rep.initiatedAt,
          isSynthetic: true,
        });
      }

      if (report.status === 'resolved') {
        syntheticEntries.push({
          _id: `synth-${report._id}-resolved`,
          reportId: String(report._id),
          fromStatus: 'in_progress',
          toStatus: 'resolved',
          note: report.resolutionNote || 'Issue resolved and verified',
          resolutionImages: report.resolutionImages || [],
          actorId: rep.approvedBy?._id ? String(rep.approvedBy._id) : undefined,
          actorName: rep.approvedBy?.name || 'Municipal Team',
          actorRole: 'manager',
          actionType: 'resolved',
          createdAt: report.resolvedAt || report.updatedAt || new Date(),
          timestamp: report.resolvedAt || report.updatedAt || new Date(),
          isSynthetic: true,
        });
      }

      return NextResponse.json({
        success: true,
        count: syntheticEntries.length,
        data: syntheticEntries,
      });
    }

    // If history exists, ensure a created entry is at the start for legacy reports
    const hasCreatedEntry = history.some(
      (h: any) => h.actionType === 'created' || h.fromStatus === null || h.fromStatus === undefined
    );

    let finalHistory = history;
    if (!hasCreatedEntry) {
      const syntheticCreation = {
        _id: `synth-${report._id}-created`,
        reportId: String(report._id),
        fromStatus: null,
        toStatus: 'submitted',
        note: 'Issue reported by citizen',
        resolutionImages: report.images || [],
        actorId: rep.reportedBy?._id ? String(rep.reportedBy._id) : undefined,
        actorName: rep.reportedBy?.name || 'Citizen',
        actorRole: 'user',
        actionType: 'created',
        createdAt: report.createdAt || new Date(),
        timestamp: report.createdAt || new Date(),
        isSynthetic: true,
      };
      finalHistory = [syntheticCreation as any, ...history];
    }

    return NextResponse.json({
      success: true,
      count: finalHistory.length,
      data: finalHistory,
    });
  } catch (error: any) {
    console.error('Error fetching report history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch report history' },
      { status: 500 }
    );
  }
}
