import mongoose, { Schema, Model, models } from 'mongoose';

export interface ICategory {
  _id?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string; // For UI display (e.g., "#FF5733")
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: '🏗️',
    },
    color: {
      type: String,
      default: '#6366f1',
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

// Prevent model recompilation in development
const Category: Model<ICategory> = models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
