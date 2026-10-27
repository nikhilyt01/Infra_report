'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'manager' | 'supervisor',
    department: 'Roads & Pavements',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdSupervisorCode, setCreatedSupervisorCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(false);

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
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => router.push('/en'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-12">
      <Card className="w-full max-w-md p-8 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-center mb-8">
          <UserPlus className="w-12 h-12 text-blue-500" />
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-gray-400 text-center mb-8">Join our infrastructure reporting platform</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {createdSupervisorCode ? (
          <div className="mb-6 p-6 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Supervisor Registration Successful!</h3>
              <p className="text-xs text-amber-200/80 mt-1">
                Your account is pending municipal approval. Share this unique Supervisor ID with your municipal manager:
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 p-3 bg-gray-950 rounded-xl border border-amber-500/30">
              <span className="text-xl font-mono font-black tracking-wider text-amber-400">
                {createdSupervisorCode}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(createdSupervisorCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="text-xs border-amber-500/40  hover:text-amber-300"
              >
                {copiedCode ? 'Copied!' : 'Copy ID'}
              </Button>
            </div>

            <p className="text-[11px] text-gray-400">
              Your municipal manager can search this code in their Manager Portal to approve your access.
            </p>

            <Button
              type="button"
              onClick={() => router.push('/en/login')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold"
            >
              Go to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-2"
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-2"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <Label htmlFor="role">Account Type</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="mt-2 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">Citizen - Report and track community issues</option>
                <option value="supervisor">Field Supervisor - On-site repair and verification</option>
                <option value="manager">City Manager - Municipal triage (requires admin approval)</option>
              </select>
              {formData.role === 'supervisor' && (
                <p className="text-xs text-amber-400 mt-2">
                  Field supervisors receive a unique Supervisor ID upon signup to share with their municipal manager for activation.
                </p>
              )}
              {formData.role === 'manager' && (
                <p className="text-xs text-yellow-500 mt-2">
                  Manager accounts require admin approval before access is granted.
                </p>
              )}
            </div>

            {formData.role === 'supervisor' && (
              <div>
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="mt-2 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Roads & Pavements">Roads & Pavements</option>
                  <option value="Water Supply & Drainage">Water Supply & Drainage</option>
                  <option value="Streetlights & Electrical">Streetlights & Electrical</option>
                  <option value="Waste & Sanitation">Waste & Sanitation</option>
                  <option value="Parks & Grounds">Parks & Grounds</option>
                  <option value="General Maintenance">General Maintenance</option>
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="mt-2"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="mt-2"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link href="/en/login" className="text-blue-500 hover:text-blue-400">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
