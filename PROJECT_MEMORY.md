# 🧠 PROJECT_MEMORY.md — InfraReport AI Infrastructure Platform

> **Token-Optimized Architectural & Functional Memory for AI Agents**  
> *This file serves as a comprehensive, single-source-of-truth knowledge base for AI context loading. Reading this document gives an instant, complete understanding of the entire codebase, file organization, data models, API contracts, execution flows, and key engine implementations.*

---

## 📌 Executive Overview

**InfraReport** is a crowdsourcing infrastructure repair and smart municipal management SaaS platform. It enables citizens to report public infrastructure issues (potholes, street lights, water leaks, drainage, garbage, etc.), allows city managers to assign, track, and resolve reports, and provides admins with municipal governance controls.

### Key Pillars:
1. **Multi-Role SaaS Ecosystem**: Citizen Users (`user`), City Managers (`manager`), System Administrators (`admin`).
2. **AI & Augmented Reality (AR) Navigation**: Real-time object recognition (TensorFlow.js COCO-SSD) and AR camera overlay for localized issue identification with compass orientation low-pass filtering.
3. **Geospatial Analytics & Dual-Engine Heatmaps**: Interactive issue density mapping via Google Maps API with seamless zero-config Leaflet tile fallback.
4. **Localization & Accessibility**: Multilingual support (`en`, `hi`, `mr`) powered by `next-intl`, PWA capability, screen reader announcers, and keyboard accessibility shortcuts.
5. **Audit Trail & Governance**: Immutable report lifecycle tracking with status state machine (`submitted` ➔ `under_review` ➔ `in_progress` ➔ `resolved`/`rejected`/`closed`).

---

## 🛠️ Technology Stack & Dependencies

| Category | Technology / Library | Version / Details |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.1.4` |
| **Runtime / UI** | React / React DOM | `19.2.3` |
| **Language** | TypeScript | `^5` |
| **Database** | MongoDB with Mongoose | `9.1.5` (Geospatial 2dsphere indexing) |
| **Authentication** | Custom JWT + HTTP Cookies | `jsonwebtoken ^9.0.3`, `bcryptjs ^3.0.3` |
| **Styling** | Tailwind CSS 4, Lucide Icons | `@tailwindcss/postcss ^4`, `lucide-react ^0.563.0` |
| **Animations** | Framer Motion | `^11.0.8` |
| **Maps & AR** | Mapbox GL, Google Maps, Leaflet | `mapbox-gl ^3.18.1`, `@googlemaps/js-api-loader`, `leaflet ^1.9.4` |
| **AI / ML** | TensorFlow.js + COCO-SSD | `@tensorflow/tfjs ^4.17.0`, `@tensorflow-models/coco-ssd ^2.2.3` |
| **Internationalization** | next-intl | `^4.7.0` (Locales: `en`, `hi`, `mr`) |
| **Charts & Stats** | Recharts | `^2.12.0` |
| **Media Storage** | Cloudinary | `^2.0.0` |
| **PWA & SW** | next-pwa, Custom SW | `^5.6.0`, `public/sw.js` |

---

## 📂 Complete Directory & File Structure Mapping

```
Infra_report_clg/
└── InfraReport-AI-Infrastructure-Platform/
    ├── app/                                  # Next.js App Router root
    │   ├── [locale]/                         # Localized route handler ([locale] = en | hi | mr)
    │   │   ├── admin/                        # Admin Management Portal
    │   │   │   └── page.tsx                  # Admin dashboard: manager approvals, system stats
    │   │   ├── dashboard/                    # Role dashboards
    │   │   │   └── manager/                  # City Manager Dashboard
    │   │   │       └── page.tsx              # Assign reports, update status, view statistics
    │   │   ├── login/                        # Authentication: Login Page
    │   │   │   └── page.tsx                  # Login form with role redirection
    │   │   ├── map/                          # Interactive Heatmap & GIS Page
    │   │   │   └── page.tsx                  # Full-screen HeatMapView container
    │   │   ├── my-reports/                   # Citizen Personal Dashboard
    │   │   │   └── page.tsx                  # Citizen's submitted issue list & status tracking
    │   │   ├── nearby-issues/                # Location-based Nearby Issues Page
    │   │   │   └── page.tsx                  # Geospatial listing of issues near user
    │   │   ├── reports/                      # Reports Directory
    │   │   │   ├── [id]/                     # Report Detail Page
    │   │   │   │   └── page.tsx              # View single report, upvotes, history timeline, AR button
    │   │   │   ├── new/                      # Create New Report Page
    │   │   │   │   └── page.tsx              # Photo upload, geolocation picker, category selection
    │   │   │   └── page.tsx                  # Browse & search all public infrastructure reports
    │   │   ├── signup/                       # Authentication: Registration Page
    │   │   │   └── page.tsx                  # Register as User or Manager (Manager requires admin approval)
    │   │   ├── globals.css                   # Global CSS, dark theme styling, glassmorphism utilities
    │   │   ├── layout.tsx                    # Root Layout with AuthProvider, Navbar, Accessibility Overlay
    │   │   ├── manifest.json/                # PWA Manifest Route handler
    │   │   │   └── route.ts                  # Dynamic PWA manifest generator
    │   │   └── page.tsx                      # Main Landing / Home Page
    │   └── api/                              # REST API Route Handlers
    │       ├── admin/                        # Admin Management APIs
    │       │   └── managers/                 # Manager list and approval endpoint
    │       │       ├── [id]/route.ts         # PUT: Approve/reject manager, DELETE: manager account
    │       │       └── route.ts              # GET: List all registered city managers
    │       ├── analytics/                    # Analytics Data APIs
    │       │   ├── heatmap/route.ts          # GET: Aggregated lat/lng density & resolution rate grid
    │       │   └── resolution-rate/route.ts  # GET: Area/category resolution percentages & average resolution times
    │       ├── auth/                         # Authentication APIs
    │       │   ├── login/route.ts            # POST: Authenticate user, issue JWT HTTP-only cookie
    │       │   ├── logout/route.ts           # POST: Clear auth cookie
    │       │   ├── me/route.ts               # GET: Fetch authenticated session user data
    │       │   └── signup/route.ts           # POST: Register user/manager account (hashing password)
    │       ├── categories/route.ts           # GET: List active issue categories
    │       ├── reports/                      # Report Data APIs
    │       │   ├── [id]/                     # Single report CRUD & actions
    │       │   │   ├── upvote/route.ts       # POST: Toggle upvote on report
    │       │   │   └── route.ts              # GET: Fetch report detail, PATCH: Update status/assignment/resolution
    │       │   ├── city-stats/route.ts       # GET: City-wide metrics (total, pending, resolved, active managers)
    │       │   ├── my-reports/route.ts       # GET: Fetch reports submitted by authenticated user
    │       │   ├── nearby/route.ts           # GET: Geospatial `$near` query for nearby reports
    │       │   └── route.ts                  # GET: Paginated/filtered reports, POST: Create new report
    │       ├── upload/route.ts               # POST: Handle image upload to Cloudinary
    │       └── users/route.ts                # GET: User lookup / profile updates
    ├── components/                           # React UI Components
    │   ├── ui/                               # Atomic UI Components
    │   │   ├── Badge.tsx                     # Status & priority badges
    │   │   ├── Button.tsx                    # Custom styled button with variants
    │   │   ├── Card.tsx                      # Glassmorphism & border container cards
    │   │   ├── Input.tsx                     # Text input field with label/error states
    │   │   ├── Label.tsx                     # Form label component
    │   │   ├── Select.tsx                    # Dropdown select control
    │   │   └── Textarea.tsx                  # Multi-line text input
    │   ├── AccessibilityFeatures.tsx         # High contrast mode & font size adjuster toggle
    │   ├── AreaStatistics.tsx                # Area resolution metrics breakdown display
    │   ├── ARNavigationOverlay.tsx           # Camera live feed + Gyro compass HUD for AR direction guiding
    │   ├── DraggableLanguagePopup.tsx        # Floating quick language selection popup
    │   ├── HeatMapView.tsx                   # Dual Map Engine (Google Maps & Leaflet) for density & markers
    │   ├── InstallPWA.tsx                    # Prompt banner to install app as PWA
    │   ├── IssueProgressBar.tsx              # Graphical stage progress bar (Submitted ➔ Resolved)
    │   ├── KeyboardShortcuts.tsx             # Global hotkey listener (e.g. Nav shortcuts)
    │   ├── LanguageSwitcher.tsx              # Header language selector dropdown
    │   ├── Navbar.tsx                        # Global responsive header navigation with role links
    │   ├── RegisterServiceWorker.tsx         # Client-side service worker registration trigger
    │   ├── ResolutionChart.tsx               # Analytics chart rendered via Recharts
    │   └── ScreenReaderAnnouncer.tsx         # Live aria-announcements for screen reader support
    ├── contexts/                             # React Context Providers
    │   └── AuthContext.tsx                   # Global Auth Provider (`user`, `loading`, `login`, `signup`, `logout`)
    ├── i18n/                                 # Internationalization Setup
    │   ├── nevigation.ts                     # Localized navigation helpers (`Link`, `useRouter`, `usePathname`)
    │   ├── request.ts                        # Server request config for next-intl locale resolution
    │   └── routing.ts                        # `defineRouting` definition (`en`, `hi`, `mr`, default: `en`)
    ├── lib/                                  # Core Utilities & System Libraries
    │   └── mongodb.ts                        # Global Mongoose cached connection utility (`connectDB`)
    ├── messages/                             # i18n Translation Files
    │   ├── en.json                           # English dictionary
    │   ├── hi.json                           # Hindi dictionary (हिंदी)
    │   └── mr.json                           # Marathi dictionary (मराठी)
    ├── models/                               # Mongoose Schemas & Data Models
    │   ├── Category.ts                       # Issue Categories (`name`, `icon`, `color`, `isActive`)
    │   ├── Municipality.ts                   # Municipality SaaS entity (`code`, `areas`, `boundaries` GeoJSON)
    │   ├── Report.ts                         # Core Infrastructure Report model (2dsphere geospatial index)
    │   ├── ReportHistory.ts                  # Audit trail history entries for status change tracking
    │   └── User.ts                           # User accounts model (`user`, `manager`, `admin`, bcrypt hashing)
    ├── public/                               # Static Assets & PWA Config
    │   ├── icons/                            # PWA icons (72x72 to 512x512)
    │   ├── uploads/                          # Local fallback upload directory
    │   ├── manifest.json                     # Static web app manifest fallback
    │   └── sw.js                             # Progressive Web App Service Worker script
    ├── scripts/                              # Maintenance & Seeding Scripts
    │   ├── create-admin.js                   # Node script to create initial admin account
    │   ├── generate-icons.js                 # Helper script to generate PWA icons
    │   └── seed.ts                           # TSX script to seed initial categories & sample municipalities
    ├── .env.example                          # Environment template
    ├── .env.local                            # Local environment variables configuration
    ├── next.config.ts                        # Next.js configuration (PWA wrapping, next-intl plugin)
    ├── postcss.config.mjs                    # PostCSS configuration for Tailwind CSS 4
    ├── proxy.ts                              # Middleware file for route protection & JWT token validation
    ├── README.md                             # Project documentation
    └── tsconfig.json                         # TypeScript compiler settings
```

---

## 🗄️ Database Schemas & Data Models

### 1. `User` Model (`models/User.ts`)
- **Roles**: `'user'` | `'manager'` | `'admin'`
- **Fields**:
  - `email` *(String, unique, lowercase, required)*
  - `name` *(String, required)*
  - `password` *(String, required, select: false)*
  - `role` *(UserRole enum, default: 'user')*
  - `phone`, `avatar` *(String, optional)*
  - `managedAreas` *(Array of Strings - ward/area IDs assigned to manager)*
  - `municipalityId` *(String, optional)*
  - `isActive` *(Boolean, default: true)*
  - `isApproved` *(Boolean: default `true` for `user`/`admin`, `false` for `manager` until approved)*
  - `approvedBy` *(String)*, `approvedAt` *(Date)*
- **Hooks & Methods**:
  - `pre('save')`: Hashes password using `bcryptjs` with salt round 10 if modified.
  - `comparePassword(candidatePassword)`: Instance method returning `Promise<boolean>`.

### 2. `Report` Model (`models/Report.ts`)
- **Status Workflow**: `'submitted'` ➔ `'under_review'` ➔ `'in_progress'` ➔ `'resolved'` | `'closed'` | `'rejected'`
- **Priority**: `'low'` | `'medium'` | `'high'` | `'urgent'`
- **Fields**:
  - `title` *(String, max 200 chars)*, `description` *(String, max 2000 chars)*
  - `category` *(String, required)*
  - `status` *(ReportStatus, default: 'submitted')*
  - `priority` *(ReportPriority, default: 'medium')*
  - `location`: `{ type: 'Point', coordinates: [lng, lat] }` *(Validated longitude [-180, 180], latitude [-90, 90])*
  - `address` *(String, required)*, `area` *(String)*, `landmark` *(String)*
  - `images` *(Array of String URLs, max 10)*
  - `reportedBy` *(String, ref: 'User')*
  - `assignedTo` *(String, ref: 'User')*
  - `approvedBy` *(String, ref: 'User')*, `approvedAt` *(Date)*
  - `initiatedBy` *(String, ref: 'User')*, `initiatedAt` *(Date)*
  - `viewCount` *(Number, default: 0)*, `upvotes` *(Number, default: 0)*, `upvotedBy` *(Array of User IDs)*
  - `resolvedAt` *(Date)*, `resolutionNote` *(String)*, `resolutionImages` *(Array of String URLs)*
  - `estimatedResolutionDate` *(Date)*
  - `municipalityId` *(String)*, `isPublic` *(Boolean, default: true)*
- **Indexes**:
  - `location`: `'2dsphere'` (Geospatial queries)
  - `status + createdAt`, `reportedBy + createdAt`, `assignedTo + status`, `category + status`, `municipalityId + status`, `upvotes + createdAt`

### 3. `ReportHistory` Model (`models/ReportHistory.ts`)
- **Action Types**: `'created'`, `'status_changed'`, `'assigned'`, `'reassigned'`, `'priority_changed'`, `'comment_added'`, `'images_added'`, `'resolved'`, `'reopened'`
- **Fields**:
  - `reportId` *(String, indexed)*
  - `actionType` *(ActionType, required)*
  - `performedBy` *(String, ref: 'User', required)*
  - `previousValue` *(String)*, `newValue` *(String)*, `comment` *(String)*
  - `timestamp` *(Date, default: Date.now, indexed)*
  - `ipAddress` *(String)*

### 4. `Category` Model (`models/Category.ts`)
- **Fields**: `name` *(String, unique)*, `description`, `icon` *(Emoji string, e.g. '🕳️')*, `color` *(Hex code)*, `isActive` *(Boolean)*.

### 5. `Municipality` Model (`models/Municipality.ts`)
- **Fields**: `name` *(String)*, `code` *(String, unique)*, `state`, `country`, `areas` *(Array of Strings)*, `boundaries` *(GeoJSON Polygon with 2dsphere index)*, `contactEmail`, `contactPhone`, `isActive`.

---

## 🔐 Authentication, Middleware & RBAC Architecture

### Auth Token Flow:
1. User logs in at `/api/auth/login` or registers at `/api/auth/signup`.
2. Server generates a signed JWT payload containing: `{ userId, email, role, name, isApproved }`.
3. Token is stored in an HTTP-only cookie named `auth-token` (Expiration: 7 days).
4. `AuthContext.tsx` invokes `/api/auth/me` on mount to populate user session state globally.

### Middleware Route Guard (`proxy.ts`):
- Skips API routes (`/api/*`), manifest, service worker, and static assets.
- Appends `next-intl` localization middleware for locale resolution (`/en`, `/hi`, `/mr`).
- Allows unauthenticated access to public routes: `/`, `/login`, `/signup`, etc.
- Intercepts protected paths:
  - `/admin`: Checks `role === 'admin'`. Redirects non-admins to home `/`.
  - `/dashboard/manager`: Checks `role === 'manager' || role === 'admin'`. Requires `isApproved === true` for managers; unapproved managers are redirected to home with a pending approval alert.

---

## 📡 REST API Matrix

| Path | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/signup` | `POST` | No | Registers new citizen user or city manager. |
| `/api/auth/login` | `POST` | No | Validates credentials & sets HTTP-only `auth-token` cookie. |
| `/api/auth/logout` | `POST` | No | Clears `auth-token` cookie. |
| `/api/auth/me` | `GET` | Optional | Decodes session token and returns current user details. |
| `/api/reports` | `GET` | No | Paginated list of reports with query parameters (`status`, `category`, `assignedTo`, `reportedBy`, `area`). |
| `/api/reports` | `POST` | Yes | Submits a new infrastructure issue report & logs history entry. |
| `/api/reports/[id]` | `GET` | No | Fetches full detail of a single report. |
| `/api/reports/[id]` | `PATCH` | Yes (Manager/Admin) | Updates status, assignee, priority, resolution notes, and resolution photos. |
| `/api/reports/[id]/upvote` | `POST` | Yes | Toggles upvote for a report by the authenticated user. |
| `/api/reports/nearby` | `GET` | No | Performs MongoDB `$near` geospatial query using `lng`, `lat`, and `maxDistance` (in meters). |
| `/api/reports/my-reports` | `GET` | Yes | Retrieves all reports submitted by the logged-in user. |
| `/api/reports/city-stats` | `GET` | No | Returns aggregated counts of total, pending, in-progress, and resolved reports. |
| `/api/analytics/heatmap` | `GET` | No | Aggregates reports into grid clusters returning lat, lng, total count, and resolution rate. |
| `/api/analytics/resolution-rate`| `GET` | No | Computes resolution percentages broken down by municipality ward/area and category. |
| `/api/admin/managers` | `GET` | Yes (Admin) | Lists all registered city manager accounts and approval statuses. |
| `/api/admin/managers/[id]` | `PUT` | Yes (Admin) | Toggles manager approval state (`isApproved`). |
| `/api/admin/managers/[id]` | `DELETE` font-mono | Yes (Admin) | Removes a manager account. |
| `/api/categories` | `GET` | No | Fetches all active issue categories. |
| `/api/upload` | `POST` | Yes | Uploads base64/form image to Cloudinary and returns CDN URL. |

---

## 🎨 Core Engine & UI Implementations

### 1. Dual-Engine Interactive Map (`components/HeatMapView.tsx`)
- **Primary Engine**: Google Maps JS loader (`@googlemaps/js-api-loader`). Applied when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is present. Supports Hybrid Satellite, Street, Dark Mode (`DARK_MAP_STYLE`), Light Mode, Outdoors, and Navigation styles.
- **Fallback Engine**: Zero-config Leaflet tile layer system (`https://{s}.tile.openstreetmap.org/...` & CartoDB basemaps). Automatically fallback if Google Maps API key is missing or fails authentication (`gm_authFailure`).
- **Heatmap Layer**: Visualizes report density with dynamic weight based on priority (`urgent` = 3, `high` = 2, `medium`/`low` = 1).
- **Marker Layer**: Dynamic category icons inside SVG pulse pins colored by report status (`#3b82f6` for submitted, `#eab308` for under review, `#8b5cf6` for in progress, `#22c55e` for resolved). Urgent items include animated ping rings.

### 2. AR Navigation HUD Engine (`components/ARNavigationOverlay.tsx`)
- **Camera Feed**: Accesses environment rear camera via `navigator.mediaDevices.getUserMedia`.
- **Gyro Orientation Smoothing**: Listens to `DeviceOrientationEvent` (`alpha` or iOS `webkitCompassHeading`). Uses Low-Pass Filtering Exponential Moving Average (`diff * 0.25`) to prevent sensor jitter.
- **Bearing Calculation**: Computes real-time target angle relative to phone orientation (`arrowRotation = bearing - deviceOrientation`).
- **HUD Interface**: Displays live directional tracking arrow, distance meter, off-camera turn guidance banners, and target issue summary card.

### 3. AI Object Detection Layer
- Loads TensorFlow.js (`@tensorflow/tfjs`) and COCO-SSD (`@tensorflow-models/coco-ssd`).
- Automatically scans camera frames for infrastructure-related objects (vehicles, street furniture, hazards) to assist report categorizations.

### 4. Internationalization (`next-intl`)
- Locales: English (`en`), Hindi (`hi`), Marathi (`mr`).
- Routing configured in `i18n/routing.ts`. Translations stored in `messages/{locale}.json`.
- Navigation components imported from `i18n/nevigation.ts` guarantee locale-aware URL routing.

---

## ⚙️ Environment Variables (`.env.local`)

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/infrareport?retryWrites=true&w=majority

# JWT Secret Key for Session Token Signing
JWT_SECRET=your_super_secret_jwt_key_here

# Cloudinary CDN Credentials for Image Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Map Tokens & API Keys
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1I...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 🚦 Getting Started & Useful CLI Commands

- **Install Dependencies**: `npm install`
- **Run Development Server**: `npm run dev` (Runs on `http://localhost:3000` with host `0.0.0.0`)
- **Seed Database**: `npm run seed` (Executes `tsx scripts/seed.ts` to populate default categories and municipalities)
- **Create Admin Account**: `node scripts/create-admin.js`
- **Build Production Bundle**: `npm run build`
- **Start Production Server**: `npm run start`
