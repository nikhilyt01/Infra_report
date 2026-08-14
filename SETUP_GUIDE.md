# Infrastructure Repair Crowdsourcing App - Setup Guide

## 🏗️ Overview
A dual-role platform for citizens to report infrastructure issues and City Issue Managers to track/resolve them, featuring AR mapping, heat maps with resolution analytics, and modern dark-themed UI.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

This will install all required packages including:
- **Mapbox GL JS** & **React Map GL** - Interactive maps and heat maps
- **Cloudinary** - Image upload and storage
- **Recharts** - Analytics charts
- **Mongoose** - MongoDB ORM
- **Clerk** - Authentication
- **Next.js 16** - App framework

### 2. Environment Variables

Create `.env.local` file in the root directory:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mapbox (Maps & Heat Maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 3. Get API Keys

#### MongoDB Atlas (Free)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string from "Connect" → "Connect your application"

#### Clerk (Free)
1. Go to https://clerk.com
2. Create a new application
3. Copy API keys from Dashboard

#### Cloudinary (Free - 25GB storage)
1. Go to https://cloudinary.com
2. Sign up for free account
3. Copy credentials from Dashboard

#### Mapbox (Free - 50k map loads/month)
1. Go to https://account.mapbox.com
2. Create account
3. Create access token from "Access Tokens" page

### 4. Seed Initial Data

Create default categories:

```bash
# Open MongoDB and run this script or use MongoDB Compass
```

You can also create a seed script at `scripts/seed.ts`:

```typescript
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';

const categories = [
  { name: 'Potholes', icon: '🕳️', color: '#ef4444' },
  { name: 'Street Lights', icon: '💡', color: '#f59e0b' },
  { name: 'Water Supply', icon: '💧', color: '#3b82f6' },
  { name: 'Drainage', icon: '🚰', color: '#06b6d4' },
  { name: 'Garbage', icon: '🗑️', color: '#10b981' },
  { name: 'Roads', icon: '🛣️', color: '#8b5cf6' },
  { name: 'Parks', icon: '🌳', color: '#22c55e' },
  { name: 'Public Transport', icon: '🚌', color: '#f59e0b' },
];

async function seed() {
  await connectDB();
  
  for (const cat of categories) {
    await Category.findOneAndUpdate(
      { name: cat.name },
      cat,
      { upsert: true }
    );
  }
  
  console.log('Categories seeded successfully');
  process.exit(0);
}

seed();
```

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## 📱 Features

### For Citizens
- **Report Issues**: Submit reports with photos, location, and category
- **Track Progress**: View status updates and resolution timeline
- **AR View**: See historical issues in augmented reality via camera
- **Heat Maps**: View issue density and resolution rates by area

### For City Managers
- **Dashboard**: Analytics cards showing total, pending, resolved reports
- **Report Management**: Update statuses, assign priorities, add resolution notes
- **Area Analytics**: View resolution rates by ward/area
- **Heat Map View**: Identify problem areas requiring attention

## 🎨 Features Breakdown

### 1. Dual User Roles
- **Citizen**: Can report issues, view status, use AR
- **City Manager**: Can manage reports, update statuses, view analytics

User roles are stored in the `User` model with the `role` field.

### 2. Heat Mapping
- Shows issue density by location
- Color-coded by resolution rate
- Hover tooltips show:
  - Total issues in area
  - Resolved count
  - Resolution rate percentage

### 3. AR Mapping
- Camera-based AR view
- Shows all issues at pointed location
- Displays:
  - Issue history timeline
  - Status badges
  - Before/after photos
  - Resolution details
  - Distance from user

### 4. Modern Dark Theme
- Black (#000000) and charcoal (#0a0a0a, #1a1a1a, #2a2a2a) palette
- Cyan/blue accents (#06b6d4, #0ea5e9)
- Smooth transitions
- Custom scrollbars
- Status-specific colors

### 5. Analytics & Resolution Tracking
- Resolution rate by area (%)
- Average resolution time
- Daily/weekly trends
- Category-wise statistics
- Priority-based sorting

## 🗂️ Project Structure

```
app/
├── [locale]/
│   ├── reports/
│   │   └── new/page.tsx          # Report submission form
│   ├── dashboard/
│   │   └── manager/page.tsx      # City Manager dashboard
│   ├── map/page.tsx               # Heat map view
│   ├── ar-view/page.tsx          # AR camera launcher
│   └── globals.css                # Dark theme styles
├── api/
│   ├── reports/
│   │   ├── route.ts              # CRUD operations
│   │   ├── [id]/route.ts         # Single report ops
│   │   └── nearby/route.ts       # Geolocation queries
│   ├── analytics/
│   │   ├── heatmap/route.ts      # Heat map data
│   │   └── resolution-rate/route.ts  # Stats
│   ├── categories/route.ts        # Category management
│   └── upload/route.ts           # Image uploads

components/
├── ui/                            # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   └── Label.tsx
├── HeatMapView.tsx               # Mapbox heat map
├── ARCameraView.tsx              # AR implementation
├── ResolutionChart.tsx           # Trend charts
├── AreaStatistics.tsx            # Area-wise stats
└── Navbar.tsx                    # Navigation

models/
├── User.ts                       # User with roles
├── Report.ts                     # Issue reports
├── Category.ts                   # Issue categories
├── Municipality.ts               # City/area info
└── ReportHistory.ts              # Audit trail
```

## 🔐 Security Considerations

1. **Authentication**: All API routes should check `auth()` from Clerk
2. **Role-Based Access**: Middleware should verify user roles for manager routes
3. **Input Validation**: Validate all inputs on server-side
4. **Image Upload**: Cloudinary handles file validation
5. **Geolocation**: Validate coordinates are within valid ranges

## 🚢 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### MongoDB Atlas
- Ensure connection string allows access from all IPs (0.0.0.0/0) or Vercel IPs
- Set up database indexes for performance (already defined in models)

## 📊 Database Indexes

Already configured in models:
- `Report.location` - 2dsphere index for geospatial queries
- `Report.status` - Filter by status
- `Report.reportedBy` - User's reports
- `Report.assignedTo` - Manager's assignments

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Set up environment variables**: Create `.env.local`
3. **Seed categories**: Run seed script
4. **Test locally**: `npm run dev`
5. **Deploy**: Push to Vercel

## 📝 Notes

- Heat map requires Mapbox token (uncomment code in HeatMapView.tsx after adding token)
- AR view uses device camera and geolocation APIs
- Resolution rate calculated as: (resolved / total) × 100
- Images are auto-optimized by Cloudinary
- Dark theme uses system preference by default

## 🐛 Troubleshooting

**Maps not showing?**
- Check NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local
- Ensure token has correct scopes

**Images not uploading?**
- Verify Cloudinary credentials
- Check file size limits (default: unlimited)

**Database connection error?**
- Verify MongoDB URI format
- Check network access in MongoDB Atlas

**AR view not working?**
- Ensure HTTPS (required for camera access)
- Check browser camera permissions
- Location services must be enabled

## 📞 Support

For issues or questions:
1. Check environment variables
2. Verify API keys are valid
3. Check browser console for errors
4. Review server logs for API errors
