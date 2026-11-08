import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Wheat } from 'lucide-react';
import toast from 'react-hot-toast';
import { register as registerApi } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Register = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login: setAuth } = useAuthStore();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: registerApi,
    onSuccess: ({ data }) => {
      setAuth(data.token, data.user);
      const redirects = { farmer: '/farmer/dashboard', owner: '/owner/dashboard' };
      navigate(redirects[data.user.role] || '/');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Registration failed'),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-primary-100 p-4 rounded-full">
              <Wheat size={36} className="text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join AgriRent today</p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Juan dela Cruz"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            {...register('phone')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">I am a...</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('role', { required: 'Please select a role' })}
            >
              <option value="">Select role</option>
              <option value="farmer">Farmer (I want to rent equipment)</option>
              <option value="owner">Equipment Owner (I want to list equipment)</option>
            </select>
            {errors.role && <span className="text-xs text-red-600">{errors.role.message}</span>}
          </div>

          <Button type="submit" loading={mutation.isPending} className="w-full">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
