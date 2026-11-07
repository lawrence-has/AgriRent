import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { getEquipment, deleteEquipment } from '../../api/equipment';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';

const EquipmentManagement = () => {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-equipment'],
    queryFn: () => getEquipment({ limit: 50, status: undefined }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => { toast.success('Equipment deleted'); queryClient.invalidateQueries(['admin-equipment']); setDeleteId(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Category', 'Owner', 'Daily Rate', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.equipment?.map((eq) => (
              <tr key={eq.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{eq.name}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{eq.category}</td>
                <td className="px-4 py-3 text-gray-600">{eq.owner?.name}</td>
                <td className="px-4 py-3 text-primary-600 font-medium">₱{parseFloat(eq.dailyRate).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge label={eq.status} /></td>
                <td className="px-4 py-3">
                  <Button variant="danger" size="sm" onClick={() => setDeleteId(eq.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete Equipment"
        message="This will soft-delete the equipment."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default EquipmentManagement;
