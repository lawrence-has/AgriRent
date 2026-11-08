import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyReservations, updateReservation } from '../../api/reservations';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const MyReservations = () => {
  const [cancelId, setCancelId] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => getMyReservations().then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => updateReservation(id, { status: 'cancelled' }),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      queryClient.invalidateQueries(['my-reservations']);
      setCancelId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>

      {!data?.reservations?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No reservations yet"
          description="Browse available equipment to make your first reservation"
          action={<Button as={Link} to="/farmer/browse">Browse Equipment</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.reservations.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{r.equipment?.name}</h3>
                    <Badge label={r.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm font-medium text-primary-600 mt-1">₱{parseFloat(r.totalCost).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" as={Link} to={`/farmer/reservations/${r.id}`}>View</Button>
                  {['pending', 'confirmed'].includes(r.status) && (
                    <Button variant="danger" size="sm" onClick={() => setCancelId(r.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelMutation.mutate(cancelId)}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this reservation?"
        confirmLabel="Yes, Cancel"
        danger
        loading={cancelMutation.isPending}
      />
    </div>
  );
};

export default MyReservations;
