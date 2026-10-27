import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GET /api/manager/supervisors - List and search supervisors (Managers and Admins)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status'); // 'pending', 'approved', 'all'

    const query: any = { role: 'supervisor' };

    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { supervisorCode: search.toUpperCase() },
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
      ];
    }

    const supervisors = await User.find(query)
      .select('name email role isApproved supervisorCode department createdAt approvedAt approvedBy')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: supervisors.length,
      data: supervisors,
    });
  } catch (error: any) {
    console.error('Get supervisors error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch supervisors' },
      { status: 500 }
    );
  }
}
