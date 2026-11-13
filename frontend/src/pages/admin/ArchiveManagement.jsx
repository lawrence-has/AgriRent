import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { Archive, RotateCcw, Trash2, Users, Tractor, CalendarDays, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getArchiveSummary,
  getArchivedReservations, restoreReservation, permanentDeleteReservation,
  getArchivedTransactions, restoreTransaction,
  getArchivedEquipment,
  getArchivedUsers,
} from '../../api/archive';
import { restoreEquipment } from '../../api/equipment';
import api from '../../api/axios';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const TABS = [
  { key: 'reservations', label: 'Reservations', icon: CalendarDays },
  { key: 'transactions', label: 'Transactions', icon: Package },
  { key: 'equipment', label: 'Equipment', icon: Tractor },
  { key: 'users', label: 'Users', icon: Users },
];

const ArchiveManagement = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('reservations');
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: summary } = useQuery({
    queryKey: ['archive-summary'],
    queryFn: () => getArchiveSummary().then((r) => r.data.summary),
  });

  const { data: reservations, isLoading: loadingRes } = useQuery({
    queryKey: ['archived-reservations'],
    queryFn: () => getArchivedReservations({ limit: 50 }).then((r) => r.data),
    enabled: tab === 'reservations',
  });

  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['archived-transactions'],
    queryFn: () => getArchivedTransactions({ limit: 50 }).then((r) => r.data),
    enabled: tab === 'transactions',
  });

  const { data: equipment, isLoading: loadingEq } = useQuery({
    queryKey: ['archived-equipment'],
    queryFn: () => getArchivedEquipment({ limit: 50 }).then((r) => r.data),
    enabled: tab === 'equipment',
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['archived-users'],
    queryFn: () => getArchivedUsers({ limit: 50 }).then((r) => r.data),
    enabled: tab === 'users',
  });

  const invalidate = () => {
    queryClient.invalidateQueries(['archive-summary']);
    queryClient.invalidateQueries(['archived-reservations']);
    queryClient.invalidateQueries(['archived-transactions']);
    queryClient.invalidateQueries(['archived-equipment']);
    queryClient.invalidateQueries(['archived-users']);
  };

  const restoreResMutation = useMutation({
    mutationFn: (id) => restoreReservation(id),
    onSuccess: () => { toast.success('Reservation restored'); invalidate(); setConfirmRestore(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to restore'),
  });

  const deleteResMutation = useMutation({
    mutationFn: (id) => permanentDeleteReservation(id),
    onSuccess: () => { toast.success('Permanently deleted'); invalidate(); setConfirmDelete(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const restoreTxMutation = useMutation({
    mutationFn: (id) => restoreTransaction(id),
    onSuccess: () => { toast.success('Transaction restored'); invalidate(); setConfirmRestore(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to restore'),
  });

  const restoreEqMutation = useMutation({
    mutationFn: (id) => restoreEquipment(id),
    onSuccess: () => { toast.success('Equipment restored'); invalidate(); setConfirmRestore(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to restore'),
  });

  const restoreUserMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/restore`),
    onSuccess: () => { toast.success('User restored'); invalidate(); setConfirmRestore(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to restore'),
  });

  const handleRestore = () => {
    if (!confirmRestore) return;
    const { type, id } = confirmRestore;
    if (type === 'reservation') restoreResMutation.mutate(id);
    else if (type === 'transaction') restoreTxMutation.mutate(id);
    else if (type === 'equipment') restoreEqMutation.mutate(id);
    else if (type === 'user') restoreUserMutation.mutate(id);
  };

  const isRestoring = restoreResMutation.isPending || restoreTxMutation.isPending ||
    restoreEqMutation.isPending || restoreUserMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Archive size={22} /> Archive Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">View and restore soft-deleted records</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Archived Users', value: summary.users, icon: Users, color: 'bg-blue-50 text-blue-700' },
            { label: 'Archived Equipment', value: summary.equipment, icon: Tractor, color: 'bg-orange-50 text-orange-700' },
            { label: 'Archived Reservations', value: summary.reservations, icon: CalendarDays, color: 'bg-purple-50 text-purple-700' },
            { label: 'Archived Transactions', value: summary.transactions, icon: Package, color: 'bg-green-50 text-green-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${color}`}><Icon size={18} /></div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">

        {/* Reservations */}
        {tab === 'reservations' && (
          loadingRes ? <div className="py-20"><Spinner size="lg" /></div> : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Equipment', 'Farmer', 'Dates', 'Cost', 'Status', 'Archived', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!reservations?.reservations?.length ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No archived reservations</td></tr>
                ) : reservations.reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.equipment?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.farmer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-primary-600 font-medium">₱{parseFloat(r.totalCost).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge label={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(r.deletedAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setConfirmRestore({ type: 'reservation', id: r.id })}>
                          <RotateCcw size={12} /> Restore
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmDelete({ type: 'reservation', id: r.id })}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Transactions */}
        {tab === 'transactions' && (
          loadingTx ? <div className="py-20"><Spinner size="lg" /></div> : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Equipment', 'Farmer', 'Released', 'Returned', 'Status', 'Archived', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!transactions?.transactions?.length ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No archived transactions</td></tr>
                ) : transactions.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.reservation?.equipment?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.reservation?.farmer?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.releaseDate ? format(new Date(t.releaseDate), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.returnDate ? format(new Date(t.returnDate), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3"><Badge label={t.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(t.deletedAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setConfirmRestore({ type: 'transaction', id: t.id })}>
                        <RotateCcw size={12} /> Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Equipment */}
        {tab === 'equipment' && (
          loadingEq ? <div className="py-20"><Spinner size="lg" /></div> : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name', 'Category', 'Owner', 'Daily Rate', 'Archived', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!equipment?.equipment?.length ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No archived equipment</td></tr>
                ) : equipment.equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{eq.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{eq.category}</td>
                    <td className="px-4 py-3 text-gray-600">{eq.owner?.name || '—'}</td>
                    <td className="px-4 py-3 text-primary-600 font-medium">₱{parseFloat(eq.dailyRate).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(eq.deletedAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setConfirmRestore({ type: 'equipment', id: eq.id })}>
                        <RotateCcw size={12} /> Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Users */}
        {tab === 'users' && (
          loadingUsers ? <div className="py-20"><Spinner size="lg" /></div> : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name', 'Email', 'Role', 'Deactivated', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!users?.users?.length ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No deactivated users</td></tr>
                ) : users.users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={u.role} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(u.deletedAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setConfirmRestore({ type: 'user', id: u.id })}>
                        <RotateCcw size={12} /> Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Restore Confirm */}
      <ConfirmDialog
        isOpen={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={handleRestore}
        title={`Restore ${confirmRestore?.type || ''}`}
        message="This record will be restored and become active again."
        confirmLabel="Restore"
        loading={isRestoring}
      />

      {/* Permanent Delete Confirm */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteResMutation.mutate(confirmDelete?.id)}
        title="Permanently Delete"
        message="This action is irreversible. The record will be permanently removed from the database."
        confirmLabel="Delete Permanently"
        danger
        loading={deleteResMutation.isPending}
      />
    </div>
  );
};

export default ArchiveManagement;
