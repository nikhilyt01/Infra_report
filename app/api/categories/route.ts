import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';

// GET /api/categories - Get all active categories
export async function GET() {
  try {
    await connectDB();
    
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, icon, color } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const category = await Category.create({
      name,
      description,
      icon: icon || '🏗️',
      color: color || '#6366f1',
      isActive: true,
    });
    
    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
