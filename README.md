# 🏗️ InfraReport - Infrastructure Repair Crowdsourcing Platform

A comprehensive platform for crowdsourcing infrastructure repair reports with AR mapping, AI object detection, heat maps, and municipal SaaS features.

## ✨ Features

### 👥 Three User Roles
- **Users (Citizens)**: Report infrastructure issues with photos, location, and real-time tracking
- **Managers (City Managers)**: Manage, assign, and track resolution of all reported issues
- **Admins**: Approve managers and oversee the entire system

### 🤖 AI-Powered AR Visualization (NEW!)
- **Real-Time Object Detection**: TensorFlow.js with COCO-SSD model
- **Camera-Based AR**: Point camera to see all historical issues at a location
- **Smart Detection**: Identifies vehicles, traffic infrastructure, public amenities
- **Beautiful UI**: Glass morphism design with confidence scores and bounding boxes
- **Timeline View**: See complete history of reports with status badges
- **Before/After Photos**: Compare issue images with resolution photos

### 🗺️ Advanced Mapping
- **Heat Maps**: Visualize issue density by location with resolution rate percentages
- **Interactive Maps**: Click markers to view issue details
- **Geospatial Queries**: Find issues near any location

### 📊 Analytics Dashboard
- Resolution rate by area (%)
- Average resolution time
- Status distribution
- Daily/weekly trends
- Category-wise statistics

### 🎨 Modern Dark Theme UI
- Black (#000000) and charcoal palette
- Cyan/blue accents for AI features
- Smooth transitions and animations
- Custom scrollbars
- Fully responsive design
- Custom JWT authentication with role-based access control

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- TensorFlow.js for AI object detection
- COCO-SSD model for real-time object recognition
- Mapbox for heat maps
- MongoDB/Mongoose for database
- bcrypt & JWT for authentication

### 2. Set Up Environment Variables

Copy `.env.local` and add your API keys:

```env
# MongoDB
MONGODB_URI=your_mongodb_uri

# JWT Authentication
JWT_SECRET=your_secure_secret_key

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mapbox (Maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
```

### 3. Create Admin Account

```bash
node scripts/create-admin.js
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
app/
├── [locale]/              # Internationalized routes
│   ├── reports/new/       # Report submission
│   ├── dashboard/manager/ # Manager dashboard
│   ├── map/              # Heat map view
│   └── ar-view/          # AR camera view
├── api/
│   ├── reports/          # Report CRUD
│   ├── analytics/        # Statistics
│   ├── categories/       # Categories
│   └── upload/           # Image uploads

components/
├── ui/                   # Reusable components
├── HeatMapView.tsx       # Mapbox heat map
├── ARCameraView.tsx      # AR implementation
├── ResolutionChart.tsx   # Analytics charts
└── AreaStatistics.tsx    # Area stats

models/
├── User.ts              # Dual-role users
├── Report.ts            # Issue reports
├── Category.ts          # Issue types
├── Municipality.ts      # Cities/areas
└── ReportHistory.ts     # Audit trail
```

## 🔧 Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Styling**: Tailwind CSS 4
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **Storage**: Cloudinary
- **Internationalization**: next-intl

## 📊 Database Models

### User
- Three roles: `user` | `manager` | `admin`
- Password hashing with bcrypt
- Manager approval workflow

### Report
- Geolocation (2dsphere indexed)
- Status workflow tracking
- Priority levels
- Image attachments
- Upvote system

### Category
- Icon and color coding
- Active/inactive status

### ReportHistory
- Complete audit trail
- Action tracking
- User attribution

## 🎯 Key Features

### Heat Mapping
Aggregates reports by grid cells with resolution rate visualization and interactive tooltips.

### AR Navigation
Uses device camera and geolocation to display nearby reports with real-time navigation and distance tracking.

### Analytics
Comprehensive statistics including resolution rates, average resolution time, and trends by date, area, and category.

## 🔐 API Routes

The platform provides RESTful APIs for:
- **Reports**: CRUD operations, geolocation queries, nearby search
- **Analytics**: Heat map data, resolution statistics
- **Categories**: Issue type management
- **Upload**: Image handling via Cloudinary
- **Authentication**: JWT-based login, signup, user management
- **Admin**: Manager approval workflow

## 🚢 Deployment

Deploy on Vercel by importing your GitHub repository and adding environment variables.

## 📝 Getting API Keys

- **MongoDB**: https://www.mongodb.com/cloud/atlas (Free)
- **Cloudinary**: https://cloudinary.com (Free - 25GB)
- **Mapbox**: https://account.mapbox.com (Free - 50k loads)

## 📖 Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions
- [AUTH_SETUP.md](AUTH_SETUP.md) - Authentication system documentation
- [QUICK_START.md](QUICK_START.md) - Quick start checklist
- [MONGODB_SETUP.md](MONGODB_SETUP.md) - MongoDB configuration

## 🐛 Troubleshooting

**Maps not showing?**
- Verify `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

**Images not uploading?**
- Check Cloudinary credentials

**Database errors?**
- Confirm MongoDB URI format
- Check network access in Atlas

**Authentication issues?**
- See [AUTH_SETUP.md](AUTH_SETUP.md)
- Default admin: admin@infrareport.com / admin123

**AR not working?**
- Requires HTTPS for camera permission
- Enable location services

## 📄 License

MIT License