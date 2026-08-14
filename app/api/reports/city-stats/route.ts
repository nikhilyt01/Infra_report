import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import User from '@/models/User';
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

// Extract city name from address
function extractCityFromAddress(address: string): string {
  // Common patterns for city extraction
  // Format: "area, city, state" or "area, city"
  const parts = address.split(',').map(p => p.trim());
  
  // If we have multiple parts, the city is usually the second or second-to-last part
  if (parts.length >= 2) {
    // Check if last part looks like a state or pincode
    const lastPart = parts[parts.length - 1];
    if (lastPart.match(/^\d{6}$/) || lastPart.length <= 2) {
      // Last part is pincode or state code, city is second to last
      return parts[parts.length - 2];
    }
    // Otherwise city might be the last part
    return lastPart;
  }
  
  return parts[0] || address;
}

// GET /api/reports/city-stats - Get reports count for user's city
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const currentUser = getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's reports to extract their city
    const userReports = await Report.find({ reportedBy: currentUser.id })
      .sort({ createdAt: -1 })
      .limit(1)
      .select('address area');
    
    let userCity = '';
    let userArea = '';
    
    if (userReports.length > 0) {
      userCity = extractCityFromAddress(userReports[0].address);
      userArea = userReports[0].area || '';
    }
    
    // If no reports, try to get from user profile (if available)
    if (!userCity) {
      return NextResponse.json({
        success: true,
        city: '',
        area: '',
        cityReports: [],
        totalCityIssues: 0,
        statusBreakdown: {},
        categoryBreakdown: {},
        message: 'No city information available. Create a report first to see city statistics.'
      });
    }
    
    // Get all reports from the same city
    const cityReports = await Report.find({
      address: { $regex: userCity, $options: 'i' }
    })
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50 for performance
    
    const totalCityIssues = await Report.countDocuments({
      address: { $regex: userCity, $options: 'i' }
    });
    
    // Get status breakdown
    const statusBreakdown = await Report.aggregate([
      { $match: { address: { $regex: userCity, $options: 'i' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get category breakdown
    const categoryBreakdown = await Report.aggregate([
      { $match: { address: { $regex: userCity, $options: 'i' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get area-specific stats if area is available
    let areaIssues = 0;
    let areaStatusBreakdown: any[] = [];
    
    if (userArea) {
      areaIssues = await Report.countDocuments({
        area: { $regex: userArea, $options: 'i' }
      });
      
      areaStatusBreakdown = await Report.aggregate([
        { $match: { area: { $regex: userArea, $options: 'i' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
    }
    
    // Format the data
    const statusData: any = {};
    statusBreakdown.forEach((item: any) => {
      statusData[item._id] = item.count;
    });
    
    const categoryData: any = {};
    categoryBreakdown.forEach((item: any) => {
      categoryData[item._id] = item.count;
    });
    
    const areaStatusData: any = {};
    areaStatusBreakdown.forEach((item: any) => {
      areaStatusData[item._id] = item.count;
    });
    
    return NextResponse.json({
      success: true,
      city: userCity,
      area: userArea,
      cityReports,
      totalCityIssues,
      statusBreakdown: statusData,
      categoryBreakdown: categoryData,
      areaStats: userArea ? {
        totalAreaIssues: areaIssues,
        statusBreakdown: areaStatusData
      } : null
    });
  } catch (error: any) {
    console.error('Error fetching city stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city statistics', details: error.message },
      { status: 500 }
    );
  }
}
