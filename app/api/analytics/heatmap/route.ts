import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';

// GET /api/analytics/heatmap - Get heatmap data with resolution rates
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const bounds = searchParams.get('bounds'); // Format: "swLng,swLat,neLng,neLat"
    const gridSize = parseFloat(searchParams.get('gridSize') || '0.01'); // ~1km grid
    
    let query: any = {};
    
    // Filter by bounds if provided
    if (bounds) {
      const [swLng, swLat, neLng, neLat] = bounds.split(',').map(Number);
      query.location = {
        $geoWithin: {
          $box: [
            [swLng, swLat], // Southwest corner
            [neLng, neLat], // Northeast corner
          ],
        },
      };
    }
    
    // Aggregate reports by grid cells
    const heatmapData = await Report.aggregate([
      { $match: query },
      {
        $project: {
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          status: 1,
          // Round coordinates to grid
          gridLng: {
            $multiply: [
              { $floor: { $divide: [{ $arrayElemAt: ['$location.coordinates', 0] }, gridSize] } },
              gridSize,
            ],
          },
          gridLat: {
            $multiply: [
              { $floor: { $divide: [{ $arrayElemAt: ['$location.coordinates', 1] }, gridSize] } },
              gridSize,
            ],
          },
        },
      },
      {
        $group: {
          _id: { lng: '$gridLng', lat: '$gridLat' },
          totalCount: { $sum: 1 },
          resolvedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0],
            },
          },
          inProgressCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0],
            },
          },
          submittedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          lng: '$_id.lng',
          lat: '$_id.lat',
          totalCount: 1,
          resolvedCount: 1,
          inProgressCount: 1,
          submittedCount: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolvedCount', '$totalCount'] },
              100,
            ],
          },
        },
      },
      { $sort: { totalCount: -1 } },
    ]);
    
    return NextResponse.json({
      success: true,
      data: heatmapData,
      count: heatmapData.length,
      gridSize,
    });
  } catch (error: any) {
    console.error('Error generating heatmap:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate heatmap' },
      { status: 500 }
    );
  }
}
