import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { getUserFromToken } from '@/lib/notifications';

// GET /api/notifications - List notifications for authenticated user
export async function GET(request: NextRequest) {
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

    const userObjectId = new mongoose.Types.ObjectId(String(rawUserId));

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const query: any = { recipient: userObjectId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userObjectId, isRead: false }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark all or selected notifications as read
export async function PATCH(request: NextRequest) {
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

    const userObjectId = new mongoose.Types.ObjectId(String(rawUserId));
    const body = await request.json().catch(() => ({}));

    if (body.markAllAsRead) {
      await Notification.updateMany(
        { recipient: userObjectId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
    } else if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
      const validIds = body.notificationIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));

      await Notification.updateMany(
        { recipient: userObjectId, _id: { $in: validIds } },
        { $set: { isRead: true, readAt: new Date() } }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing markAllAsRead or notificationIds parameter' },
        { status: 400 }
      );
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userObjectId,
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      unreadCount,
      message: 'Notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
