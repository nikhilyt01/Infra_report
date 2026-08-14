import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import ReportHistory from '@/models/ReportHistory';
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

// GET /api/reports - Get all reports with filters
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assignedTo');
    const reportedBy = searchParams.get('reportedBy');
    const area = searchParams.get('area');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;
    if (area) query.area = { $regex: area, $options: 'i' };
    
    const reports = await Report.find(query)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Report.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: reports,
      count: reports.length,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Create new report
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const body = await request.json();
    const {
      title,
      description,
      category,
      location,
      address,
      area,
      landmark,
      images,
      priority,
    } = body;
    console.log(body)
    // Validate required fields
    if (!title || !description || !category || !location || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate location format
    if (!location.coordinates || location.coordinates.length !== 2) {
      return NextResponse.json(
        { success: false, error: 'Invalid location format' },
        { status: 400 }
      );
    }
    
    // Create report
    const report = await Report.create({
      title,
      description,
      category,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
      },
      address,
      area,
      landmark,
      images: images || [],
      priority: priority || 'medium',
      reportedBy: user.userId,
      status: 'submitted',
    });
    
    // Create history entry
    await ReportHistory.create({
      reportId: report._id,
      actionType: 'created',
      performedBy: user.userId,
      newValue: 'submitted',
      timestamp: new Date(),
    });
    
    const populatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email');
    
    return NextResponse.json(
      {
        success: true,
        data: populatedReport,
        message: 'Report created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create report' },
      { status: 500 }
    );
  }
}
