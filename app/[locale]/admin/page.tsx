'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, UserCheck, UserX, Clock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';

interface Manager {
  _id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/en/login');
      } else if (user.role !== 'admin') {
        router.push('/en');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchManagers();
    }
  }, [user, filter]);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/managers?status=${filter}`);
      const data = await response.json();
      if (data.success) {
        setManagers(data.data);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (managerId: string) => {
    try {
      setActionLoading(managerId);
      const response = await fetch(`/api/admin/managers/${managerId}`, {
        method: 'PUT',
      });
      const data = await response.json();
      if (data.success) {
        fetchManagers();
      }
    } catch (error) {
      console.error('Error approving manager:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (managerId: string) => {
    if (!confirm('Are you sure you want to reject this manager? This will deactivate their account.')) {
      return;
    }

    try {
      setActionLoading(managerId);
      const response = await fetch(`/api/admin/managers/${managerId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchManagers();
      }
    } catch (error) {
      console.error('Error rejecting manager:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400">Manage city manager approvals</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Pending
          </Button>
          <Button
            onClick={() => setFilter('approved')}
            variant={filter === 'approved' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Approved
          </Button>
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <UserIcon className="w-4 h-4" />
            All
          </Button>
        </div>

        {/* Managers List */}
        {managers.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900 border-gray-800">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No managers found</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {managers.map((manager) => (
              <Card key={manager._id} className="p-6 bg-gray-900 border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{manager.name}</h3>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="w-4 h-4" />
                          <span>{manager.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={manager.isApproved ? 'success' : 'warning'}>
                        {manager.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                      <Badge variant={manager.isActive ? 'success' : 'destructive'}>
                        {manager.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Registered: {new Date(manager.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!manager.isApproved && manager.isActive && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(manager._id)}
                        disabled={actionLoading === manager._id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(manager._id)}
                        disabled={actionLoading === manager._id}
                        variant="destructive"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
