import mongoose, { Schema, Model, models } from 'mongoose';

export interface IMunicipality {
  _id?: string;
  name: string;
  code?: string; // Unique identifier/code for the municipality
  state?: string;
  country: string;
  areas?: string[]; // Array of area/ward names managed
  boundaries?: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON polygon
  };
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const MunicipalitySchema = new Schema<IMunicipality>(
  {
    name: {
      type: String,
      required: [true, 'Municipality name is required'],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      default: 'India',
      trim: true,
    },
    areas: {
      type: [String],
      default: [],
    },
    boundaries: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]],
      },
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create geospatial index for boundaries
MunicipalitySchema.index({ boundaries: '2dsphere' });

// Prevent model recompilation in development
const Municipality: Model<IMunicipality> = models.Municipality || mongoose.model<IMunicipality>('Municipality', MunicipalitySchema);

export default Municipality;
