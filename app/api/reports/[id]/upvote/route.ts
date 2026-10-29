import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';
import ReportHistory from '@/models/ReportHistory';
import { notifyUrgentEscalation } from '@/lib/notifications';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Priority ladder, lowest first. The index doubles as the rank compared by the
// escalation ratchet below, so the order here matters.
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];

// Upvotes needed to *earn* each rank. Highest threshold first — $switch takes
// the first matching branch.
const ESCALATION_THRESHOLDS = [
  { votes: 4, rank: 3 }, // urgent 25
  { votes: 2, rank: 2 }, // high 10
  { votes: 1, rank: 1 },  // medium 5
];

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

// POST /api/reports/[id]/upvote - Toggle the current user's upvote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Must be authenticated, otherwise a report's priority could be inflated
    // by unlimited anonymous requests.
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'You must be signed in to upvote' },
        { status: 401 }
      );
    }

    await connectDB();
    const { id } = await params;
    const userId = String(user.userId);

    // Read the pre-update priority and status so we can enforce business rules.
    const before = await Report.findById(id).select('priority status title assignedTo');
    if (!before) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Task 1: Stop upvote after resolved, closed, or rejected.
    // An issue that is already resolved should not have its priority modified or audit trail expanded.
    if (['resolved', 'closed', 'rejected'].includes(before.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot upvote a report that has already been ${before.status}. Upvoting is only permitted for active reports.`,
        },
        { status: 400 }
      );
    }

    // One atomic pipeline update: toggle the voter, recount, then ratchet the
    // priority. Doing all three in a single operation means two rapid clicks
    // can't both read "not yet voted" and double-insert the same user.
    const updated = await Report.findByIdAndUpdate(
      id,
      [
        // 1. Toggle this user in or out of the voter list. $setDifference also
        //    de-duplicates, so it heals any double entries from earlier writes.
        {
          $set: {
            upvotedBy: {
              $cond: [
                { $in: [userId, { $ifNull: ['$upvotedBy', []] }] },
                { $setDifference: [{ $ifNull: ['$upvotedBy', []] }, [userId]] },
                { $concatArrays: [{ $ifNull: ['$upvotedBy', []] }, [userId]] },
              ],
            },
          },
        },
        // 2. Derive the counter from the array so the two can never drift apart.
        { $set: { upvotes: { $size: '$upvotedBy' } } },
        // 3. Escalate upward only. Taking $max against the current rank means a
        //    priority a manager set by hand is never silently downgraded by the
        //    vote count.
        {
          $set: {
            priority: {
              $let: {
                vars: {
                  earned: {
                    $switch: {
                      branches: ESCALATION_THRESHOLDS.map((t) => ({
                        case: { $gte: ['$upvotes', t.votes] },
                        then: t.rank,
                      })),
                      default: 0,
                    },
                  },
                  current: { $indexOfArray: [PRIORITY_LEVELS, '$priority'] },
                },
                in: {
                  $arrayElemAt: [
                    PRIORITY_LEVELS,
                    { $max: ['$$earned', '$$current'] },
                  ],
                },
              },
            },
          },
        },
      ],
      // Mongoose 9 rejects array updates unless this opt-in is set — the guard
      // exists to catch arrays passed by accident. Kept local to this call
      // rather than enabled globally, so the check still covers every other query.
      { new: true, updatePipeline: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const upvoted = (updated.upvotedBy || []).includes(userId);
    const escalated = updated.priority !== before.priority;

    // Record auto-escalations, so a manager can tell community pressure apart
    // from a human decision when reviewing the report's history.
    if (escalated) {
      await ReportHistory.create({
        reportId: String(updated._id),
        actionType: 'priority_changed',
        performedBy: userId,
        actorId: userId,
        actorName: 'Community Signal',
        actorRole: 'system',
        previousValue: before.priority,
        newValue: updated.priority,
        note: `Auto-escalated by community demand (${updated.upvotes} upvotes): ${before.priority} → ${updated.priority}`,
        comment: `Auto-escalated by community demand (${updated.upvotes} upvotes)`,
        fromStatus: before.priority,
        toStatus: updated.priority,
        timestamp: new Date(),
      });

      // If the report is assigned to a supervisor, notify them of urgent community escalation
      if (updated.assignedTo && ['high', 'urgent'].includes(updated.priority)) {
        await notifyUrgentEscalation({
          reportId: updated._id,
          reportTitle: updated.title,
          supervisorId: updated.assignedTo,
          newPriority: updated.priority,
          upvoteCount: updated.upvotes,
        });
      }
    }

    // Return the authoritative values so the client never has to guess, and
    // keep the voter list server-side.
    return NextResponse.json({
      success: true,
      data: {
        _id: String(updated._id),
        upvoted,
        upvotes: updated.upvotes,
        priority: updated.priority,
        escalated,
      },
      message: upvoted ? 'Upvote added' : 'Upvote removed',
    });
  } catch (error: any) {
    console.error('Error toggling upvote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle upvote' },
      { status: 500 }
    );
  }
}
