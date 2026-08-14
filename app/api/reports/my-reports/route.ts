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

// GET /api/reports/my-reports - Get current user's created reports
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build query - only get reports created by current user
    const query: any = { reportedBy: user.id };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get user's reports
    const reports = await Report.find(query)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvedBy', 'name email')
      .populate('initiatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Report.countDocuments(query);
    
    // Get status counts for user's reports
    const statusCounts = await Report.aggregate([
      { $match: { reportedBy: user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const counts: any = {
      all: total,
      submitted: 0,
      under_review: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      rejected: 0
    };
    
    statusCounts.forEach((item: any) => {
      counts[item._id] = item.count;
    });
    
    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts
    });
  } catch (error: any) {
    console.error('Error fetching user reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error.message },
      { status: 500 }
    );
  }
}
