import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { differenceInDays, parseISO } from 'date-fns';
import { MapPin, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEquipmentById } from '../../api/equipment';
import { createReservation } from '../../api/reservations';
import useAuthStore from '../../store/authStore';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import DateRangePicker from '../../components/common/DateRangePicker';
import AvailabilityCalendar from '../../components/equipment/AvailabilityCalendar';
import Spinner from '../../components/common/Spinner';

const EquipmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id).then((r) => r.data.equipment),
  });

  const reserveMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      toast.success('Reservation submitted!');
      navigate('/farmer/reservations');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reserve'),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!equipment) return <p className="text-center text-gray-500 mt-20">Equipment not found</p>;

  const days = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1
    : 0;
  const totalCost = days > 0 ? days * parseFloat(equipment.dailyRate) : 0;

  const handleReserve = () => {
    if (!startDate || !endDate) return toast.error('Please select dates');
    if (days < 1) return toast.error('End date must be after start date');
    reserveMutation.mutate({ equipmentId: equipment.id, startDate, endDate, notes });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" as={Link} to="/farmer/browse">← Back to Browse</Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Images */}
        <div className="space-y-2">
          <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
            {equipment.images?.[imgIdx] ? (
              <img src={equipment.images[imgIdx]} alt={equipment.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🚜</div>
            )}
          </div>
          {equipment.images?.length > 1 && (
            <div className="flex gap-2">
              {equipment.images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-14 w-14 rounded-lg overflow-hidden border-2 ${i === imgIdx ? 'border-primary-500' : 'border-transparent'}`}>
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
            <span className="text-3xl font-bold text-primary-600">₱{parseFloat(equipment.dailyRate).toLocaleString()}</span>
            <span className="text-gray-500">/day</span>
          </div>

          {equipment.location && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} /> {equipment.location}
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
                  <Phone size={12} /> {equipment.owner.phone}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reservation + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Reserve Equipment</h2>
          <DateRangePicker
            startDate={startDate} endDate={endDate}
            onStartChange={setStartDate} onEndChange={setEndDate}
          />
          {days > 0 && (
            <div className="bg-primary-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span>Duration</span><span>{days} day{days > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between font-bold text-primary-700 mt-1">
                <span>Total Cost</span><span>₱{totalCost.toLocaleString()}</span>
              </div>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for the owner..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {user?.role === 'farmer' && equipment.status === 'available' ? (
            <Button onClick={handleReserve} loading={reserveMutation.isPending} className="w-full">
              Submit Reservation
            </Button>
          ) : (
            <p className="text-sm text-center text-gray-500">
              {user?.role !== 'farmer' ? 'Only farmers can reserve equipment' : 'This equipment is not available'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <AvailabilityCalendar equipmentId={equipment.id} />
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetailPage;
