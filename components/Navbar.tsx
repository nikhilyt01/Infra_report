'use client';

import Link from "next/link";
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useState, useRef, useEffect } from 'react';
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
  Check,
  ChevronDown,
  ShieldCheck,
  Building2,
  Sparkles,
  ExternalLink,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function Navbar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [copiedSupervisorId, setCopiedSupervisorId] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on route navigation
  useEffect(() => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click-outside listener for user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Robust clipboard copy with fallback to execCommand
  const copyToClipboard = async (text: string) => {
    if (!text) {
      toast.error('No ID available to copy');
      return;
    }
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {
        console.error('Fallback copy failed', e);
      }
    }

    if (success) {
      setCopiedSupervisorId(true);
      setTimeout(() => setCopiedSupervisorId(false), 2000);
      toast.success(
        `Supervisor ID (${text}) copied! Share with your Municipal Admin for approval.`,
        'ID Copied'
      );
    } else {
      toast.error(`Could not auto-copy. Your ID is: ${text}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    router.push(`/${locale}`);
  };

  const isActive = (path: string) => {
    if (path === `/${locale}`) return pathname === `/${locale}`;
    return pathname.startsWith(path);
  };

  return (
    <nav className="w-full border-b border-border/80 bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-xs" role="navigation" aria-label="Main navigation">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo / Brand */}
          <Link 
            href={`/${locale}`} 
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="InfraReport Home"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-xs shrink-0">
              <Construction className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg text-foreground tracking-tight flex items-center gap-1.5 leading-tight whitespace-nowrap">
                InfraReport
              </span>
              <span className="hidden xl:block text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                Civic Infrastructure Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 shrink-0">
            <Link 
              href={`/${locale}`} 
              className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive(`/${locale}`) && pathname === `/${locale}`
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Home</span>
            </Link>

            <Link 
              href={`/${locale}/map`} 
              className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive(`/${locale}/map`)
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Map className="w-3.5 h-3.5 shrink-0" />
              <span>Heat Map</span>
            </Link>

            <Link 
              href={`/${locale}/reports`} 
              className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive(`/${locale}/reports`) && !pathname.includes('/reports/new')
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>All Reports</span>
            </Link>

            <Link 
              href={`/${locale}/nearby-issues`} 
              className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive(`/${locale}/nearby-issues`)
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Find Nearby</span>
            </Link>
            
            {user && (
              <>
                <Link 
                  href={`/${locale}/my-reports`} 
                  className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                    isActive(`/${locale}/my-reports`)
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>My Reports</span>
                </Link>

                {user.role === 'supervisor' && (
                  <Link 
                    href={`/${locale}/dashboard/supervisor`} 
                    className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                      isActive(`/${locale}/dashboard/supervisor`)
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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
                    className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      isActive(`/${locale}/dashboard/manager`)
                        ? 'bg-primary/10 text-primary font-bold border border-primary/30 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Manager Portal</span>
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link 
                    href={`/${locale}/admin`} 
                    className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                      isActive(`/${locale}/admin`)
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>Admin</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Action & Auth Area */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Primary Action Button */}
            <Link 
              href={user ? `/${locale}/reports/new` : `/${locale}/login?message=login_required&redirect=/${locale}/reports/new`} 
              className="shrink-0"
            >
              <Button size="sm" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shadow-xs whitespace-nowrap shrink-0">
                <Plus className="w-3.5 h-3.5" />
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
                <NotificationDropdown />
                <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-left ${
                    userDropdownOpen
                      ? 'bg-secondary border-primary/50 shadow-xs ring-2 ring-primary/20'
                      : 'bg-secondary/60 hover:bg-secondary border-border/60 hover:border-border'
                  }`}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  title="Open Account Menu"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-xs ${
                    user.role === 'supervisor'
                      ? 'bg-amber-500 text-gray-950 font-black'
                      : user.role === 'manager'
                      ? 'bg-blue-600 text-white'
                      : user.role === 'admin'
                      ? 'bg-purple-600 text-white'
                      : 'bg-primary text-primary-foreground'
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
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ml-0.5 ${
                    userDropdownOpen ? 'rotate-180 text-foreground' : ''
                  }`} />
                </button>

                {/* Account Dropdown Modal/Card */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-card border border-border/80 shadow-2xl z-50 p-3.5 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
                    {/* User Profile Card */}
                    <div className="flex items-start gap-3 pb-3 border-b border-border/60">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-inner shrink-0 ${
                        user.role === 'supervisor'
                          ? 'bg-amber-500 text-gray-950'
                          : user.role === 'manager'
                          ? 'bg-blue-600 text-white'
                          : user.role === 'admin'
                          ? 'bg-purple-600 text-white'
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                            user.isApproved 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            {user.isApproved ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1 pt-0.5">
                          <span className="font-semibold text-foreground">
                            {user.role === 'supervisor' ? 'Field Supervisor' : user.role === 'manager' ? 'Municipal Manager' : user.role === 'admin' ? 'System Administrator' : 'Citizen Reporter'}
                          </span>
                          {user.department && (
                            <span className="text-muted-foreground">· {user.department}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* SUPERVISOR UNIQUE ID CARD */}
                    {user.role === 'supervisor' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Unique Supervisor ID</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold font-mono">
                            OFFICIAL
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 bg-background p-2 rounded-lg border border-border/80 shadow-xs">
                          <span className="font-mono text-sm font-black tracking-wider text-amber-600 dark:text-amber-400 select-all">
                            {user.supervisorCode || 'SUP-PENDING'}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => copyToClipboard(user.supervisorCode || '')}
                            className="h-7 px-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-gray-950 flex items-center gap-1 shrink-0"
                          >
                            {copiedSupervisorId ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy ID</span>
                              </>
                            )}
                          </Button>
                        </div>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Share this unique ID with your Municipal Admin to authorize work orders and field assignment.
                        </p>
                      </div>
                    )}

                    {/* Quick Portal Navigation Links */}
                    <div className="space-y-1 pt-1">
                      {user.role === 'supervisor' && (
                        <Link
                          href={`/${locale}/dashboard/supervisor`}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors text-xs text-foreground group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <ClipboardCheck className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium group-hover:text-primary transition-colors">My Work Orders</span>
                          </div>
                          {!user.isApproved && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full font-bold">
                              Pending
                            </span>
                          )}
                        </Link>
                      )}

                      {user.role === 'manager' && (
                        <Link
                          href={`/${locale}/dashboard/manager`}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-xs text-foreground group"
                        >
                          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium group-hover:text-primary transition-colors">Manager Operations Portal</span>
                        </Link>
                      )}

                      {user.role === 'admin' && (
                        <Link
                          href={`/${locale}/admin`}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-xs text-foreground group"
                        >
                          <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium group-hover:text-primary transition-colors">Admin Governance Console</span>
                        </Link>
                      )}

                      <Link
                        href={`/${locale}/my-reports`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-xs text-foreground group"
                      >
                        <div className="w-6 h-6 rounded-md bg-secondary text-muted-foreground flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium group-hover:text-primary transition-colors">My Reports</span>
                      </Link>
                    </div>

                    {/* Divider & Sign Out */}
                    <div className="pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            {user && <NotificationDropdown />}
            <Link href={user ? `/${locale}/reports/new` : `/${locale}/login?message=login_required&redirect=/${locale}/reports/new`}>
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
                href={`/${locale}/notifications`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(`/${locale}/notifications`)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Bell className="w-4 h-4 text-primary" />
                <span>Notifications</span>
              </Link>

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
              <div className="space-y-3 p-3 bg-secondary/50 rounded-xl border border-border/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs ${
                      user.role === 'supervisor' ? 'bg-amber-500 text-gray-950 font-black' : 'bg-primary text-primary-foreground'
                    }`}>
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{user.name}</p>
                      <p className="text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    user.isApproved 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {user.isApproved ? 'Active' : 'Pending'}
                  </span>
                </div>

                {/* Supervisor Mobile Unique ID Card */}
                {user.role === 'supervisor' && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Your Unique Supervisor ID</span>
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-background p-2 rounded-md border border-border/80">
                      <span className="font-mono text-sm font-black tracking-wider text-amber-600 dark:text-amber-400 select-all">
                        {user.supervisorCode || 'SUP-PENDING'}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => copyToClipboard(user.supervisorCode || '')}
                        className="h-7 px-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-gray-950 flex items-center gap-1 shrink-0"
                      >
                        {copiedSupervisorId ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Share with your municipal manager for approval.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30 justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}