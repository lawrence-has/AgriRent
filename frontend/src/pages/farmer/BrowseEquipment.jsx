import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { getEquipment } from '../../api/equipment';
import EquipmentList from '../../components/equipment/EquipmentList';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const categories = ['', 'tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'];

const BrowseEquipment = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', { search, category, page }],
    queryFn: () => getEquipment({ search, category, page, limit: 12, status: 'available' }).then((r) => r.data),
  });

  const totalPages = Math.ceil((data?.total || 0) / 12);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Browse Equipment</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search equipment..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c ? c.charAt(0).toUpperCase() + c.slice(1) : 'All Categories'}</option>
          ))}
        </select>
      </div>

      <EquipmentList equipment={data?.equipment} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
};

export default BrowseEquipment;
