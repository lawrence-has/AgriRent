import { useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Trash2, Clock, CheckCircle, AlertTriangle, WifiOff, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import useOfflineQueueStore from '../../store/offlineQueueStore';
import { syncOfflineQueue } from '../../services/syncService';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';

const statusConfig = {
  queued:    { label: 'Pending Sync', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  syncing:   { label: 'Syncing...', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed:    { label: 'Failed', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  conflict:  { label: 'Date Conflict', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  expired:   { label: 'Expired', color: 'bg-gray-100 text-gray-600', icon: Clock },
};

const OfflineQueue = () => {
  const { queue, remove, clearCompleted, getCounts } = useOfflineQueueStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const counts = getCounts();

  const handleSync = async () => {
    if (!isOnline) {
      toast.error('You\'re offline. Connect to sync your reservations.');
      return;
    }
    setIsSyncing(true);
    try {
      const results = await syncOfflineQueue();
      if (results.submitted > 0) toast.success(`${results.submitted} reservation(s) submitted!`);
      if (results.conflicts > 0) toast.error(`${results.conflicts} reservation(s) had date conflicts.`);
      if (results.failed > 0) toast.error(`${results.failed} reservation(s) failed to submit.`);
      if (results.processed === 0) toast('No pending reservations to sync.', { icon: 'ℹ️' });
    } catch {
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offline Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Reservations saved while offline that are waiting to sync.
          </p>
        </div>
        <div className="flex gap-2">
          {counts.submitted + counts.expired > 0 && (
            <Button variant="secondary" size="sm" onClick={clearCompleted}>
              Clear Completed
            </Button>
          )}
          {counts.queued > 0 && (
            <Button
              size="sm"
              onClick={handleSync}
              loading={isSyncing}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw size={14} />
              {isSyncing ? 'Syncing...' : `Sync Now (${counts.queued})`}
            </Button>
          )}
        </div>
      </div>

      {/* Connection status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        ${isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
      >
        {isOnline
          ? <><Wifi size={14} /> Connected — sync available</>
          : <><WifiOff size={14} /> Offline — connect to sync reservations</>
        }
      </div>

      {/* Stats row */}
      {queue.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(counts).filter(([k]) => k !== 'total').map(([key, count]) => {
            const cfg = statusConfig[key];
            if (!cfg || count === 0) return null;
            const Icon = cfg.icon;
            return (
              <div key={key} className={`rounded-lg px-3 py-2 text-center ${cfg.color}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Queue list */}
      {queue.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Queue is empty"
          description="Reservations submitted while offline will appear here until they sync."
        />
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const cfg = statusConfig[item.status] || statusConfig.queued;
            const Icon = cfg.icon;
            const isTerminal = ['submitted', 'failed', 'conflict', 'expired'].includes(item.status);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon size={11} className={item.status === 'syncing' ? 'animate-spin' : ''} />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    {/* Reservation details */}
                    <div className="text-sm space-y-0.5">
                      <p className="text-gray-500">
                        Equipment ID: <span className="font-medium text-gray-800">#{item.data.equipmentId}</span>
                      </p>
                      <p className="text-gray-500">
                        Dates: <span className="font-medium text-gray-800">
                          {item.data.startDate} → {item.data.endDate}
                        </span>
                      </p>
                      {item.data.notes && (
                        <p className="text-gray-400 text-xs italic">"{item.data.notes}"</p>
                      )}
                    </div>

                    {/* Error / conflict message */}
                    {item.error && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        {item.error}
                      </div>
                    )}

                    {/* Conflict guidance */}
                    {item.status === 'conflict' && (
                      <p className="text-xs text-orange-700 mt-1">
                        These dates are no longer available. Please browse equipment and choose different dates.
                      </p>
                    )}

                    {/* Retry count */}
                    {item.retryCount > 0 && item.status === 'queued' && (
                      <p className="text-xs text-gray-400 mt-1">
                        Retry attempt {item.retryCount}/3
                      </p>
                    )}
                  </div>

                  {/* Remove button (terminal states only) */}
                  {isTerminal && (
                    <button
                      onClick={() => remove(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded shrink-0"
                      aria-label="Remove from queue"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Important notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">How offline reservations work:</p>
        <ul className="space-y-0.5 list-disc list-inside text-blue-600">
          <li>Reservations saved offline are <strong>not confirmed</strong> until validated by the server.</li>
          <li>Equipment availability is checked when the request is synced.</li>
          <li>If the dates are taken, the reservation will show as "Date Conflict".</li>
          <li>Pending requests expire after 24 hours if not synced.</li>
        </ul>
      </div>
    </div>
  );
};

export default OfflineQueue;
