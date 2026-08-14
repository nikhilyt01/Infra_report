import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Approve manager
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    await connectDB();

    // Check if user is admin
    const admin = await User.findById(decoded.userId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Update manager approval status
    const manager = await User.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        approvedBy: admin._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!manager) {
      return NextResponse.json(
        { success: false, error: 'Manager not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: manager,
      message: 'Manager approved successfully',
    });
  } catch (error: any) {
    console.error('Approve manager error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve manager' },
      { status: 500 }
    );
  }
}

// Reject/Delete manager
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    await connectDB();

    // Check if user is admin
    const admin = await User.findById(decoded.userId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete or deactivate manager
    await User.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({
      success: true,
      message: 'Manager rejected successfully',
    });
  } catch (error: any) {
    console.error('Reject manager error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reject manager' },
      { status: 500 }
    );
  }
}
