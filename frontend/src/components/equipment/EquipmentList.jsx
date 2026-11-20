import EquipmentCard from './EquipmentCard';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import { Tractor } from 'lucide-react';

const EquipmentList = ({ equipment, isLoading, savedIds = [], onToggleSaved, viewMode = 'grid', emptyDescription = 'Try adjusting your filters' }) => {
  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!equipment?.length) return <EmptyState icon={Tractor} title="No equipment found" description={emptyDescription} />;

  return (
    <div className={`equipment-stagger ${viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
      {equipment.map((eq) => (
        <EquipmentCard
          key={eq.id}
          equipment={eq}
          isSaved={savedIds.some((id) => Number(id) === Number(eq.id))}
          onToggleSaved={onToggleSaved}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

export default EquipmentList;
