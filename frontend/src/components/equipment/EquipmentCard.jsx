import { Link } from 'react-router-dom';
import { MapPin, Tractor, Heart } from 'lucide-react';
import Badge from '../common/Badge';

const EquipmentCard = ({ equipment, isSaved = false, onToggleSaved, viewMode = 'grid' }) => {
  const image = equipment.images?.[0];
  const isList = viewMode === 'list';

  return (
    <article className={`group relative overflow-hidden rounded-[1.35rem] border border-[#e5e2d6] bg-[#fffefa] shadow-[0_12px_32px_rgba(36,49,34,0.07)] transition-all duration-300 hover:border-[#cdd8bf] hover:shadow-[0_22px_48px_rgba(36,49,34,0.14)] ${isList ? 'flex flex-col sm:flex-row' : 'hover:-translate-y-1'}`}>
      <Link to={`/equipment/${equipment.id}`} aria-label={`View ${equipment.name}`} className={`block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${isList ? 'sm:flex sm:flex-1 sm:items-center' : ''}`}>
      <div className={`bg-[#e9e9de] relative overflow-hidden ${isList ? 'h-48 sm:h-40 sm:w-60 sm:shrink-0' : 'h-56'}`}>
        {image ? (
          <img src={image} alt={equipment.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Tractor size={56} strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge label={equipment.status} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#17261c]/65 to-transparent" aria-hidden="true" />
        <span className="absolute inset-0 flex items-center justify-center bg-[#1d3327]/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="translate-y-2 rounded-full border border-white/40 bg-[#fffefa]/95 px-4 py-2 text-xs font-bold text-[#294331] shadow-lg transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0">View equipment <span aria-hidden="true">→</span></span>
        </span>
        <span className="absolute bottom-3 left-3 rounded-full border border-white/35 bg-[#24392c]/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#fffdf5] backdrop-blur-sm">
          {equipment.category || 'Farm equipment'}
        </span>
      </div>
      <div className={`min-w-0 p-4 sm:p-5 ${isList ? 'flex-1' : ''}`}>
        <h3 className="font-bold text-[#2a392b] text-[1.03rem] truncate transition-colors group-hover:text-primary-800">{equipment.name}</h3>
        {equipment.location && (
          <div className="flex items-center gap-1.5 text-xs text-[#777d70] mb-3">
            <MapPin size={12} />
            <span className="truncate">{equipment.location}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-extrabold tracking-tight text-primary-700">₱{parseFloat(equipment.dailyRate).toLocaleString()}</span>
            <span className="text-[11px] font-medium text-[#8c8e81]">/ day</span>
          </div>
          {equipment.owner && (
            <span className="text-xs text-gray-500">{equipment.owner.name}</span>
          )}
        </div>
      </div>
      </Link>
      <button
        type="button"
        onClick={() => onToggleSaved?.(equipment)}
        className={`absolute left-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${isSaved ? 'border-rose-200 bg-white text-rose-600' : 'border-white/70 bg-white/90 text-gray-500 hover:text-rose-600'}`}
        aria-label={isSaved ? `Remove ${equipment.name} from saved equipment` : `Save ${equipment.name}`}
        aria-pressed={isSaved}
        title={isSaved ? 'Remove from saved' : 'Save equipment'}
      >
        <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
};

export default EquipmentCard;
