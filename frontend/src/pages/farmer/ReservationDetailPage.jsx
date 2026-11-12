import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import { getReservationById } from '../../api/reservations';
import useChatStore from '../../store/chatStore';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

const ReservationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveConversation, addConversation } = useChatStore();

  const { data, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => getReservationById(id).then((r) => r.data.reservation),
  });

  if (isLoading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-center text-gray-500 mt-20">Reservation not found</p>;

  const r = data;

  const handleMessageOwner = () => {
    const owner = r.equipment?.owner;
    if (!owner) return;
    const partner = { id: owner.id, name: owner.name, role: 'owner', profilePicture: owner.profilePicture || null };
    addConversation({ partner, lastMessage: null, unreadCount: 0 });
    setActiveConversation(partner);
    navigate('/chat');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" as={Link} to="/farmer/reservations">← Back</Button>
        <h1 className="text-xl font-bold text-gray-900">Reservation #{r.id}</h1>
        <Badge label={r.status} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Equipment</p>
          <p className="font-semibold text-gray-900">{r.equipment?.name}</p>
          <p className="text-sm text-gray-500 capitalize">{r.equipment?.category}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Start Date</p>
            <p className="text-sm">{format(new Date(r.startDate), 'MMMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">End Date</p>
            <p className="text-sm">{format(new Date(r.endDate), 'MMMM d, yyyy')}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-primary-600">₱{parseFloat(r.totalCost).toLocaleString()}</p>
        </div>
        {r.notes && (
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Notes</p>
            <p className="text-sm">{r.notes}</p>
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Equipment Owner</p>
            <p className="text-sm font-medium">{r.equipment?.owner?.name}</p>
            <p className="text-sm text-gray-500">{r.equipment?.owner?.phone}</p>
          </div>
          {r.equipment?.owner && (
            <Button variant="outline" size="sm" onClick={handleMessageOwner} className="flex items-center gap-1.5">
              <MessageSquare size={14} /> Message Owner
            </Button>
          )}
        </div>
      </div>

      <Button onClick={handleMessageOwner} className="w-full flex items-center justify-center gap-2">
        <MessageSquare size={16} /> Open Chat with Equipment Owner
      </Button>
    </div>
  );
};

export default ReservationDetailPage;
