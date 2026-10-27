import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/en',
  '/hi',
  '/mr',
  '/login',
  '/signup',
  '/sign-in',
  '/sign-up',
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    const localePattern = /^\/(en|hi|mr)/;
    const cleanPath = pathname.replace(localePattern, '');
    return cleanPath === route || cleanPath.startsWith(route + '/');
  });
}

export default async function middleware(req: NextRequest) {
  try {
    // Skip authentication and intl routing for API routes and static PWA assets
    if (
      req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname === '/manifest.json' ||
      req.nextUrl.pathname === '/sw.js' ||
      req.nextUrl.pathname.startsWith('/icons/') ||
      req.nextUrl.pathname.endsWith('.json')
    ) {
      return NextResponse.next();
    }

    // Handle i18n for non-API routes
    const intlResponse = intlMiddleware(req);
    if (intlResponse) return intlResponse;

    // Allow access to public routes
    if (isPublicRoute(req.nextUrl.pathname)) {
      return NextResponse.next();
    }

    // Check authentication for protected routes
    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
      const pathParts = req.nextUrl.pathname.split('/').filter(Boolean);
      const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const pathname = req.nextUrl.pathname;

      if (pathname.includes('/admin') && decoded.role !== 'admin') {
        const pathParts = pathname.split('/').filter(Boolean);
        const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
        return NextResponse.redirect(new URL(`/${locale}`, req.url));
      }

      if (pathname.includes('/dashboard/manager')) {
        if (decoded.role !== 'manager' && decoded.role !== 'admin') {
          const pathParts = pathname.split('/').filter(Boolean);
          const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
          return NextResponse.redirect(new URL(`/${locale}`, req.url));
        }

        if (decoded.role === 'manager' && !decoded.isApproved) {
          const pathParts = pathname.split('/').filter(Boolean);
          const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
          return NextResponse.redirect(new URL(`/${locale}`, req.url));
        }
      }

      if (pathname.includes('/dashboard/supervisor')) {
        if (decoded.role !== 'supervisor' && decoded.role !== 'manager' && decoded.role !== 'admin') {
          const pathParts = pathname.split('/').filter(Boolean);
          const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
          return NextResponse.redirect(new URL(`/${locale}`, req.url));
        }

        if (decoded.role === 'supervisor' && !decoded.isApproved) {
          const pathParts = pathname.split('/').filter(Boolean);
          const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
          return NextResponse.redirect(new URL(`/${locale}`, req.url));
        }
      }

      return NextResponse.next();
    } catch (error) {
      const pathParts = req.nextUrl.pathname.split('/').filter(Boolean);
      const locale = ['en', 'hi', 'mr'].includes(pathParts[0]) ? pathParts[0] : 'en';
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, manifest, and API routes
    '/((?!api|_next|manifest\\.json|sw\\.js|icons|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
