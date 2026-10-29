import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { markSupervisorNotificationsRead, notifySupervisorApproved } from '@/lib/notifications';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// PUT /api/manager/supervisors/[id] - Approve or reject supervisor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();

    const requester = await User.findById(decoded.userId);
    if (!requester || (requester.role !== 'manager' && requester.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager or Admin only.' },
        { status: 403 }
      );
    }

    if (requester.role === 'manager' && !requester.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Manager account pending approval' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action || 'approve'; // 'approve' or 'reject'

    const targetUser = await User.findById(id);
    if (!targetUser || targetUser.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, error: 'Supervisor not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      targetUser.isApproved = true;
      targetUser.approvedBy = String(requester._id);
      targetUser.approvedAt = new Date();
      if (requester.municipalityId && !targetUser.municipalityId) {
        targetUser.municipalityId = requester.municipalityId;
      }
      await targetUser.save();

      // Automatically mark related supervisor approval notifications as read for managers
      await markSupervisorNotificationsRead(id);

      // Send activation notification to the supervisor
      await notifySupervisorApproved(id, targetUser.name, requester.name);

      return NextResponse.json({
        success: true,
        message: `Supervisor ${targetUser.name} (${targetUser.supervisorCode}) approved successfully.`,
        data: targetUser,
      });
    } else {
      targetUser.isApproved = false;
      await targetUser.save();

      // Automatically mark related supervisor approval notifications as read
      await markSupervisorNotificationsRead(id);

      return NextResponse.json({
        success: true,
        message: `Supervisor ${targetUser.name} access revoked.`,
        data: targetUser,
      });
    }
  } catch (error: any) {
    console.error('Update supervisor approval error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update supervisor approval' },
      { status: 500 }
    );
  }
}
