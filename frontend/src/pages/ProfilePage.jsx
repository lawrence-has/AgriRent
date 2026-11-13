import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { User, Camera, Bell, BellOff, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateMe } from '../api/auth';
import useAuthStore from '../store/authStore';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import usePushNotification from '../hooks/usePushNotification';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const {
    isSubscribed,
    isSupported,
    isLoading: pushLoading,
    permissionState,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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
      toast.success('Profile updated successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Update failed'),
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Avatar card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
        <div className="shrink-0">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-primary-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <User size={36} className="text-primary-600" aria-hidden="true" />
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full capitalize font-medium">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Edit profile form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Edit Profile</h2>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
          noValidate
          aria-label="Edit profile form"
        >
          <Input
            label="Full Name"
            id="profile-name"
            error={errors.name?.message}
            aria-required="true"
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
              maxLength: { value: 100, message: 'Name must be 100 characters or less' },
            })}
          />
          <Input
            label="Phone Number"
            id="profile-phone"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            {...register('phone', {
              maxLength: { value: 20, message: 'Phone must be 20 characters or less' },
            })}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-address" className="text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              id="profile-address"
              rows={2}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('address')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-picture" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Camera size={14} aria-hidden="true" /> Profile Picture
            </label>
            <input
              id="profile-picture"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              {...register('profilePicture')}
            />
            <span className="text-xs text-gray-400">JPEG, PNG or WebP, max 2MB</span>
          </div>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={mutation.isPending}
            className="w-full"
          >
            Save Changes
          </Button>
        </form>
      </div>

      {/* Push Notifications management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isSubscribed
              ? <Bell size={18} className="text-green-700" aria-hidden="true" />
              : <BellOff size={18} className="text-gray-500" aria-hidden="true" />
            }
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Push Notifications</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isSubscribed
                ? 'You will receive push notifications on this device even when the app is closed.'
                : 'Get notified about reservations, transactions, and messages — even when the app is closed.'}
            </p>
          </div>
        </div>

        {/* Not supported */}
        {!isSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2 text-sm">
            <AlertTriangle size={15} className="text-yellow-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-yellow-800">
              Push notifications are not supported in your current browser.
              Try Chrome, Edge, or Firefox for full support.
            </p>
          </div>
        )}

        {/* Permission denied */}
        {isSupported && permissionState === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm">
            <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-red-800">
              <p className="font-medium">Notifications are blocked by your browser.</p>
              <p className="mt-0.5 text-red-700">
                To enable: click the lock icon <span aria-hidden="true">🔒</span> in the address bar
                → find "Notifications" → set to "Allow" → reload the page.
              </p>
            </div>
          </div>
        )}

        {/* Error from hook */}
        {pushError && permissionState !== 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {pushError}
          </div>
        )}

        {/* Subscribed status */}
        {isSubscribed && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle size={15} aria-hidden="true" />
            <span>Notifications enabled on this device</span>
          </div>
        )}

        {/* What you'll receive */}
        {!isSubscribed && isSupported && permissionState !== 'denied' && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 mb-1.5">You'll be notified when:</p>
            <ul className="space-y-1 text-xs text-gray-500">
              {[
                'Your reservation is confirmed or rejected',
                'Equipment is released or returned',
                'You receive a new message',
                'Your reservation is cancelled',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-primary-400 rounded-full shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toggle button */}
        {isSupported && permissionState !== 'denied' && (
          <div>
            {isSubscribed ? (
              <Button
                variant="secondary"
                onClick={unsubscribe}
                loading={pushLoading}
                disabled={pushLoading}
                className="w-full sm:w-auto"
                aria-label="Disable push notifications"
              >
                <BellOff size={15} />
                {pushLoading ? 'Disabling...' : 'Disable Notifications'}
              </Button>
            ) : (
              <Button
                onClick={subscribe}
                loading={pushLoading}
                disabled={pushLoading}
                className="w-full sm:w-auto"
                aria-label="Enable push notifications"
              >
                <Bell size={15} />
                {pushLoading ? 'Enabling...' : 'Enable Push Notifications'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
