import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, parseISO, isAfter, startOfDay } from 'date-fns';
import { MapPin, Phone, Tractor, WifiOff, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEquipmentById } from '../../api/equipment';
import { createReservation } from '../../api/reservations';
import useAuthStore from '../../store/authStore';
import useOfflineQueueStore from '../../store/offlineQueueStore';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import DateRangePicker from '../../components/common/DateRangePicker';
import AvailabilityCalendar from '../../components/equipment/AvailabilityCalendar';
import Spinner from '../../components/common/Spinner';

const MAX_RENTAL_DAYS = 365;

const EquipmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { enqueue, queue } = useOfflineQueueStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dateError, setDateError] = useState('');

  // Track online/offline state
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { data: equipment, isLoading, isError, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id).then((r) => r.data.equipment),
    retry: 1,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours — matches cache TTL
  });

  // Check if this equipment already has a pending queued reservation
  const hasPendingQueuedReservation = queue.some(
    (item) =>
      item.data.equipmentId === parseInt(id) &&
      ['queued', 'syncing'].includes(item.status)
  );

  // Online reservation mutation
  const reserveMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      toast.success('Reservation submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availability', id] });
      navigate('/farmer/reservations');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to submit reservation';
      toast.error(msg);
    },
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (isError || !equipment) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        {!isOnline ? (
          <>
            <WifiOff size={40} className="text-gray-300 mx-auto" aria-hidden="true" />
            <p className="text-gray-500">You're offline and this equipment hasn't been cached yet.</p>
          </>
        ) : (
          <p className="text-gray-500 text-lg">Equipment not found or is unavailable.</p>
        )}
        <Button variant="outline" as={Link} to="/farmer/browse">← Back to Browse</Button>
      </div>
    );
  }

  // ── Date validation ────────────────────────────────────────────
  const validateDates = () => {
    if (!startDate || !endDate) {
      setDateError('Please select both start and end dates');
      return false;
    }
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const today = startOfDay(new Date());

    if (!isAfter(start, new Date(today.getTime() - 1))) {
      setDateError('Start date cannot be in the past');
      return false;
    }
    const days = differenceInDays(end, start) + 1;
    if (days < 1) {
      setDateError('End date must be on or after start date');
      return false;
    }
    if (days > MAX_RENTAL_DAYS) {
      setDateError(`Rental cannot exceed ${MAX_RENTAL_DAYS} days`);
      return false;
    }
    setDateError('');
    return true;
  };

  const days = startDate && endDate
    ? Math.max(0, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1)
    : 0;
  const totalCost = days > 0 ? days * parseFloat(equipment.dailyRate) : 0;

  const handleReserve = () => {
    if (!validateDates()) return;

    if (reserveMutation.isPending) return; // prevent double submit

    const reservationData = {
      equipmentId: equipment.id,
      startDate,
      endDate,
      notes: notes.trim() || undefined,
    };

    if (!isOnline) {
      // Offline: queue the reservation
      const key = enqueue(reservationData);
      if (!key) {
        toast.error('You already have a pending reservation for these dates.');
        return;
      }
      toast(
        'Reservation saved offline. It will be submitted automatically when you reconnect.',
        { icon: '⏳', duration: 5000 }
      );
      navigate('/farmer/reservations');
    } else {
      // Online: submit immediately
      reserveMutation.mutate(reservationData);
    }
  };

  // Was this data served from cache?
  const isFromCache = !isFetching && dataUpdatedAt && (Date.now() - dataUpdatedAt > 60000);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" as={Link} to="/farmer/browse">← Back to Browse</Button>

      {/* Offline / cached data indicator */}
      {!isOnline && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <WifiOff size={15} className="text-orange-500 shrink-0" aria-hidden="true" />
          <p className="text-orange-800">
            <span className="font-medium">You're viewing cached data.</span>{' '}
            Availability and pricing may have changed since you last visited.
          </p>
        </div>
      )}
      {isOnline && isFromCache && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <Clock size={15} className="text-blue-500 shrink-0" aria-hidden="true" />
          <p className="text-blue-800">
            Showing cached information. Reloading to get the latest data.
          </p>
        </div>
      )}

      {/* Pending queue indicator */}
      {hasPendingQueuedReservation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <Clock size={15} className="text-yellow-600 shrink-0" aria-hidden="true" />
          <p className="text-yellow-800 font-medium">
            You have a pending offline reservation for this equipment waiting to sync.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Images */}
        <div className="space-y-2">
          <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
            {equipment.images?.[imgIdx] ? (
              <img
                src={equipment.images[imgIdx]}
                alt={equipment.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Tractor size={72} strokeWidth={1} aria-hidden="true" />
              </div>
            )}
          </div>
          {equipment.images?.length > 1 && (
            <div className="flex gap-2">
              {equipment.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`h-14 w-14 rounded-lg overflow-hidden border-2 ${i === imgIdx ? 'border-primary-500' : 'border-transparent'}`}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
              <Badge label={equipment.status} />
            </div>
            <p className="text-gray-500 capitalize">{equipment.category}</p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-primary-600">
              ₱{parseFloat(equipment.dailyRate).toLocaleString()}
            </span>
            <span className="text-gray-500">/day</span>
          </div>

          {equipment.location && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} aria-hidden="true" /> {equipment.location}
            </div>
          )}

          {equipment.description && (
            <p className="text-sm text-gray-600">{equipment.description}</p>
          )}

          {equipment.owner && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Owner</p>
              <p className="text-sm font-medium">{equipment.owner.name}</p>
              {equipment.owner.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Phone size={12} aria-hidden="true" /> {equipment.owner.phone}
                </div>
              )}
            </div>
          )}

          {/* Specifications */}
          {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Specifications</p>
              <div className="space-y-1">
                {Object.entries(equipment.specifications).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reservation + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservation form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Reserve Equipment</h2>
            {!isOnline && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <WifiOff size={11} /> Offline mode
              </span>
            )}
          </div>

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={(v) => { setStartDate(v); setDateError(''); }}
            onEndChange={(v) => { setEndDate(v); setDateError(''); }}
          />

          {/* Date error */}
          {dateError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600" role="alert">
              <AlertTriangle size={13} aria-hidden="true" />
              {dateError}
            </div>
          )}

          {/* Cost preview */}
          {days > 0 && !dateError && (
            <div className="bg-primary-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Duration</span>
                <span>{days} day{days > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between font-bold text-primary-700 mt-1">
                <span>Estimated Cost</span>
                <span>₱{totalCost.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Final cost confirmed by owner upon approval.
              </p>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for the owner... (optional)"
            rows={2}
            maxLength={1000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Notes for equipment owner"
          />

          {user?.role === 'farmer' && equipment.status === 'available' ? (
            <div className="space-y-2">
              <Button
                onClick={handleReserve}
                loading={reserveMutation.isPending}
                disabled={reserveMutation.isPending || hasPendingQueuedReservation}
                className="w-full"
                aria-label={!isOnline ? 'Save reservation for offline sync' : 'Submit reservation'}
              >
                {!isOnline ? (
                  <><WifiOff size={15} /> Save for Sync When Online</>
                ) : (
                  'Submit Reservation'
                )}
              </Button>
              {!isOnline && (
                <p className="text-xs text-gray-500 text-center">
                  Your reservation will be submitted automatically when your connection is restored.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500">
                {user?.role !== 'farmer'
                  ? 'Only farmers can reserve equipment.'
                  : `This equipment is currently ${equipment.status}.`}
              </p>
            </div>
          )}
        </div>

        {/* Availability calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <AvailabilityCalendar equipmentId={equipment.id} />
          {!isOnline && (
            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
              <WifiOff size={11} aria-hidden="true" />
              Availability shown from cache — may not reflect recent bookings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetailPage;
