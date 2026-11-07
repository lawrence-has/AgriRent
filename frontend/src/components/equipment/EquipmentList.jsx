import EquipmentCard from './EquipmentCard';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';

const EquipmentList = ({ equipment, isLoading }) => {
  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!equipment?.length) return <EmptyState icon="🚜" title="No equipment found" description="Try adjusting your filters" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {equipment.map((eq) => <EquipmentCard key={eq.id} equipment={eq} />)}
    </div>
  );
};

export default EquipmentList;
