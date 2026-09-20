import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
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
      .populate('reportedBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('approvedBy', 'name email avatar')
      .populate('initiatedBy', 'name email avatar');
    
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

    // Update allowed fields. approvedBy/initiatedBy are deliberately absent —
    // they identify who acted, so they're taken from the token below rather
    // than from the request body.
    const allowedFields = [
      'status',
      'priority',
      'assignedTo',
      'resolutionNote',
      'resolutionImages',
      'estimatedResolutionDate',
    ];

    const updates: any = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    // Set resolvedAt if status changed to resolved
    if (body.status === 'resolved' && report.status !== 'resolved') {
      updates.resolvedAt = new Date();
    }

    // Attribute the approval to the caller, not to whoever the body names.
    if (body.approvedBy !== undefined && !report.approvedBy) {
      updates.approvedBy = String(user.userId);
      updates.approvedAt = new Date();
    }

    // Same for whoever kicked off the work, on the first move to in_progress.
    if (body.status === 'in_progress' && report.status !== 'in_progress') {
      updates.initiatedBy = String(user.userId);
      updates.initiatedAt = new Date();
    }
    
    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('approvedBy', 'name email avatar')
      .populate('initiatedBy', 'name email avatar');
    
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
