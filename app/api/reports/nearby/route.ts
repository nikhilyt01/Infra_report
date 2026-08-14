import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';

// GET /api/reports/nearby - Get reports near a location
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const lng = parseFloat(searchParams.get('lng') || '0');
    const lat = parseFloat(searchParams.get('lat') || '0');
    const radiusKm = parseFloat(searchParams.get('radius') || '5'); // Default 5km
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!lng || !lat) {
      return NextResponse.json(
        { success: false, error: 'Longitude and latitude are required' },
        { status: 400 }
      );
    }
    
    // Convert radius to meters (MongoDB uses meters for geospatial queries)
    const radiusMeters = radiusKm * 1000;
    
    // Find reports near the location using geospatial query
    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusMeters,
        },
      },
    })
      .populate('reportedBy', 'name')
      .populate('assignedTo', 'name')
      .limit(limit)
      .select('-upvotedBy'); // Exclude large arrays
    
    return NextResponse.json({
      success: true,
      data: reports,
      count: reports.length,
      searchCenter: { lng, lat },
      radiusKm,
    });
  } catch (error: any) {
    console.error('Error fetching nearby reports:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch nearby reports' },
      { status: 500 }
    );
  }
}
