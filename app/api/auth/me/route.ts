import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
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

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    // Ensure supervisor always has a unique ID
    if (user.role === 'supervisor' && !user.supervisorCode) {
      const generatedCode = `SUP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      user.supervisorCode = generatedCode;
      await User.updateOne({ _id: user._id }, { $set: { supervisorCode: generatedCode } });
    }

    // Return user data
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      supervisorCode: user.supervisorCode,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
      managedAreas: user.managedAreas,
    };

    return NextResponse.json({
      success: true,
      data: userResponse,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
