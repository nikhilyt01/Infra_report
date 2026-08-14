import mongoose, { Schema, Model, models } from 'mongoose';

export type ReportStatus = 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'closed' | 'rejected';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IReport {
  _id?: string;
  title: string;
  description: string;
  category: string; // Category name as text
  status: ReportStatus;
  priority: ReportPriority;
  
  // Location data
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  area?: string; // Ward/area name
  landmark?: string;
  
  // Images and media
  images: string[]; // URLs of uploaded images
  
  // User relationships
  reportedBy: string; // Reference to User (citizen)
  assignedTo?: string; // Reference to User (city_manager)
  approvedBy?: string; // Reference to User who approved the report
  approvedAt?: Date; // When the report was approved
  initiatedBy?: string; // Reference to User who initiated the resolution
  initiatedAt?: Date; // When the resolution was initiated
  
  // Tracking
  viewCount: number;
  upvotes: number;
  upvotedBy: string[]; // Array of user IDs who upvoted
  
  // Resolution data
  resolvedAt?: Date;
  resolutionNote?: string;
  resolutionImages?: string[]; // Before/after images
  estimatedResolutionDate?: Date;
  
  // Municipality
  municipalityId?: string; // Reference to Municipality
  
  // Metadata
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected'],
      default: 'submitted',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: function(coords: number[]) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90; // latitude
          },
          message: 'Invalid coordinates format [longitude, latitude]',
        },
      },
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(images: string[]) {
          return images.length <= 10; // Max 10 images
        },
        message: 'Maximum 10 images allowed',
      },
    },
    reportedBy: {
      type: String,
      required: [true, 'Reporter is required'],
    },
    assignedTo: {
      type: String,
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
    initiatedBy: {
      type: String,
    },
    initiatedAt: {
      type: Date,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    upvotedBy: {
      type: [String],
      default: [],
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    resolutionImages: {
      type: [String],
      default: [],
    },
    estimatedResolutionDate: {
      type: Date,
    },
    municipalityId: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ReportSchema.index({ location: '2dsphere' }); // Geospatial queries
ReportSchema.index({ status: 1, createdAt: -1 }); // Filter by status
ReportSchema.index({ reportedBy: 1, createdAt: -1 }); // User reports
ReportSchema.index({ assignedTo: 1, status: 1 }); // Manager assignments
ReportSchema.index({ category: 1, status: 1 }); // Category analytics
ReportSchema.index({ municipalityId: 1, status: 1 }); // Municipality analytics

// Prevent model recompilation in development
const Report: Model<IReport> = models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;
