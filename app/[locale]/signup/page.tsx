'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserPlus, AlertCircle, CheckCircle, Eye, EyeOff,
  Shield, Copy, Check, ArrowRight, Building2, HardHat, User
} from 'lucide-react';
import Link from 'next/link';

type Role = 'user' | 'manager' | 'supervisor';

const DEPARTMENTS = [
  'Roads & Pavements',
  'Water Supply & Drainage',
  'Streetlights & Electrical',
  'Waste & Sanitation',
  'Parks & Grounds',
  'General Maintenance',
];

const ROLE_OPTIONS: { value: Role; icon: React.ElementType; label: string; desc: string; badge?: string; color: string }[] = [
  {
    value: 'user',
    icon: User,
    label: 'Citizen',
    desc: 'Report and track community issues',
    color: 'blue',
  },
  {
    value: 'supervisor',
    icon: HardHat,
    label: 'Field Supervisor',
    desc: 'On-site repair & verification',
    badge: 'ID Generated',
    color: 'amber',
  },
  {
    value: 'manager',
    icon: Building2,
    label: 'City Manager',
    desc: 'Municipal triage & oversight',
    badge: 'Needs Approval',
    color: 'purple',
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as Role,
    department: 'Roads & Pavements',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdSupervisorCode, setCreatedSupervisorCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][passwordStrength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await signup(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        { department: formData.department }
      );

      if (formData.role === 'supervisor') {
        const code = res?.data?.user?.supervisorCode;
        setCreatedSupervisorCode(code || 'Pending');
        setSuccess('Supervisor account created! Share your Supervisor ID with your Municipal Manager for approval.');
      } else if (formData.role === 'manager') {
        setSuccess('Account created! Please wait for admin approval before logging in.');
        setTimeout(() => router.push('/en/login'), 3500);
      } else {
        setSuccess('Account created successfully! Redirecting…');
        setTimeout(() => router.push('/en'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success / Supervisor ID screen ──────────────────────────────
  if (createdSupervisorCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-card shadow-2xl overflow-hidden">
            {/* Amber top bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />

            <div className="p-8 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto">
                <HardHat className="w-8 h-8 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-foreground">Registration Successful!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your Supervisor account is <strong className="text-amber-500">pending approval</strong>.
                  Share your unique Supervisor ID with your municipal manager to activate access.
                </p>
              </div>

              {/* ID Block */}
              <div className="p-4 rounded-xl bg-secondary/60 border border-amber-500/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Supervisor ID</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-mono font-black tracking-widest text-amber-500">
                    {createdSupervisorCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdSupervisorCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      copiedCode
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20'
                    }`}
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The manager can enter this code in their portal to approve your field supervisor access.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/en/login')}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm
                  transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
              >
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex lg:w-[46%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #172554 70%, #0c1445 100%)' }}
      >
        {/* Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)', animation: 'pulse 7s ease-in-out infinite' }} />
          <div className="absolute bottom-1/3 -left-16 w-72 h-72 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', animation: 'pulse 9s ease-in-out infinite 1.5s' }} />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-black tracking-tight">InfraReport</span>
        </div>

        {/* Copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-semibold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Join the Civic Movement
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
              Be the change<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                your city needs.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Create your account and join thousands of citizens, supervisors, and managers working together to build better infrastructure.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '12K+', label: 'Issues Reported' },
              { value: '89%', label: 'Resolution Rate' },
              { value: '340+', label: 'Cities Active' },
            ].map(({ value, label }) => (
              <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-slate-600 text-xs">
          © 2025 InfraReport · Empowering civic participation
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-[420px] space-y-7">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden pt-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground font-black text-lg tracking-tight">InfraReport</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Create account</h2>
            <p className="text-sm text-muted-foreground">Get started — it's completely free.</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-semibold text-foreground">Full Name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Smith"
                className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Account Type</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(({ value, icon: Icon, label, desc, badge, color }) => {
                  const isActive = formData.role === value;
                  const colorMap: Record<string, string> = {
                    blue: isActive ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' : 'border-border hover:border-blue-400/50',
                    amber: isActive ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20' : 'border-border hover:border-amber-400/50',
                    purple: isActive ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20' : 'border-border hover:border-purple-400/50',
                  };
                  const iconColor: Record<string, string> = {
                    blue: isActive ? 'text-blue-500' : 'text-muted-foreground',
                    amber: isActive ? 'text-amber-500' : 'text-muted-foreground',
                    purple: isActive ? 'text-purple-500' : 'text-muted-foreground',
                  };
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: value })}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-center cursor-pointer transition-all ${colorMap[color]}`}
                    >
                      {badge && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                          bg-card border border-border text-muted-foreground whitespace-nowrap">
                          {badge}
                        </span>
                      )}
                      <Icon className={`w-5 h-5 transition-colors ${iconColor[color]}`} />
                      <div>
                        <p className={`text-xs font-bold transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Role hints */}
              {formData.role === 'supervisor' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5 pt-1">
                  <span>⚠</span>
                  You'll receive a unique Supervisor ID to share with your municipal manager for activation.
                </p>
              )}
              {formData.role === 'manager' && (
                <p className="text-[11px] text-purple-600 dark:text-purple-400 flex items-start gap-1.5 pt-1">
                  <span>ℹ</span>
                  Manager accounts require admin approval. You'll be notified when your access is granted.
                </p>
              )}
            </div>

            {/* Department (supervisor only) */}
            {formData.role === 'supervisor' && (
              <div className="space-y-1.5">
                <label htmlFor="department" className="text-sm font-semibold text-foreground">Department</label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full h-11 px-4 pr-11 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {formData.password && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength ? strengthColor : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] font-semibold ${
                    passwordStrength <= 1 ? 'text-red-500' :
                    passwordStrength <= 2 ? 'text-orange-500' :
                    passwordStrength <= 3 ? 'text-yellow-600' : 'text-emerald-600'
                  }`}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className={`w-full h-11 px-4 pr-11 rounded-xl border bg-card text-foreground text-sm placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:border-primary transition-all ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-destructive focus:ring-destructive/30'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-emerald-500 focus:ring-emerald-500/30'
                      : 'border-border focus:ring-primary/40'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[11px] text-destructive font-medium">Passwords don't match</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Sign in link */}
          <p className="text-sm text-center text-muted-foreground pb-4">
            Already have an account?{' '}
            <Link href="/en/login" className="text-primary font-semibold hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
