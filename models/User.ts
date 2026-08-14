import mongoose, { Schema, Model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'user' | 'manager' | 'admin';

export interface IUser {
  _id?: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  managedAreas?: string[]; // For manager: array of area/ward IDs they manage
  municipalityId?: string; // Reference to Municipality
  isActive?: boolean;
  isApproved?: boolean; // For managers: needs admin approval
  approvedBy?: string; // Admin who approved the manager
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'manager', 'admin'],
      default: 'user',
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    managedAreas: {
      type: [String],
      default: [],
    },
    municipalityId: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: function(this: IUser) {
        // Auto-approve users and admins, managers need approval
        return this.role !== 'manager';
      },
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error: any) {
    throw error;
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Prevent model recompilation in development
const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
