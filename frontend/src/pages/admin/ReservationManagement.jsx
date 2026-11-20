import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReservations } from '../../api/reservations';
import { archiveReservation } from '../../api/archive';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';

const ReservationManagement = () => {
  const queryClient = useQueryClient();
  const [archiveId, setArchiveId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: () => getReservations({ limit: 50 }).then((r) => r.data),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveReservation,
    onSuccess: () => {
      toast.success('Reservation archived');
      queryClient.invalidateQueries(['admin-reservations']);
      queryClient.invalidateQueries(['archive-summary']);
      setArchiveId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to archive reservation'),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">All Reservations</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Equipment', 'Farmer', 'Dates', 'Cost', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.reservations?.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.equipment?.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.farmer?.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 text-primary-600 font-medium">₱{parseFloat(r.totalCost).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge label={r.status} /></td>
                <td className="px-4 py-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setArchiveId(r.id)}
                    disabled={!['cancelled', 'completed'].includes(r.status)}
                    title={['cancelled', 'completed'].includes(r.status)
                      ? 'Archive reservation'
                      : 'Only cancelled or completed reservations can be archived'}
                  >
                    <Archive size={13} /> Archive
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        isOpen={!!archiveId}
        onClose={() => setArchiveId(null)}
        onConfirm={() => archiveMutation.mutate(archiveId)}
        title="Archive Reservation"
        message="This will move the reservation to Archive Management. It can be restored later."
        confirmLabel="Archive"
        danger
        loading={archiveMutation.isPending}
      />
    </div>
  );
};

export default ReservationManagement;
