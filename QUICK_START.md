# 🚀 Quick Start Checklist

## Prerequisites
- Node.js 18+ installed
- Git installed
- MongoDB Atlas account (or local MongoDB)

## Step-by-Step Setup (5 minutes)

### 1. Install Dependencies ⏱️ ~2 minutes
```bash
npm install
```

This installs all packages including:
- Next.js 16 (App Router)
- Mongoose (MongoDB)
- Clerk (Auth)
- Cloudinary (Images)
- Mapbox GL (Maps)
- Recharts (Charts)

### 2. Get Free API Keys ⏱️ ~10 minutes total

#### MongoDB (2 min)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free M0 cluster
3. Click "Connect" → "Drivers"
4. Copy connection string

#### Clerk (2 min)
1. Go to https://clerk.com
2. Create application
3. Dashboard → API Keys
4. Copy both keys

#### Cloudinary (3 min)
1. Go to https://cloudinary.com/users/register_free
2. Verify email
3. Dashboard → Copy Cloud name, API Key, Secret

#### Mapbox (3 min)
1. Go to https://account.mapbox.com/auth/signup
2. Verify email
3. Tokens → Create token
4. Copy token

### 3. Configure Environment ⏱️ ~1 minute

Edit `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/infrareport

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoi...
```

### 4. Seed Database ⏱️ ~30 seconds

```bash
npm run seed
```

Creates:
- 10 issue categories (Potholes, Street Lights, etc.)
- 2 sample municipalities

### 5. Start Development Server ⏱️ ~10 seconds

```bash
npm run dev
```

Open http://localhost:3000

### 6. Test the App ⏱️ ~2 minutes

1. **Sign up as Citizen**
   - Click "Sign In" → "Sign Up"
   - Create account
   - You're now a citizen

2. **Report an Issue**
   - Click "📝 Report Issue"
   - Fill form:
     - Title: "Pothole on Main Street"
     - Description: "Large pothole causing traffic issues"
     - Click "📍 Use Current Location"
     - Select category: "🕳️ Potholes"
     - Upload photo (optional)
   - Submit

3. **View as City Manager** (requires DB change)
   - Option A: Create another account and manually change role in MongoDB
   - Option B: Use MongoDB Compass to edit your user:
     ```json
     { "role": "city_manager" }
     ```
   - Go to "📊 Dashboard"
   - View analytics
   - Update report status

4. **Try AR View**
   - Click "📱 AR View"
   - Allow camera + location permissions
   - Point at location to see issues

5. **View Heat Map**
   - Click "🗺️ Map"
   - See issue density
   - View resolution rates

## ✅ Verification Checklist

- [ ] `npm install` completed without errors
- [ ] All API keys added to `.env.local`
- [ ] `npm run seed` succeeded
- [ ] `npm run dev` running on http://localhost:3000
- [ ] Can sign up/sign in
- [ ] Can create a report
- [ ] Can view dashboard (as city manager)
- [ ] Can see heat map
- [ ] Can access AR view

## 🐛 Common Issues

### "Cannot find module 'cloudinary'"
**Fix**: Run `npm install` - this installs all dependencies

### "MongoDB connection failed"
**Fix**: 
- Check MONGODB_URI format
- Ensure Network Access in Atlas allows your IP (or 0.0.0.0/0 for dev)
- Verify username/password are correct

### "Unauthorized" errors
**Fix**: 
- Verify Clerk keys in `.env.local`
- Ensure keys start with `pk_test_` and `sk_test_`
- Restart dev server after adding keys

### Maps not showing
**Fix**: 
- Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to `.env.local`
- Uncomment Mapbox code in `components/HeatMapView.tsx` (lines marked with TODO)

### Images not uploading
**Fix**: 
- Verify all three Cloudinary credentials
- Check cloud name has no @ or special characters

### AR View not working
**Fix**: 
- Must use HTTPS in production (localhost is OK)
- Grant camera and location permissions
- Use mobile device or laptop with camera

## 🎯 Next Steps

### For Development
1. Customize categories in seed script
2. Add your municipality data
3. Configure role assignment workflow
4. Implement email notifications
5. Add more filters to dashboard

### For Production
1. Deploy to Vercel: https://vercel.com/new
2. Add production environment variables
3. Configure custom domain
4. Set up MongoDB Atlas production cluster
5. Enable Clerk production instance

## 📚 Documentation

- **Full Setup**: `SETUP_GUIDE.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **API Reference**: See inline comments in `app/api/`
- **Component Docs**: See inline comments in `components/`

## 💡 Tips

- Use Chrome DevTools → Application → Geolocation to simulate different locations
- MongoDB Compass is great for viewing/editing database records
- Clerk Dashboard shows all users and sessions
- Cloudinary Dashboard shows uploaded images

## 🆘 Need Help?

1. Check browser console (F12) for errors
2. Check terminal for server errors
3. Verify all environment variables are set
4. Ensure dependencies are installed: `npm install`
5. Try clearing Next.js cache: `rm -rf .next`

## ⚡ Performance Tips

- Images are auto-optimized by Cloudinary
- MongoDB has geospatial indexes for fast queries
- Use pagination for large datasets
- Heat map uses server-side aggregation

---

**Total setup time: ~15 minutes** ⏱️

**You're ready to demo!** 🎉
