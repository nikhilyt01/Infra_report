import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { getUserFromToken } from '@/lib/notifications';

// PATCH /api/notifications/[id] - Mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rawUserId = user.userId || user.id || user._id;
    if (!rawUserId) {
      return NextResponse.json(
        { success: false, error: 'Invalid user session' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(String(rawUserId));
    const notificationObjectId = new mongoose.Types.ObjectId(id);

    const updated = await Notification.findOneAndUpdate(
      { _id: notificationObjectId as any, recipient: userObjectId as any },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userObjectId,
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rawUserId = user.userId || user.id || user._id;
    if (!rawUserId) {
      return NextResponse.json(
        { success: false, error: 'Invalid user session' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(String(rawUserId));
    const notificationObjectId = new mongoose.Types.ObjectId(id);

    await Notification.findOneAndDelete({
      _id: notificationObjectId as any,
      recipient: userObjectId as any,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
