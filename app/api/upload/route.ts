import { NextResponse, NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const USE_LOCAL_UPLOADS = process.env.USE_LOCAL_UPLOADS === 'true';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Configure Cloudinary only if not using local uploads
if (!USE_LOCAL_UPLOADS) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret',
  });
}

// Local file upload helper
async function uploadFilesLocally(files: File[]): Promise<string[]> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  // Ensure upload directory exists
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    const fileUrl = `${BASE_URL}/uploads/${fileName}`;
    uploadedUrls.push(fileUrl);
  }
  
  return uploadedUrls;
}

// POST /api/upload - Upload images to Cloudinary
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }
    
    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 files allowed' },
        { status: 400 }
      );
    }
    
    // Use local uploads if configured
    if (USE_LOCAL_UPLOADS) {
      const uploadedUrls = await uploadFilesLocally(files);
      return NextResponse.json({
        success: true,
        data: uploadedUrls,
        count: uploadedUrls.length,
        message: 'Files uploaded successfully (local storage)',
      });
    }
    
    // Use Cloudinary
    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      return new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'infrastructure-reports',
            resource_type: 'auto',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
          }
        );
        
        uploadStream.end(buffer);
      });
    });
    
    const uploadedUrls = await Promise.all(uploadPromises);
    
    return NextResponse.json({
      success: true,
      data: uploadedUrls,
      count: uploadedUrls.length,
      message: 'Files uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}
