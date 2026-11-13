import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UserPlus, Search, RotateCcw, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';

const ROLES = ['farmer', 'owner', 'admin'];

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [restoreId, setRestoreId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, search, showDeleted],
    queryFn: () => {
      if (showDeleted) return api.get('/users/deleted').then((r) => r.data);
      return api.get('/users', { params: { role: roleFilter || undefined, search: search || undefined } }).then((r) => r.data);
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get('/users/stats').then((r) => r.data.stats),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-stats']);
      setShowCreate(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deactivated');
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-stats']);
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/restore`),
    onSuccess: () => {
      toast.success('User restored');
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['user-stats']);
      setRestoreId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to restore'),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          {statsData && (
            <p className="text-sm text-gray-500 mt-0.5">
              {statsData.total} total · {statsData.totalFarmers} farmers · {statsData.totalOwners} owners · {statsData.deletedCount} deactivated
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus size={15} /> Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <button
          onClick={() => setShowDeleted(!showDeleted)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
            ${showDeleted ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
        >
          {showDeleted ? 'Showing Deactivated' : 'Show Deactivated'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Email', 'Role', 'Phone', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!data?.users?.length ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No users found</td>
              </tr>
            ) : (
              data.users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${u.deletedAt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><Badge label={u.role} /></td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {u.deletedAt ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreId(u.id)}
                        >
                          <RotateCcw size={13} /> Restore
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 size={13} /> Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Create New User" size="md">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Juan dela Cruz"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
          />
          <Input label="Phone" type="tel" placeholder="+63 9XX XXX XXXX" {...register('phone')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('role', { required: 'Role is required' })}
            >
              <option value="">Select role</option>
              {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
            {errors.role && <span className="text-xs text-red-600">{errors.role.message}</span>}
          </div>
          <Button type="submit" loading={createMutation.isPending} className="w-full">
            Create User
          </Button>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Deactivate User"
        message="The user will be soft-deleted and can no longer log in. This can be reversed."
        confirmLabel="Deactivate"
        danger
        loading={deleteMutation.isPending}
      />

      {/* Restore Confirm */}
      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreMutation.mutate(restoreId)}
        title="Restore User"
        message="The user will be reactivated and can log in again."
        confirmLabel="Restore"
        loading={restoreMutation.isPending}
      />
    </div>
  );
};

export default UserManagement;
