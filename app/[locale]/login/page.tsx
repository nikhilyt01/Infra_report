'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, AlertCircle, Eye, EyeOff, Shield, MapPin, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(formData.email, formData.password);
      if (loggedInUser.role === 'supervisor' && loggedInUser.isApproved) {
        router.push('/en/dashboard/supervisor');
      } else if (loggedInUser.role === 'manager' && loggedInUser.isApproved) {
        router.push('/en/dashboard/manager');
      } else if (loggedInUser.role === 'admin') {
        router.push('/en/admin');
      } else {
        router.push('/en');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MapPin, label: 'Live Issue Tracking', desc: 'Real-time map of city infrastructure reports' },
    { icon: BarChart3, label: 'Analytics Dashboard', desc: 'Resolution rates, trends & performance metrics' },
    { icon: Users, label: 'Community Driven', desc: 'Upvote and escalate issues that matter most' },
    { icon: Shield, label: 'Role-Based Access', desc: 'Citizen, Supervisor, and Manager workflows' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel – branding ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #172554 65%, #0c1445 100%)',
        }}
      >
        {/* Animated mesh blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', animation: 'pulse 6s ease-in-out infinite' }} />
          <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)', animation: 'pulse 8s ease-in-out infinite 2s' }} />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', animation: 'pulse 7s ease-in-out infinite 1s' }} />
          {/* Grid overlay */}
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

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-semibold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Municipal Infrastructure Platform
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
              Fix Your City,<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Together.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Report potholes, broken streetlights, and water leaks. Track resolution in real time. Hold authorities accountable.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-1 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-slate-500 text-[11px]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-slate-600 text-xs">
          © 2025 InfraReport · Empowering civic participation
        </div>
      </div>

      {/* ── Right panel – form ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-background">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground font-black text-lg tracking-tight">InfraReport</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

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

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
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
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
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

          {/* Sign up link */}
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/en/signup" className="text-primary font-semibold hover:underline underline-offset-4">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
