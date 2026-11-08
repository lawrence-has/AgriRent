import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Phone, MapPin, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateMe } from '../api/auth';
import useAuthStore from '../store/authStore';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import usePushNotification from '../hooks/usePushNotification';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const { isSubscribed, subscribe, unsubscribe } = usePushNotification();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const fd = new FormData();
      if (data.name) fd.append('name', data.name);
      if (data.phone) fd.append('phone', data.phone);
      if (data.address) fd.append('address', data.address);
      if (data.profilePicture?.[0]) fd.append('profilePicture', data.profilePicture[0]);
      return updateMe(fd);
    },
    onSuccess: ({ data }) => {
      setUser(data.user);
      toast.success('Profile updated!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Avatar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
        <div className="relative">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <User size={36} className="text-primary-600" />
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full capitalize font-medium">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Input
            label="Full Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            {...register('phone')}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              rows={2}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('address')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Camera size={14} /> Profile Picture
            </label>
            <input type="file" accept="image/*" className="text-sm" {...register('profilePicture')} />
          </div>
          <Button type="submit" loading={mutation.isPending} className="w-full">
            Save Changes
          </Button>
        </form>
      </div>

      {/* Push notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Push Notifications</h2>
        <p className="text-sm text-gray-500 mb-4">
          {isSubscribed ? 'You are receiving push notifications on this device.' : 'Enable push notifications to get alerts even when the app is closed.'}
        </p>
        {isSubscribed ? (
          <Button variant="secondary" onClick={unsubscribe}>Disable Notifications</Button>
        ) : (
          <Button onClick={subscribe}>Enable Notifications</Button>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
