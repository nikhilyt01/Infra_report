# Custom Authentication System

This project uses a custom JWT-based authentication system with role-based access control.

## Features

- **JWT Authentication**: Secure token-based authentication with HTTP-only cookies
- **Role-Based Access Control**: Three user roles (User, Manager, Admin)
- **Manager Approval Workflow**: Managers require admin approval before accessing dashboard
- **Password Hashing**: bcrypt password hashing for secure credential storage

## User Roles

### User (Citizen)
- Can create and view infrastructure reports
- Can access map and statistics
- Automatically approved upon registration
- Access to: Home, Reports, Map

### Manager (City Manager)
- All user permissions
- Can manage and resolve reports
- **Requires admin approval** before accessing manager dashboard
- Access to: Home, Reports, Map, Manager Dashboard (after approval)

### Admin
- All manager permissions
- Can approve/reject manager accounts
- Can manage users
- Access to: All pages + Admin Dashboard

## Setup

### 1. Install Dependencies

```bash
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
```

### 2. Environment Variables

Add to `.env.local`:

```env
JWT_SECRET=your-super-secure-secret-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/infrastructure-reports
```

**Important**: Change `JWT_SECRET` to a strong random string in production!

### 3. Create Admin Account

Run the admin creation script:

```bash
node scripts/create-admin.js
```

Default admin credentials:
- Email: `admin@infrareport.com`
- Password: `admin123`

**⚠️ Change the password immediately after first login!**

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
  - Body: `{ name, email, password, role: 'user' | 'manager' }`
  - Returns: User object (managers receive pending approval message)

- `POST /api/auth/login` - User login
  - Body: `{ email, password }`
  - Returns: User object + JWT token (set as HTTP-only cookie)
  - Error: Unapproved managers receive specific error message

- `POST /api/auth/logout` - User logout
  - Clears auth cookie

- `GET /api/auth/me` - Get current user
  - Returns: Current user data (if authenticated)

### Admin Routes

- `GET /api/admin/managers?status=pending|approved|all` - List managers
  - Admin only
  - Filter by approval status

- `PUT /api/admin/managers/[id]` - Approve manager
  - Admin only
  - Updates manager's `isApproved` status

- `DELETE /api/admin/managers/[id]` - Reject/deactivate manager
  - Admin only
  - Sets manager's `isActive` to false

## Usage Flow

### New User Registration

1. User signs up at `/en/signup`
2. Selects role (User or Manager)
3. If User → Auto-approved, redirected to home
4. If Manager → Pending approval, redirected to login with message

### Manager Approval Workflow

1. Manager signs up and receives "pending approval" message
2. Manager cannot log in until approved
3. Admin logs in and goes to Admin Dashboard (`/en/admin`)
4. Admin sees pending managers list
5. Admin approves or rejects manager
6. Approved manager can now log in and access dashboard

### Login Flow

1. User enters credentials at `/en/login`
2. System validates credentials
3. If manager is not approved → Error message
4. If valid → JWT token created and set as HTTP-only cookie
5. User redirected to home page
6. Navbar shows role-specific links

## Frontend Components

### AuthContext

Global authentication state management:

```tsx
const { user, loading, login, signup, logout, checkAuth } = useAuth();
```

### Protected Routes

Middleware automatically protects routes based on role:
- `/reports/new` - Requires authentication
- `/dashboard/manager` - Requires manager or admin role + approval
- `/admin` - Requires admin role

### Navbar

Dynamic navigation based on user role:
- Not logged in → Sign In button
- User → Home, Reports, Map
- Manager (approved) → Home, Reports, Map, Dashboard
- Admin → Home, Reports, Map, Dashboard, Admin

## Pages

- `/en/login` - Login page
- `/en/signup` - Registration page with role selection
- `/en/admin` - Admin dashboard for manager approval
- `/en/dashboard/manager` - Manager dashboard (requires approval)

## Security Features

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: 7-day expiration
3. **HTTP-Only Cookies**: Prevents XSS attacks
4. **Role Validation**: Server-side role checking on all protected routes
5. **Middleware Protection**: Automatic route protection based on roles
6. **Manager Approval**: Two-step verification for manager accounts

## Migration from Clerk

This system replaces Clerk authentication:

1. ✅ Removed `@clerk/nextjs` dependency
2. ✅ Removed `ClerkProvider` from layout
3. ✅ Removed `SignedIn`, `SignedOut`, `UserButton` components
4. ✅ Updated Navbar with custom auth UI
5. ✅ Created custom login/signup pages
6. ✅ Implemented JWT-based session management
7. ✅ Added role-based access control
8. ✅ Created admin dashboard for manager approval

## Testing

### Test User Account
1. Sign up at `/en/signup` with role "User"
2. Should be automatically logged in
3. Can access: Reports, Map

### Test Manager Account
1. Sign up at `/en/signup` with role "Manager"
2. See "pending approval" message
3. Cannot log in yet
4. Admin must approve from `/en/admin`
5. After approval, can log in and access dashboard

### Test Admin Account
1. Log in with admin credentials
2. Go to `/en/admin`
3. See list of pending managers
4. Approve or reject managers
5. Access all features

## Troubleshooting

### "Manager account pending approval" error
- Manager accounts require admin approval
- Contact admin or wait for approval

### JWT token errors
- Ensure `JWT_SECRET` is set in `.env.local`
- Check token expiration (7 days)
- Try logging out and logging in again

### Cannot access protected routes
- Check user role and approval status
- Verify middleware is working
- Check browser cookies for `auth-token`

## Next Steps

1. Change default admin password
2. Update `JWT_SECRET` to strong random value
3. Set up password reset functionality
4. Add email notifications for manager approval
5. Implement rate limiting on auth endpoints
6. Add 2FA for admin accounts
