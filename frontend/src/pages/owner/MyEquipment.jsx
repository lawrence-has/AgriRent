import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Tractor, Eye, Archive, Wrench, CheckCircle } from 'lucide-react';
import {
  getMyEquipment, createEquipment, updateEquipment,
  deleteEquipment, updateEquipmentStatus,
} from '../../api/equipment';
import EquipmentForm from '../../components/equipment/EquipmentForm';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const STATUS_ACTIONS = {
  available:   { label: 'Set Maintenance', icon: Wrench,       next: 'maintenance', variant: 'secondary' },
  maintenance: { label: 'Set Available',   icon: CheckCircle,  next: 'available',   variant: 'outline' },
  rented:      null, // cannot change — controlled by transactions
  archived:    { label: 'Unarchive',       icon: CheckCircle,  next: 'available',   variant: 'outline' },
};

const MyEquipment = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [archiveId, setArchiveId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-equipment', statusFilter],
    queryFn: () => getMyEquipment({ status: statusFilter || undefined, limit: 50 }).then((r) => r.data.equipment),
  });

  const createMutation = useMutation({
    mutationFn: (formData) => createEquipment(formData),
    onSuccess: () => {
      toast.success('Equipment added!');
      queryClient.invalidateQueries(['my-equipment']);
      setShowForm(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateEquipment(id, data),
    onSuccess: () => {
      toast.success('Equipment updated!');
      queryClient.invalidateQueries(['my-equipment']);
      setEditItem(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateEquipmentStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Equipment status set to ${status}`);
      queryClient.invalidateQueries(['my-equipment']);
      setArchiveId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      toast.success('Equipment deleted');
      queryClient.invalidateQueries(['my-equipment']);
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const buildFormData = (values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (k === 'images' && v instanceof FileList) {
        Array.from(v).forEach((f) => fd.append('images', f));
      } else if (v !== undefined && v !== null) {
        fd.append(k, v);
      }
    });
    return fd;
  };

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Equipment</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Equipment
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'available', 'rented', 'maintenance', 'archived'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Equipment grid */}
      {!data?.length ? (
        <EmptyState
          icon={Tractor}
          title="No equipment yet"
          description={statusFilter ? `No ${statusFilter} equipment found` : 'Add your first piece of equipment to start renting'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((eq) => {
            const statusAction = STATUS_ACTIONS[eq.status];
            return (
              <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Image */}
                <div className="h-40 bg-gray-100 relative">
                  {eq.images?.[0] ? (
                    <img src={eq.images[0]} alt={eq.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Tractor size={48} strokeWidth={1.2} />
                    </div>
                  )}
                  {eq.status === 'archived' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold flex items-center gap-1">
                        <Archive size={14} /> Archived
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 flex-1 truncate">{eq.name}</h3>
                    <Badge label={eq.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-1 capitalize">{eq.category}</p>
                  <p className="text-lg font-bold text-primary-600 mb-3">
                    ₱{parseFloat(eq.dailyRate).toLocaleString()}/day
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      as={Link}
                      to={`/owner/equipment/${eq.id}`}
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye size={13} /> View
                    </Button>
                    {eq.status !== 'rented' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditItem(eq)}
                        className="flex-1"
                      >
                        <Edit size={13} /> Edit
                      </Button>
                    )}
                    {statusAction && (
                      <Button
                        variant={statusAction.variant}
                        size="sm"
                        onClick={() => {
                          if (statusAction.next === 'archived') {
                            setArchiveId({ id: eq.id, status: 'archived' });
                          } else {
                            statusMutation.mutate({ id: eq.id, status: statusAction.next });
                          }
                        }}
                        loading={statusMutation.isPending}
                      >
                        <statusAction.icon size={13} /> {statusAction.label}
                      </Button>
                    )}
                    {eq.status !== 'rented' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteId(eq.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Equipment Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Equipment" size="lg">
        <EquipmentForm
          onSubmit={(v) => createMutation.mutate(buildFormData(v))}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Equipment Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Equipment" size="lg">
        <EquipmentForm
          defaultValues={editItem}
          onSubmit={(v) => updateMutation.mutate({ id: editItem.id, data: buildFormData(v) })}
          isLoading={updateMutation.isPending}
        />
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={!!archiveId}
        onClose={() => setArchiveId(null)}
        onConfirm={() => statusMutation.mutate(archiveId)}
        title="Archive Equipment"
        message="Archived equipment will not appear in public listings. You can unarchive it later."
        confirmLabel="Archive"
        danger
        loading={statusMutation.isPending}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete Equipment"
        message="This will permanently remove the equipment from listings. This action uses soft delete and can be recovered by an admin."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default MyEquipment;
