import mongoose, { Schema, Model, models } from 'mongoose';
import User from './User';

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
  fromStatus?: string | null;
  toStatus?: string;
  note?: string;
  resolutionImages?: string[];
  actorId?: string; // Reference to User
  actorName?: string;
  actorRole?: string; // 'admin' | 'manager' | 'supervisor' | 'user' | 'system'

  // Backward compatibility with previous schema
  actionType: ActionType;
  performedBy?: string; // Reference to User
  previousValue?: string;
  newValue?: string;
  comment?: string;
  
  // Metadata
  timestamp: Date;
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReportHistorySchema = new Schema<IReportHistory>(
  {
    reportId: {
      type: String,
      required: [true, 'Report ID is required'],
      index: true,
    },
    fromStatus: {
      type: String,
      trim: true,
      default: null,
    },
    toStatus: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    resolutionImages: {
      type: [String],
      default: [],
    },
    actorId: {
      type: String,
      ref: User,
    },
    actorName: {
      type: String,
      trim: true,
    },
    actorRole: {
      type: String,
      trim: true,
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
      default: 'status_changed',
    },
    performedBy: {
      type: String,
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
      maxlength: 1000,
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
ReportHistorySchema.index({ reportId: 1, createdAt: -1 });
ReportHistorySchema.index({ reportId: 1, timestamp: -1 });
ReportHistorySchema.index({ actorId: 1, createdAt: -1 });
ReportHistorySchema.index({ performedBy: 1, timestamp: -1 });

// Prevent model recompilation in development
const ReportHistory: Model<IReportHistory> = models.ReportHistory || mongoose.model<IReportHistory>('ReportHistory', ReportHistorySchema);

export default ReportHistory;
