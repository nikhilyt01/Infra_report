import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import User from '@/models/User';
import ReportHistory, { ActionType } from '@/models/ReportHistory';
import { validateStatusTransition } from '@/lib/reportLifecycle';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper to get user from token
function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// GET /api/reports/[id] - Get report by ID
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
      .populate({ path: 'assignedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'approvedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'initiatedBy', select: 'name email avatar', strictPopulate: false });
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await Report.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    // Viewing stays public, but if the caller happens to be signed in we tell
    // them whether they've already upvoted, so the button renders correctly on
    // a fresh page load. The voter list itself stays server-side.
    const viewer = getUserFromToken(request);
    const reportObj: any = report.toObject();
    const upvoted = viewer
      ? (reportObj.upvotedBy || []).includes(String(viewer.userId))
      : false;
    delete reportObj.upvotedBy;

    return NextResponse.json({
      success: true,
      data: { ...reportObj, upvoted },
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

// PATCH /api/reports/[id] - Update report (managers and admins only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // The global middleware skips /api entirely, so this route has to gate
    // itself — otherwise anyone could change any report's status or priority.
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (user.role !== 'manager' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only managers and admins can update reports' },
        { status: 403 }
      );
    }
    if (user.role === 'manager' && !user.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Your manager account is pending admin approval' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const report = await Report.findById(id);

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Retrieve full actor details from DB
    const dbUser = await User.findById(user.userId).select('name email role');
    const actorId = String(user.userId);
    const actorName = dbUser?.name || user.email || 'Municipal Staff';
    const actorRole = dbUser?.role || user.role;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    const updates: any = {};

    // 1. Status Transition & Validation
    if (body.status !== undefined && body.status !== report.status) {
      const resImages: string[] = Array.isArray(body.resolutionImages)
        ? body.resolutionImages.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
        : [];

      const transitionValidation = validateStatusTransition(report.status, body.status, {
        note: body.note || body.resolutionNote,
        reason: body.reason,
        resolutionImages: resImages,
        userRole: actorRole,
      });

      if (!transitionValidation.valid) {
        return NextResponse.json(
          { success: false, error: transitionValidation.error || 'Invalid status transition' },
          { status: transitionValidation.statusCode || 400 }
        );
      }

      const noteText = (body.note || body.reason || body.resolutionNote || '').trim();

      let actionType: ActionType = 'status_changed';
      if (body.status === 'resolved') {
        actionType = 'resolved';
      } else if (transitionValidation.isReopen) {
        actionType = 'reopened';
      }

      // Create immutable history entry for the status change
      await ReportHistory.create({
        reportId: String(report._id),
        fromStatus: report.status,
        toStatus: body.status,
        note: noteText || undefined,
        resolutionImages: resImages,
        actorId,
        actorName,
        actorRole,
        actionType,
        performedBy: actorId,
        previousValue: report.status,
        newValue: body.status,
        comment: noteText || undefined,
        timestamp: new Date(),
        ipAddress,
      });

      updates.status = body.status;

      if (noteText) {
        updates.latestStatusNote = noteText;
      }

      if (body.status === 'resolved') {
        updates.resolvedAt = new Date();
        updates.resolutionImages = resImages;
        if (noteText) {
          updates.resolutionNote = noteText;
        }
      }

      if (body.status === 'in_progress' && !report.initiatedBy) {
        updates.initiatedBy = actorId;
        updates.initiatedAt = new Date();
      }
    }

    // 2. Assignment Handling
    if (body.assignedTo !== undefined && String(body.assignedTo || '') !== String(report.assignedTo || '')) {
      let assigneeName = 'Unassigned';
      if (body.assignedTo) {
        const assignee = await User.findById(body.assignedTo).select('name email role');
        assigneeName = assignee?.name || 'Staff Member';
      }

      const assignNote = (
        body.assignmentNote ||
        body.note ||
        (body.assignedTo ? `Assigned report to ${assigneeName}` : 'Report unassigned')
      ).trim();

      await ReportHistory.create({
        reportId: String(report._id),
        fromStatus: updates.status || report.status,
        toStatus: updates.status || report.status,
        note: assignNote,
        resolutionImages: [],
        actorId,
        actorName,
        actorRole,
        actionType: report.assignedTo ? 'reassigned' : 'assigned',
        performedBy: actorId,
        previousValue: report.assignedTo ? String(report.assignedTo) : undefined,
        newValue: body.assignedTo ? String(body.assignedTo) : undefined,
        comment: assignNote,
        timestamp: new Date(),
        ipAddress,
      });

      updates.assignedTo = body.assignedTo || null;
      updates.assignedBy = actorId;
      updates.assignedAt = new Date();
    }

    // 3. Priority changes
    if (body.priority !== undefined && body.priority !== report.priority) {
      updates.priority = body.priority;

      await ReportHistory.create({
        reportId: String(report._id),
        fromStatus: updates.status || report.status,
        toStatus: updates.status || report.status,
        note: `Priority changed from ${report.priority} to ${body.priority}`,
        resolutionImages: [],
        actorId,
        actorName,
        actorRole,
        actionType: 'priority_changed',
        performedBy: actorId,
        previousValue: report.priority,
        newValue: body.priority,
        comment: `Priority updated to ${body.priority}`,
        timestamp: new Date(),
        ipAddress,
      });
    }

    // 4. Initial Approval tracking
    if (body.approvedBy !== undefined && !report.approvedBy) {
      updates.approvedBy = actorId;
      updates.approvedAt = new Date();
    }

    // 5. Estimated resolution date
    if (body.estimatedResolutionDate !== undefined) {
      updates.estimatedResolutionDate = body.estimatedResolutionDate;
    }

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate({ path: 'reportedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'assignedTo', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'assignedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'approvedBy', select: 'name email avatar', strictPopulate: false })
      .populate({ path: 'initiatedBy', select: 'name email avatar', strictPopulate: false });

    return NextResponse.json({
      success: true,
      data: updatedReport,
      message: 'Report updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update report' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete report (admins only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Destructive and irreversible, so it's restricted to admins. No UI calls
    // this today; it was previously reachable by anyone.
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete reports' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;

    const report = await Report.findByIdAndDelete(id);
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete report' },
      { status: 500 }
    );
  }
}
