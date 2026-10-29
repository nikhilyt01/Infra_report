# 🏗️ InfraReport — AI-Powered Infrastructure Crowdsourcing Platform

> A full-stack municipal infrastructure reporting system with role-based workflows, real-time notifications, geospatial duplicate detection, AR visualization, heat maps, multilingual support, and a complete lifecycle audit trail.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [User Roles & Permissions](#-user-roles--permissions)
- [Core Features](#-core-features)
- [Report Lifecycle Workflow](#-report-lifecycle-workflow)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Database Models](#-database-models)
- [API Reference](#-api-reference)
- [Notification System](#-notification-system)
- [Edge Cases & Business Rules](#-edge-cases--business-rules)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🌐 Overview

InfraReport allows **citizens** to photograph and geo-tag infrastructure problems (potholes, broken streetlights, drainage issues, etc.) and tracks them through a full municipal resolution workflow. The platform is built with:

- **Next.js 15 App Router** with TypeScript
- **MongoDB** (Mongoose) with 2dsphere geospatial indexing
- **JWT-based auth** with role-gated middleware
- **Cloudinary** for image hosting
- **Mapbox GL JS** for heat maps
- **TensorFlow.js / COCO-SSD** for AR object detection
- **next-intl** for English / Hindi / Marathi (EN / HI / MR) i18n

---

## 👥 User Roles & Permissions

| Role | Description | Key Capabilities |
|---|---|---|
| **Citizen (user)** | General public | Submit reports, upvote, track status, download PDF, view timeline |
| **Supervisor** | Field technician | Must be approved by manager. Can update status of **assigned** reports only |
| **Manager** | Municipal officer | Approve/reject reports, assign supervisors, change priority, resolve |
| **Admin** | System administrator | Approve managers, full access to all reports and users |

> **Supervisor approval flow**: A supervisor registers → manager gets notification → manager approves → supervisor gets `supervisor_approved` notification → can now access assigned reports.

---

## ✨ Core Features

### 🛡️ Authentication & Access Control
- JWT cookie-based auth (`auth-token`) with bcrypt password hashing
- Role-based route protection: unauthenticated users are redirected to `/login?message=login_required` with a clear prompt
- Live DB role checks on every PATCH (stale JWT tokens never cause false 403s)
- Supervisor approval gating — pending supervisors cannot perform lifecycle actions

### 📸 Report Submission (Zero-Friction Flow)
- **Live camera capture** with GPS lock at photo-snap moment (anti-spoofing — coordinates cannot be manually changed after capture)
- **Predefined category dropdown** with ability to type custom categories (reduces garbage input)
- **Initial priority always set to `low`** (community upvotes and manager decisions escalate it)
- **100-metre geospatial duplicate detection** — before submission, the system queries MongoDB with a `$near` / `2dsphere` query for reports in the same category within 100 m. If duplicates exist, the user sees a warning with links to the existing reports
- Cloudinary image upload with progress feedback

### 🗺️ Geospatial Features
- `2dsphere` index on `Report.location` for fast `$near` queries
- Duplicate detection radius: **100 metres**
- **Heat Map** (Mapbox GL JS): aggregates reports by grid cell with resolution rate % and interactive tooltips
- **AR Camera View** (TensorFlow.js + COCO-SSD): point camera at a location to see nearby historical reports overlaid with distance, status badges, and navigation

### 📊 Upvote & Priority Escalation System
- One vote per authenticated user (atomic pipeline update prevents double-insert race conditions)
- **Escalation ratchet** — community upvotes can only raise priority, never lower it (protects manager overrides):
  - 1 vote → `medium`
  - 2 votes → `high`
  - 4 votes → `urgent`
- **Upvoting is blocked on resolved / closed / rejected reports** (both API 400 response and UI button disabled with tooltip)
- When priority escalates to `high` or `urgent`, the assigned supervisor receives an `urgent_escalation` notification

### 📜 Audit Trail & Timeline
- Every status change, assignment, priority change, and approval is written to `ReportHistory` as an **immutable** entry
- Timeline rendered with actor name, role, note, and timestamp
- **Post-resolution filtering**: once a report is resolved, `priority_changed` entries that occurred after the resolution event are excluded from the audit trail (prevents timeline noise from stale upvote jobs)
- Backward-compatible synthetic history entries for legacy reports that predate the history collection

### 📥 Download Report (PDF)
- Available on every report detail page (`/reports/[id]`) via the **Download** button
- Opens a new browser window with a fully styled print-ready HTML document containing:
  - Status & priority badges, category, upvote count
  - Full description, address, GPS coordinates (with Google Maps link)
  - Reporter info, dates, estimated resolution date
  - Municipal Response Team (Manager / Supervisor / Officer / Initiator)
  - All evidence photos in a 3-column grid
  - Complete audit trail table
  - InfraReport branding and report ID footer
- User clicks **Print / Save as PDF** to download — no external library required

### 🔔 Notification System
Full real-time notification panel (bell icon in navbar) with unread count badge. Notifications are:

| Type | Triggered When | Recipient |
|---|---|---|
| `supervisor_signup` | New supervisor registers | All managers + admins |
| `supervisor_approved` | Manager activates supervisor account | The supervisor |
| `report_assigned` | Manager assigns report to supervisor | The supervisor |
| `general` (unassignment) | Report reassigned away from supervisor | Previous supervisor |
| `urgent_escalation` | Community upvotes push priority to high/urgent | Assigned supervisor |
| `report_resolved` | Report status transitions to resolved | Original reporter + all upvoters |

- Notification panel is **fully mobile responsive**
- `$or` recipient matching (ObjectId + string) prevents ID-format mismatches across legacy records
- Mark individual or all notifications as read

### 🌏 Multilingual Support (i18n)
- **English (en)**, **Hindi (hi)**, **Marathi (mr)** via `next-intl`
- All routes are locale-prefixed: `/en/reports`, `/hi/reports`, `/mr/reports`
- Language switcher in navbar

### 📈 Analytics Dashboard
- Resolution rate by area (%)
- Average resolution time
- Status distribution (pie / bar charts via Recharts)
- Daily / weekly new-report trend
- Category-wise issue frequency

### 🎨 Design System
- Dark mode first, with light mode toggle
- Glassmorphism cards, gradient headers
- Smooth micro-animations and hover states
- Google Fonts (Inter / Outfit)
- Fully responsive from 320 px mobile to 4K desktop

---

## 🔄 Report Lifecycle Workflow

```
[Citizen] Submits Report
    ↓  (status: submitted, priority: low)
[Manager] Reviews → Approves
    ↓  (status: under_review, approvedBy: manager)
[Manager] Assigns to Supervisor
    ↓  (status: under_review → in_progress, assignedTo: supervisor)
    ↓  Supervisor receives "report_assigned" notification
[Supervisor] Updates progress notes / resolves
    ↓  (status: in_progress → resolved)
[Manager] Can reject, close, or reopen at any point

Community upvotes → auto-escalate priority (low → medium → high → urgent)
    ↓  Supervisor receives "urgent_escalation" notification if priority hits high/urgent
```

**Terminal statuses**: `resolved`, `closed`, `rejected` — no upvotes accepted, audit trail frozen for priority entries.

---

## 🔧 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | MongoDB 7+ with Mongoose |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Styling | Tailwind CSS 4 + Vanilla CSS |
| Maps | Mapbox GL JS |
| AI / AR | TensorFlow.js, COCO-SSD |
| Charts | Recharts |
| Image Storage | Cloudinary |
| i18n | next-intl |
| Icons | Lucide React |

---

## 📁 Project Structure

```
InfraReport-AI-Infrastructure-Platform/
├── app/
│   ├── [locale]/                    # i18n routes (en/hi/mr)
│   │   ├── page.tsx                 # Landing / home
│   │   ├── login/                   # Login (redirects guests with message)
│   │   ├── signup/                  # Signup
│   │   ├── reports/
│   │   │   ├── page.tsx             # All public reports list
│   │   │   ├── new/                 # Report submission form
│   │   │   └── [id]/page.tsx        # Report detail + Download PDF + Timeline
│   │   ├── my-reports/              # Citizen's own reports
│   │   ├── notifications/           # Full notifications page
│   │   ├── dashboard/
│   │   │   ├── manager/             # Manager dashboard (assign, approve, analytics)
│   │   │   └── supervisor/          # Supervisor task queue
│   │   ├── map/                     # Heat map view
│   │   └── ar-view/                 # AR camera view
│   └── api/
│       ├── reports/
│       │   ├── route.ts             # GET all / POST create (with duplicate check)
│       │   └── [id]/
│       │       ├── route.ts         # GET / PATCH / DELETE
│       │       ├── upvote/route.ts  # POST toggle upvote (blocked on resolved)
│       │       └── history/route.ts # GET audit trail (filtered post-resolution)
│       ├── auth/                    # login / signup / me / logout
│       ├── notifications/route.ts   # GET list / PATCH mark-read
│       ├── manager/
│       │   └── supervisors/[id]/    # PUT approve/revoke supervisor
│       ├── analytics/               # Heat map data, stats
│       ├── categories/              # Category management
│       └── upload/                  # Cloudinary upload
│
├── components/
│   ├── Navbar.tsx                   # With notification bell + unread badge
│   ├── NotificationDropdown.tsx     # Mobile-responsive notification panel
│   ├── IssueProgressBar.tsx         # Visual lifecycle stepper
│   ├── StatusTimeline.tsx           # Audit trail timeline component
│   ├── StatusUpdateModal.tsx        # Evidence-gated status change modal
│   ├── BeforeAfterComparison.tsx    # Resolution before/after image slider
│   ├── HeatMapView.tsx              # Mapbox heat map
│   ├── ARCameraView.tsx             # TF.js AR camera overlay
│   └── ui/                          # Button, Card, etc.
│
├── models/
│   ├── User.ts                      # roles: user | supervisor | manager | admin
│   ├── Report.ts                    # 2dsphere location, upvotedBy[], status, priority
│   ├── ReportHistory.ts             # Immutable audit entries
│   ├── Notification.ts              # Types: supervisor_approved | report_assigned | urgent_escalation | report_resolved | supervisor_signup | general
│   ├── Category.ts
│   └── Municipality.ts
│
├── lib/
│   ├── mongodb.ts                   # Mongoose connection singleton
│   ├── notifications.ts             # notifyReportResolved, notifySupervisorApproved,
│   │                                #   notifyReportAssigned, notifyReportUnassigned,
│   │                                #   notifyUrgentEscalation, markSupervisorNotificationsRead
│   └── reportLifecycle.ts           # validateStatusTransition
│
├── contexts/
│   ├── AuthContext.tsx              # useAuth() hook
│   └── ToastContext.tsx             # useToast() hook
│
├── messages/                        # en.json, hi.json, mr.json
├── scripts/
│   └── create-admin.js             # Bootstrap first admin account
└── i18n/                           # next-intl config
```

---

## 🗄️ Database Models

### User
```typescript
role: 'user' | 'supervisor' | 'manager' | 'admin'
isApproved: boolean          // supervisors and managers must be approved
supervisorCode: string       // unique code for supervisor registration
municipalityId: ObjectId
approvedBy: string           // ID of manager who approved
approvedAt: Date
```

### Report
```typescript
title, description, category, status, priority
location: { type: 'Point', coordinates: [lng, lat] }  // 2dsphere indexed
images: string[]             // Cloudinary URLs
upvotes: number
upvotedBy: string[]          // voter IDs (atomic pipeline)
reportedBy: ObjectId → User
assignedTo: ObjectId → User  // Field Supervisor
assignedBy: ObjectId → User  // Manager who assigned
approvedBy: ObjectId → User  // Manager who approved
initiatedBy: ObjectId → User // Who marked in_progress
resolutionImages: string[]
resolutionNote: string
estimatedResolutionDate: Date
resolvedAt: Date
```

### ReportHistory (Immutable Audit Trail)
```typescript
reportId: ObjectId
actionType: 'created' | 'status_changed' | 'resolved' | 'reopened' | 'assigned' | 'reassigned' | 'priority_changed'
fromStatus, toStatus: string
actorId, actorName, actorRole: string
note, comment: string
resolutionImages: string[]
timestamp: Date
ipAddress: string
```

### Notification
```typescript
recipient: ObjectId → User
type: 'report_resolved' | 'supervisor_signup' | 'supervisor_approved' | 'report_assigned' | 'urgent_escalation' | 'general'
title, message: string
link: string
reportId?: ObjectId
relatedUserId?: ObjectId
isRead: boolean
metadata: Record<string, any>
```

---

## 🔐 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | ❌ | Register (user/supervisor/manager) |
| POST | `/api/auth/login` | ❌ | Login, sets `auth-token` cookie |
| GET | `/api/auth/me` | ✅ | Current user session |
| POST | `/api/auth/logout` | ✅ | Clear auth cookie |
| GET | `/api/reports` | ❌ | List reports (filterable, paginated) |
| POST | `/api/reports` | ✅ User | Submit new report (includes 100m geo duplicate check) |
| GET | `/api/reports/[id]` | ❌ | Get report detail (viewer upvote state if logged in) |
| PATCH | `/api/reports/[id]` | ✅ Manager/Admin/Supervisor | Update status, assign, priority, approve |
| DELETE | `/api/reports/[id]` | ✅ Admin only | Delete report |
| POST | `/api/reports/[id]/upvote` | ✅ User | Toggle upvote (blocked on resolved/closed/rejected) |
| GET | `/api/reports/[id]/history` | ❌ | Audit trail (post-resolution priority entries excluded) |
| GET | `/api/notifications` | ✅ | List notifications for current user |
| PATCH | `/api/notifications` | ✅ | Mark all or selected as read |
| PUT | `/api/manager/supervisors/[id]` | ✅ Manager/Admin | Approve or revoke supervisor |
| GET | `/api/analytics/heatmap` | ❌ | Heat map grid data |
| POST | `/api/upload` | ✅ | Upload image to Cloudinary |

---

## 🔔 Notification System

All notification helpers live in [`lib/notifications.ts`](lib/notifications.ts):

```typescript
notifyReportResolved(reportId, actorId, actorName?)
// → notifies original reporter + all upvoters (deduped, excludes actor)

notifySupervisorSignup(supervisorId, supervisorName, supervisorCode)
// → notifies all active managers + admins

notifySupervisorApproved(supervisorId, supervisorName, managerName?)
// → notifies the supervisor when their account is activated

notifyReportAssigned({ reportId, reportTitle, category, area, supervisorId, managerName? })
// → notifies supervisor of new task assignment

notifyReportUnassigned({ reportId, reportTitle, supervisorId, managerName? })
// → notifies supervisor when reassigned away from them

notifyUrgentEscalation({ reportId, reportTitle, supervisorId, newPriority, upvoteCount? })
// → notifies supervisor when community upvotes push priority to high/urgent

markSupervisorNotificationsRead(supervisorId)
// → auto-marks pending supervisor_signup notifications as read after manager acts
```

**Recipient matching**: uses `$or: [{ recipient: ObjectId }, { recipient: stringId }]` to handle both storage conventions in legacy vs. new records.

---

## 🧩 Edge Cases & Business Rules

| Scenario | Behaviour |
|---|---|
| Unauthenticated user tries to upvote | Redirected to `/login?message=login_required&redirect=...` |
| Upvote on resolved/closed/rejected report | API returns 400; button disabled with tooltip |
| Supervisor tries to upvote-escalate after resolution | Blocked at API level |
| Two rapid upvote clicks (race condition) | Atomic `$set + $cond + $setDifference` pipeline prevents double-insert |
| Community upvotes would lower priority below manager's setting | `$max` ratchet prevents downgrade |
| Audit trail on resolved report | `priority_changed` entries after resolution are excluded from history response |
| Legacy report with no `assignedBy`/`approvedBy` | Falls back to last manager-role audit history entry |
| Supervisor with pending approval tries to act | 403 with "Your supervisor account is pending approval" |
| Supervisor tries to act on report not assigned to them | 403 with "You can only act on reports assigned to you" |
| Duplicate report within 100 m of same category | Pre-submission warning shown with links to existing reports |
| GPS coordinates locked after camera capture | `coordinates` field frozen post-capture to prevent location spoofing |
| Manager approves/rejects supervisor | Related `supervisor_signup` notifications auto-marked read |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
See [Environment Variables](#-environment-variables) section below.

### 3. Create First Admin
```bash
node scripts/create-admin.js
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/infrareport

# JWT Authentication
JWT_SECRET=your_very_secure_secret_key_here

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mapbox (Heat Map & AR Maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| Maps not showing | Verify `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| Images not uploading | Check Cloudinary credentials |
| Database errors | Confirm MongoDB URI format; check Atlas network access |
| AR not working | Requires HTTPS for camera permission; enable location services |
| Supervisor can't see reports | Ensure manager has approved the supervisor account |
| Notifications not appearing | Check `$or` recipient ID format in DB; verify JWT has correct `userId` |
| Duplicate detection not triggering | Ensure MongoDB 2dsphere index exists on `Report.location` |

---

## 📖 Additional Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) — Detailed setup and MongoDB configuration
- [AUTH_SETUP.md](AUTH_SETUP.md) — Authentication system deep-dive
- [QUICK_START.md](QUICK_START.md) — Quick start checklist
- [PROJECT_MEMORY.md](PROJECT_MEMORY.md) — Full historical development log

---

## 📄 License

MIT License — built for academic and municipal open-source use.