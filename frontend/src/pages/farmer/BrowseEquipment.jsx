import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, AlertCircle, X, LayoutGrid, List, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEquipment } from '../../api/equipment';
import EquipmentList from '../../components/equipment/EquipmentList';
import Button from '../../components/common/Button';
import useAuthStore from '../../store/authStore';
import useSavedEquipmentStore from '../../store/savedEquipmentStore';

const categories = ['', 'tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'];
const EMPTY_SAVED_IDS = [];

const BrowseEquipment = () => {
  const { user } = useAuthStore();
  const savedIds = useSavedEquipmentStore((state) => state.savedByUser[String(user?.id)] || EMPTY_SAVED_IDS);
  const toggleSaved = useSavedEquipmentStore((state) => state.toggleSaved);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['equipment', { search, category, sortBy, page }],
    queryFn: () =>
      // Backend now excludes archived by default — no need to pass status: 'available'
      getEquipment({ search, category, sortBy, page, limit: 12 }).then((r) => r.data),
    keepPreviousData: true, // show previous page data while loading next page
  });

  const totalPages = Math.ceil((data?.total || 0) / 12);
  const pageEquipment = data?.equipment || [];
  const visibleEquipment = showSavedOnly
    ? pageEquipment.filter((equipment) => savedIds.some((id) => Number(id) === Number(equipment.id)))
    : pageEquipment;

  const handleToggleSaved = (equipment) => {
    const wasSaved = toggleSaved(user?.id, equipment.id);
    toast.success(wasSaved ? `${equipment.name} saved` : `${equipment.name} removed from saved`);
  };

  if (isError) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Browse Equipment</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load equipment</p>
            <p className="text-sm text-red-600 mt-0.5">
              {error?.message || 'Please check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="agri-hero px-5 py-6 sm:px-8 sm:py-8">
        <p className="agri-eyebrow">The equipment market <span className="mx-1.5 text-[#d7bd78]">✦</span> Made for the field</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#fffdf5]">Find the right tool for the season.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">Explore local machinery, compare daily rates, and save the equipment you want to come back to.</p>
      </div>

      {/* Filters */}
      <div className="agri-panel space-y-4 p-4 sm:p-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#818778]">Explore by category</p>
            <span className="text-[11px] text-[#92978b]">Tap to filter</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter equipment by category">
            {categories.map((item) => {
              const selected = category === item;
              const label = item ? item.charAt(0).toUpperCase() + item.slice(1) : 'All equipment';
              return (
                <button
                  key={item || 'all'}
                  type="button"
                  onClick={() => { setCategory(item); setPage(1); }}
                  aria-pressed={selected}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${selected ? 'border-[#34533b] bg-[#34533b] text-white shadow-[0_5px_12px_rgba(52,83,59,0.2)]' : 'border-[#e6e5da] bg-white/80 text-[#66705f] hover:border-[#b8c7a9] hover:bg-[#f3f5ee]'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#eeede5] pt-4">
        <div className="flex-1 min-w-48">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search equipment..."
              aria-label="Search equipment by name or keyword"
              value={searchInput}
              className="w-full rounded-xl border border-[#e4e2d7] bg-[#f8f7f1] pl-9 pr-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="rounded-xl border border-[#e4e2d7] bg-[#f8f7f1] px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="createdAt">Newest First</option>
          <option value="dailyRate">Price: Low to High</option>
          <option value="name">Name A–Z</option>
        </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-500" aria-live="polite">
            {isFetching ? 'Updating equipment…' : `${showSavedOnly ? visibleEquipment.length : data?.total ?? 0} equipment ${showSavedOnly ? 'saved on this page' : search || category ? 'match your filters' : 'available to browse'}`}
          </p>
          <button
            type="button"
            onClick={() => setShowSavedOnly((current) => !current)}
            aria-pressed={showSavedOnly}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${showSavedOnly ? 'bg-rose-100 text-rose-700' : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-200 hover:text-rose-600'}`}
          >
            <Heart size={13} fill={showSavedOnly ? 'currentColor' : 'none'} />
            Saved on this page <span className="rounded-full bg-black/5 px-1.5">{pageEquipment.filter((item) => savedIds.some((id) => Number(id) === Number(item.id))).length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {(searchInput || category || showSavedOnly) && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setCategory(''); setShowSavedOnly(false); setPage(1); }}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X size={13} /> Clear filters
            </button>
          )}
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1" role="group" aria-label="Equipment layout">
            <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Grid layout" className={`rounded-lg p-2 transition ${viewMode === 'grid' ? 'bg-primary-50 text-primary-700' : 'text-gray-400 hover:text-gray-700'}`}><LayoutGrid size={16} /></button>
            <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="List layout" className={`rounded-lg p-2 transition ${viewMode === 'list' ? 'bg-primary-50 text-primary-700' : 'text-gray-400 hover:text-gray-700'}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      <EquipmentList
        equipment={visibleEquipment}
        isLoading={isLoading}
        savedIds={savedIds}
        onToggleSaved={handleToggleSaved}
        viewMode={viewMode}
        emptyDescription={showSavedOnly ? 'Save equipment with the heart button to find it here on this page.' : 'Try adjusting your filters'}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default BrowseEquipment;
