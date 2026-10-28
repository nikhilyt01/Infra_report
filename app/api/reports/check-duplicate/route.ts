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

/**
 * GET /api/reports/check-duplicate
 *
 * Duplicate-detection query (no AI). Criteria:
 *  - location within 50 m of [lng, lat]
 *  - category matches (case-insensitive substring)
 *  - status in: submitted | under_review | in_progress
 *  - createdAt within last 60 days
 *
 * Returns up to 5 results ordered by distance (nearest first).
 * Each result includes _id, title, status, upvotes, thumbnail, distanceMeters, userHasUpvoted.
 *
 * Query params: lng, lat, category
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const lng = parseFloat(searchParams.get('lng') || '');
    const lat = parseFloat(searchParams.get('lat') || '');
    const category = (searchParams.get('category') || '').trim();

    if (isNaN(lng) || isNaN(lat) || !lng || !lat) {
      return NextResponse.json(
        { success: false, error: 'lng and lat are required' },
        { status: 400 }
      );
    }

    const user = getUserFromToken(request);
    const currentUserId = user?.userId ? String(user.userId) : null;

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Build the filter. $near already sorts by distance ascending.
    const filter: Record<string, any> = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 50, // 50 metres
        },
      },
      status: { $in: ['submitted', 'under_review', 'in_progress'] },
      createdAt: { $gte: sixtyDaysAgo },
    };

    // If a category is supplied, escape regex chars and do case-insensitive match
    if (category) {
      const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.category = { $regex: escaped, $options: 'i' };
    }

    const raw = await Report.find(filter)
      .limit(5)
      .select('_id title category status upvotes upvotedBy images createdAt address area location')
      .populate('reportedBy', 'name')
      .lean();

    // Attach an approximate distance for display.
    const toRad = (d: number) => (d * Math.PI) / 180;
    const haversine = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371000; // metres
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const results = raw.map((r: any) => {
      const [rLng, rLat] = r.location?.coordinates ?? [lng, lat];
      const hasUpvoted = currentUserId && Array.isArray(r.upvotedBy)
        ? r.upvotedBy.map(String).includes(currentUserId)
        : false;

      return {
        _id: String(r._id),
        title: r.title,
        category: r.category,
        status: r.status,
        upvotes: r.upvotes ?? 0,
        userHasUpvoted: hasUpvoted,
        thumbnail: r.images?.[0] ?? null,
        address: r.address ?? r.area ?? '',
        createdAt: r.createdAt,
        distanceMeters: haversine(lat, lng, rLat, rLng),
      };
    });

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('[check-duplicate]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}
