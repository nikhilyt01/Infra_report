import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Report from '@/models/Report';

// GET /api/reports/[id] - Get report by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const report = await Report.findById(id)
      .populate('reportedBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('approvedBy', 'name email avatar')
      .populate('initiatedBy', 'name email avatar');
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await Report.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

// PATCH /api/reports/[id] - Update report
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    const report = await Report.findById(id);
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Update allowed fields
    const allowedFields = [
      'status',
      'priority',
      'assignedTo',
      'resolutionNote',
      'resolutionImages',
      'estimatedResolutionDate',
      'approvedBy',
      'initiatedBy',
    ];
    
    const updates: any = {};
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // Set resolvedAt if status changed to resolved
    if (body.status === 'resolved' && report.status !== 'resolved') {
      updates.resolvedAt = new Date();
    }
    
    // Set approvedAt if approvedBy is being set for the first time
    if (body.approvedBy && !report.approvedBy) {
      updates.approvedAt = new Date();
    }
    
    // Set initiatedAt if status changes to in_progress for the first time
    if (body.status === 'in_progress' && report.status !== 'in_progress' && body.initiatedBy) {
      updates.initiatedBy = body.initiatedBy;
      updates.initiatedAt = new Date();
    }
    
    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('approvedBy', 'name email avatar')
      .populate('initiatedBy', 'name email avatar');
    
    return NextResponse.json({
      success: true,
      data: updatedReport,
      message: 'Report updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update report' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete report
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const report = await Report.findByIdAndDelete(id);
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete report' },
      { status: 500 }
    );
  }
}
