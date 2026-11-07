import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getReservations, updateReservation } from '../../api/reservations';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const ManageReservations = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owner-reservations'],
    queryFn: () => getReservations().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => updateReservation(id, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Reservation ${vars.status}`);
      queryClient.invalidateQueries(['owner-reservations']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Manage Reservations</h1>

      {!data?.reservations?.length ? (
        <EmptyState icon="📋" title="No reservations" description="Incoming reservation requests will appear here" />
      ) : (
        <div className="space-y-3">
          {data.reservations.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{r.equipment?.name}</h3>
                    <Badge label={r.status} />
                  </div>
                  <p className="text-sm text-gray-600">Farmer: <span className="font-medium">{r.farmer?.name}</span> ({r.farmer?.phone})</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm font-bold text-primary-600 mt-1">₱{parseFloat(r.totalCost).toLocaleString()}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: r.id, status: 'confirmed' })}
                      loading={updateMutation.isPending}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: r.id, status: 'cancelled' })}
                      loading={updateMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageReservations;
