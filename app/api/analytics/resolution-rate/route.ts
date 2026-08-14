import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';

// GET /api/analytics/resolution-rate - Get resolution rate statistics
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const categoryId = searchParams.get('categoryId');
    const days = parseInt(searchParams.get('days') || '30'); // Default last 30 days
    
    // Build query
    const query: any = {};
    if (area) query.area = { $regex: area, $options: 'i' };
    if (categoryId) query.categoryId = categoryId;
    
    // Date filter
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);
    query.createdAt = { $gte: dateFilter };
    
    // Overall statistics
    const overallStats = await Report.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          inProgressReports: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
          submittedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] },
          },
          underReviewReports: {
            $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] },
          },
          closedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
          },
          rejectedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalReports: 1,
          resolvedReports: 1,
          inProgressReports: 1,
          submittedReports: 1,
          underReviewReports: 1,
          closedReports: 1,
          rejectedReports: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolvedReports', '$totalReports'] },
              100,
            ],
          },
          avgResolutionTimeHours: {
            $divide: ['$avgResolutionTime', 1000 * 60 * 60], // Convert ms to hours
          },
        },
      },
    ]);
    
    // Statistics by area
    const areaStats = await Report.aggregate([
      { $match: { ...query, area: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$area',
          totalReports: { $sum: 1 },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          area: '$_id',
          totalReports: 1,
          resolvedReports: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolvedReports', '$totalReports'] },
              100,
            ],
          },
        },
      },
      { $sort: { totalReports: -1 } },
      { $limit: 20 },
    ]);
    
    // Statistics by category
    const categoryStats = await Report.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$categoryId',
          totalReports: { $sum: 1 },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: '$category.name',
          categoryIcon: '$category.icon',
          totalReports: 1,
          resolvedReports: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolvedReports', '$totalReports'] },
              100,
            ],
          },
        },
      },
      { $sort: { totalReports: -1 } },
    ]);
    
    // Daily trend for the period
    const dailyTrend = await Report.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalReports: { $sum: 1 },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalReports: 1,
          resolvedReports: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        overall: overallStats[0] || {
          totalReports: 0,
          resolvedReports: 0,
          resolutionRate: 0,
        },
        byArea: areaStats,
        byCategory: categoryStats,
        dailyTrend,
      },
      period: { days, from: dateFilter.toISOString() },
    });
  } catch (error: any) {
    console.error('Error calculating resolution rate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate resolution rate' },
      { status: 500 }
    );
  }
}
