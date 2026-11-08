import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';
import { getTransactions, releaseEquipment, returnEquipment } from '../../api/transactions';
import { getReservations } from '../../api/reservations';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const ManageTransactions = () => {
  const queryClient = useQueryClient();
  const [releaseModal, setReleaseModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const { register: regRelease, handleSubmit: handleRelease, reset: resetRelease } = useForm();
  const { register: regReturn, handleSubmit: handleReturn, reset: resetReturn } = useForm();

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions().then((r) => r.data),
  });

  const { data: resData } = useQuery({
    queryKey: ['confirmed-reservations'],
    queryFn: () => getReservations({ status: 'confirmed' }).then((r) => r.data),
  });

  const releaseMutation = useMutation({
    mutationFn: (fd) => releaseEquipment(fd),
    onSuccess: () => { toast.success('Equipment released'); queryClient.invalidateQueries(['transactions', 'confirmed-reservations']); setReleaseModal(null); resetRelease(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, fd }) => returnEquipment(id, fd),
    onSuccess: () => { toast.success('Return recorded'); queryClient.invalidateQueries(['transactions']); setReturnModal(null); resetReturn(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const buildFD = (values, reservationId) => {
    const fd = new FormData();
    if (reservationId) fd.append('reservationId', reservationId);
    if (values.notes) fd.append(reservationId ? 'releaseNotes' : 'returnNotes', values.notes);
    if (values.images instanceof FileList) {
      Array.from(values.images).forEach((f) => fd.append('images', f));
    }
    return fd;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        {resData?.reservations?.length > 0 && (
          <Button onClick={() => setReleaseModal(true)}>Release Equipment</Button>
        )}
      </div>

      {txLoading ? <div className="py-20"><Spinner size="lg" /></div> :
        !txData?.transactions?.length ? (
          <EmptyState icon={Package} title="No transactions yet" description="Confirm reservations and release equipment to start tracking" />
        ) : (
          <div className="space-y-3">
            {txData.transactions.map((t) => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{t.reservation?.equipment?.name}</h3>
                      <Badge label={t.status} />
                    </div>
                    <p className="text-sm text-gray-500">Farmer: {t.reservation?.farmer?.name}</p>
                    <p className="text-sm text-gray-500">Released: {format(new Date(t.releaseDate), 'MMM d, yyyy')}</p>
                    {t.returnDate && <p className="text-sm text-gray-500">Returned: {format(new Date(t.returnDate), 'MMM d, yyyy')}</p>}
                  </div>
                  {t.status === 'released' && (
                    <Button size="sm" variant="outline" onClick={() => setReturnModal(t.id)}>Record Return</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Release Modal */}
      <Modal isOpen={!!releaseModal} onClose={() => setReleaseModal(null)} title="Release Equipment">
        <form onSubmit={handleRelease((v) => {
          if (!v.reservationId) return toast.error('Select a reservation');
          releaseMutation.mutate(buildFD(v, v.reservationId));
        })} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Select Confirmed Reservation</label>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" {...regRelease('reservationId', { required: true })}>
              <option value="">Choose reservation...</option>
              {resData?.reservations?.map((r) => (
                <option key={r.id} value={r.id}>{r.equipment?.name} — {r.farmer?.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Release Notes</label>
            <textarea className="border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} {...regRelease('notes')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Photos (before release)</label>
            <input type="file" accept="image/*" multiple {...regRelease('images')} />
          </div>
          <Button type="submit" loading={releaseMutation.isPending} className="w-full">Confirm Release</Button>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal isOpen={!!returnModal} onClose={() => setReturnModal(null)} title="Record Return">
        <form onSubmit={handleReturn((v) => returnMutation.mutate({ id: returnModal, fd: buildFD(v) }))} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Return Notes</label>
            <textarea className="border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} {...regReturn('notes')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Photos (after return)</label>
            <input type="file" accept="image/*" multiple {...regReturn('images')} />
          </div>
          <Button type="submit" loading={returnMutation.isPending} className="w-full">Confirm Return</Button>
        </form>
      </Modal>
    </div>
  );
};

export default ManageTransactions;
