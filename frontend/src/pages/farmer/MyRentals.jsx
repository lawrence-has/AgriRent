import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Package, Tractor } from 'lucide-react';
import { getMyTransactions } from '../../api/transactions';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';

const MyRentals = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-transactions'],
    queryFn: () => getMyTransactions({ limit: 20 }).then((r) => r.data),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">My Rentals</h1>
      <p className="text-sm text-gray-500">Track equipment release and return records for your reservations.</p>

      {!data?.transactions?.length ? (
        <EmptyState
          icon={Package}
          title="No rental records yet"
          description="Rental records appear here once an owner releases equipment to you"
        />
      ) : (
        <div className="space-y-3">
          {data.transactions.map((t) => {
            const eq = t.reservation?.equipment;
            return (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                      <Tractor size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{eq?.name || 'Equipment'}</h3>
                      <p className="text-xs text-gray-500 capitalize">{eq?.category}</p>
                    </div>
                  </div>
                  <Badge label={t.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-0.5">Released</p>
                    <p className="text-gray-800">
                      {t.releaseDate ? format(new Date(t.releaseDate), 'MMM d, yyyy h:mm a') : '—'}
                    </p>
                    {t.releaseNotes && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{t.releaseNotes}"</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-0.5">Returned</p>
                    <p className="text-gray-800">
                      {t.returnDate ? format(new Date(t.returnDate), 'MMM d, yyyy h:mm a') : 'Not yet returned'}
                    </p>
                    {t.returnNotes && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{t.returnNotes}"</p>
                    )}
                  </div>
                </div>

                {/* Release images */}
                {t.releaseImages?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Release Photos</p>
                    <div className="flex gap-2 flex-wrap">
                      {t.releaseImages.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt="Release" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Return images */}
                {t.returnImages?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Return Photos</p>
                    <div className="flex gap-2 flex-wrap">
                      {t.returnImages.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt="Return" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRentals;
