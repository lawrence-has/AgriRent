import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from '../../api/equipment';
import useAuthStore from '../../store/authStore';
import EquipmentForm from '../../components/equipment/EquipmentForm';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const MyEquipment = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-equipment'],
    queryFn: () => getEquipment({ status: undefined, limit: 50 }).then((r) =>
      r.data.equipment.filter((e) => e.ownerId === user?.id)
    ),
  });

  const createMutation = useMutation({
    mutationFn: (formData) => createEquipment(formData),
    onSuccess: () => { toast.success('Equipment added!'); queryClient.invalidateQueries(['my-equipment']); setShowForm(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateEquipment(id, data),
    onSuccess: () => { toast.success('Equipment updated!'); queryClient.invalidateQueries(['my-equipment']); setEditItem(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => { toast.success('Equipment deleted'); queryClient.invalidateQueries(['my-equipment']); setDeleteId(null); },
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Equipment</h1>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Equipment</Button>
      </div>

      {!data?.length ? (
        <EmptyState icon="🚜" title="No equipment yet" description="Add your first piece of equipment to start renting" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((eq) => (
            <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-40 bg-gray-100">
                {eq.images?.[0] ? (
                  <img src={eq.images[0]} alt={eq.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🚜</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 flex-1 truncate">{eq.name}</h3>
                  <Badge label={eq.status} />
                </div>
                <p className="text-sm text-gray-500 mb-3 capitalize">{eq.category}</p>
                <p className="text-lg font-bold text-primary-600">₱{parseFloat(eq.dailyRate).toLocaleString()}/day</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" size="sm" onClick={() => setEditItem(eq)} className="flex-1">
                    <Edit size={14} /> Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteId(eq.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Equipment" size="lg">
        <EquipmentForm onSubmit={(v) => createMutation.mutate(buildFormData(v))} isLoading={createMutation.isPending} />
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Equipment" size="lg">
        <EquipmentForm
          defaultValues={editItem}
          onSubmit={(v) => updateMutation.mutate({ id: editItem.id, data: buildFormData(v) })}
          isLoading={updateMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete Equipment"
        message="Are you sure? This will soft-delete the equipment."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default MyEquipment;
