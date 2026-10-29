import mongoose, { Schema, Model, models } from 'mongoose';
import User from './User';

export type NotificationType = 
  | 'report_resolved' 
  | 'supervisor_signup' 
  | 'supervisor_approved'
  | 'report_assigned'
  | 'urgent_escalation' 
  | 'general';

export interface INotification {
  _id?: any;
  recipient: mongoose.Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  reportId?: mongoose.Types.ObjectId | string;
  relatedUserId?: mongoose.Types.ObjectId | string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'report_resolved',
        'supervisor_signup',
        'supervisor_approved',
        'report_assigned',
        'urgent_escalation',
        'general',
      ],
      default: 'general',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      trim: true,
    },
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      index: true,
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound indexes for list & count queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ relatedUserId: 1, type: 1, isRead: 1 });

const Notification: Model<INotification> = 
  models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
