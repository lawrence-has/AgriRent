import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import Badge from '../common/Badge';

const EquipmentCard = ({ equipment }) => {
  const image = equipment.images?.[0];

  return (
    <Link to={`/equipment/${equipment.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
      <div className="h-48 bg-gray-100 relative">
        {image ? (
          <img src={image} alt={equipment.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🚜</div>
        )}
        <div className="absolute top-2 right-2">
          <Badge label={equipment.status} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{equipment.name}</h3>
        <p className="text-xs text-gray-500 capitalize mb-2">{equipment.category}</p>
        {equipment.location && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <MapPin size={12} />
            <span className="truncate">{equipment.location}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-primary-600">₱{parseFloat(equipment.dailyRate).toLocaleString()}</span>
            <span className="text-xs text-gray-500">/day</span>
          </div>
          {equipment.owner && (
            <span className="text-xs text-gray-500">{equipment.owner.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EquipmentCard;
