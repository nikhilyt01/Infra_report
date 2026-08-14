import mongoose, { Schema, Model, models } from 'mongoose';

export type ActionType = 
  | 'created' 
  | 'status_changed' 
  | 'assigned' 
  | 'reassigned' 
  | 'priority_changed'
  | 'comment_added'
  | 'images_added'
  | 'resolved'
  | 'reopened';

export interface IReportHistory {
  _id?: string;
  reportId: string; // Reference to Report
  actionType: ActionType;
  performedBy: string; // Reference to User
  
  // Change details
  previousValue?: string;
  newValue?: string;
  comment?: string;
  
  // Metadata
  timestamp: Date;
  ipAddress?: string;
  createdAt?: Date;
}

const ReportHistorySchema = new Schema<IReportHistory>(
  {
    reportId: {
      type: String,
      required: [true, 'Report ID is required'],
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'created',
        'status_changed',
        'assigned',
        'reassigned',
        'priority_changed',
        'comment_added',
        'images_added',
        'resolved',
        'reopened',
      ],
      required: [true, 'Action type is required'],
    },
    performedBy: {
      type: String,
      required: [true, 'Performer is required'],
    },
    previousValue: {
      type: String,
      trim: true,
    },
    newValue: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying report history
ReportHistorySchema.index({ reportId: 1, timestamp: -1 });
ReportHistorySchema.index({ performedBy: 1, timestamp: -1 });

// Prevent model recompilation in development
const ReportHistory: Model<IReportHistory> = models.ReportHistory || mongoose.model<IReportHistory>('ReportHistory', ReportHistorySchema);

export default ReportHistory;
