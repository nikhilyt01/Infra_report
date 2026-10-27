import mongoose, { Schema, Model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'user' | 'manager' | 'admin' | 'supervisor';

export interface IUser {
  _id?: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  managedAreas?: string[]; // For manager: array of area/ward IDs they manage
  department?: string; // For supervisor: department e.g. Roads, Sanitation, Water, Electrical
  supervisorCode?: string; // Unique shareable code for supervisor approval (e.g. SUP-XXXXXX)
  municipalityId?: string; // Reference to Municipality
  isActive?: boolean;
  isApproved?: boolean; // For managers and supervisors: needs admin/manager approval
  approvedBy?: string; // Admin or Manager who approved
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
      enum: ['user', 'manager', 'admin', 'supervisor'],
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
    department: {
      type: String,
      trim: true,
    },
    supervisorCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
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
        // Auto-approve users and admins; managers and supervisors need approval
        return this.role !== 'manager' && this.role !== 'supervisor';
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

// Ensure User model always has the latest schema enum values across HMR
if (models && models.User) {
  const roleEnum: string[] = (models.User.schema?.path('role') as any)?.enumValues || [];
  if (!roleEnum.includes('supervisor')) {
    delete (models as any).User;
    if ((mongoose as any).connection?.models) {
      delete (mongoose as any).connection.models.User;
    }
  }
}

const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
