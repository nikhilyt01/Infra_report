'use client';

import Link from "next/link";
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useState } from 'react';
import { 
  Home, 
  Map, 
  FolderOpen, 
  MapPin, 
  Plus, 
  LogIn, 
  Construction, 
  LogOut, 
  Shield, 
  Menu, 
  X, 
  LayoutDashboard, 
  FileText, 
  User, 
  ClipboardCheck,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Navbar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedSupervisorId, setCopiedSupervisorId] = useState(false);

  const handleCopySupervisorId = () => {
    if (user?.supervisorCode) {
      navigator.clipboard.writeText(user.supervisorCode);
      setCopiedSupervisorId(true);
      setTimeout(() => setCopiedSupervisorId(false), 2000);
      toast.success(
        `Supervisor ID (${user.supervisorCode}) copied to clipboard! Share with your Municipal Admin for approval.`,
        'ID Copied'
      );
    }
  };
  
  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}`);
  };

  const isActive = (path: string) => {
    if (path === `/${locale}`) return pathname === `/${locale}`;
    return pathname.startsWith(path);
  };

  return (
    <nav className="w-full border-b border-border/80 bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-xs" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link 
            href={`/${locale}`} 
            className="flex items-center gap-3 group shrink-0"
            aria-label="InfraReport Home"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-xs">
              <Construction className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground tracking-tight flex items-center gap-1.5 leading-tight">
                InfraReport
              </span>
              <span className="hidden sm:block text-[11px] text-muted-foreground font-medium">
                Civic Infrastructure Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            <Link 
              href={`/${locale}`} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive(`/${locale}`) && pathname === `/${locale}`
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link 
              href={`/${locale}/map`} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive(`/${locale}/map`)
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Heat Map</span>
            </Link>

            <Link 
              href={`/${locale}/reports`} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive(`/${locale}/reports`) && !pathname.includes('/reports/new')
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>All Reports</span>
            </Link>

            <Link 
              href={`/${locale}/nearby-issues`} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive(`/${locale}/nearby-issues`)
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Find Nearby</span>
            </Link>
            
            {user && (
              <>
                <Link 
                  href={`/${locale}/my-reports`} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive(`/${locale}/my-reports`)
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>My Reports</span>
                </Link>

                {user.role === 'supervisor' && (
                  <Link 
                    href={`/${locale}/dashboard/supervisor`} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive(`/${locale}/dashboard/supervisor`)
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 text-amber-500" />
                    <span>My Work Orders</span>
                    {!user.isApproved && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                        Pending
                      </span>
                    )}
                  </Link>
                )}
                
                {user.role === 'manager' && user.isApproved && (
                  <Link 
                    href={`/${locale}/dashboard/manager`} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive(`/${locale}/dashboard/manager`)
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Manager Portal</span>
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link 
                    href={`/${locale}/admin`} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive(`/${locale}/admin`)
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Action & Auth Area */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Primary Action Button */}
            <Link href={`/${locale}/reports/new`}>
              <Button size="sm" className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 shadow-xs">
                <Plus className="w-4 h-4" />
                <span>Report Issue</span>
              </Button>
            </Link>

            {/* Auth State */}
            {!user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-border/80">
                <Link 
                  href={`/${locale}/login`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href={`/${locale}/signup`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all border border-border/80"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-border/80">
                <div 
                  className={`flex items-center gap-2 px-2.5 py-1 bg-secondary/60 rounded-lg border border-border/60 ${
                    user.role === 'supervisor' ? 'cursor-pointer hover:border-amber-500/50 hover:bg-secondary/90 transition-all' : ''
                  }`}
                  onClick={user.role === 'supervisor' ? handleCopySupervisorId : undefined}
                  title={user.role === 'supervisor' ? `Click to copy Supervisor ID (${user.supervisorCode || 'Generating...'})` : undefined}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    user.role === 'supervisor' ? 'bg-amber-500 text-gray-950 shadow-xs' : 'bg-primary text-primary-foreground'
                  }`}>
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[100px] leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize leading-tight">
                      {user.role}
                    </span>
                    {user.role === 'supervisor' && user.supervisorCode && (
                      <span
                        className="text-[9px] font-mono font-bold text-amber-500 flex items-center gap-1 hover:text-amber-400 transition-colors leading-tight"
                      >
                        <span>ID: {user.supervisorCode}</span>
                        {copiedSupervisorId ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-amber-500/70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <Link href={`/${locale}/reports/new`}>
              <Button size="sm" className="flex items-center gap-1 text-xs px-2.5 py-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Report</span>
              </Button>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/80 bg-card px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fade-in">
          <Link
            href={`/${locale}`}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              isActive(`/${locale}`) && pathname === `/${locale}`
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>

          <Link
            href={`/${locale}/map`}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              isActive(`/${locale}/map`)
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Heat Map</span>
          </Link>

          <Link
            href={`/${locale}/reports`}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              isActive(`/${locale}/reports`) && !pathname.includes('/reports/new')
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>All Reports</span>
          </Link>

          <Link
            href={`/${locale}/nearby-issues`}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              isActive(`/${locale}/nearby-issues`)
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Find Nearby</span>
          </Link>

          {user && (
            <>
              <Link
                href={`/${locale}/my-reports`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(`/${locale}/my-reports`)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>My Reports</span>
              </Link>

              {user.role === 'supervisor' && (
                <Link
                  href={`/${locale}/dashboard/supervisor`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(`/${locale}/dashboard/supervisor`)
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ClipboardCheck className="w-4 h-4 text-amber-500" />
                    <span>My Work Orders</span>
                  </div>
                  {!user.isApproved && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                      Pending
                    </span>
                  )}
                </Link>
              )}

              {user.role === 'manager' && user.isApproved && (
                <Link
                  href={`/${locale}/dashboard/manager`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(`/${locale}/dashboard/manager`)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Manager Portal</span>
                </Link>
              )}

              {user.role === 'admin' && (
                <Link
                  href={`/${locale}/admin`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(`/${locale}/admin`)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
            </>
          )}

          <div className="pt-3 border-t border-border/80 flex flex-col gap-2">
            {!user ? (
              <>
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-foreground bg-secondary rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href={`/${locale}/signup`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg"
                >
                  Register
                </Link>
              </>
            ) : (
              <div 
                className={`flex items-center justify-between p-2 bg-secondary/60 rounded-lg ${
                  user.role === 'supervisor' ? 'cursor-pointer hover:bg-secondary/90 transition-all' : ''
                }`}
                onClick={user.role === 'supervisor' ? handleCopySupervisorId : undefined}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    user.role === 'supervisor' ? 'bg-amber-500 text-gray-950 shadow-xs' : 'bg-primary text-primary-foreground'
                  }`}>
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                    {user.role === 'supervisor' && user.supervisorCode && (
                      <p className="text-[9px] font-mono font-bold text-amber-500 flex items-center gap-1">
                        <span>ID: {user.supervisorCode}</span>
                        {copiedSupervisorId ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-amber-500/70" />
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}