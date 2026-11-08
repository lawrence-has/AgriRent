import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, MapPin } from 'lucide-react';
import { getEquipmentById } from '../../api/equipment';
import { getReservations } from '../../api/reservations';
import Badge from '../../components/common/Badge';
import AvailabilityCalendar from '../../components/equipment/AvailabilityCalendar';
import Spinner from '../../components/common/Spinner';

const OwnerEquipmentDetail = () => {
  const { id } = useParams();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id).then((r) => r.data.equipment),
  });

  const { data: resData } = useQuery({
    queryKey: ['equipment-reservations', id],
    queryFn: () => getReservations().then((r) =>
      r.data.reservations.filter((res) => res.equipmentId === parseInt(id))
    ),
    enabled: !!id,
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!equipment) return <p className="text-center text-gray-500 mt-20">Equipment not found</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/owner/equipment" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to My Equipment
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Images */}
        <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
          {equipment.images?.[0] ? (
            <img src={equipment.images[0]} alt={equipment.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <span className="text-6xl">🚜</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
            <Badge label={equipment.status} />
          </div>
          <p className="text-gray-500 capitalize">{equipment.category}</p>
          <p className="text-3xl font-bold text-primary-600">
            ₱{parseFloat(equipment.dailyRate).toLocaleString()}<span className="text-base font-normal text-gray-500">/day</span>
          </p>
          {equipment.location && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} /> {equipment.location}
            </div>
          )}
          {equipment.description && (
            <p className="text-sm text-gray-600">{equipment.description}</p>
          )}
          {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Specifications</p>
              <div className="space-y-1">
                {Object.entries(equipment.specifications).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Availability Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <AvailabilityCalendar equipmentId={equipment.id} />
      </div>

      {/* Reservations for this equipment */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Reservations</h2>
        {!resData?.length ? (
          <p className="text-sm text-gray-500 text-center py-4">No reservations yet</p>
        ) : (
          <div className="space-y-3">
            {resData.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div>
                  <p className="font-medium">{r.farmer?.name}</p>
                  <p className="text-gray-500">
                    {format(new Date(r.startDate), 'MMM d')} – {format(new Date(r.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">₱{parseFloat(r.totalCost).toLocaleString()}</p>
                  <Badge label={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerEquipmentDetail;
