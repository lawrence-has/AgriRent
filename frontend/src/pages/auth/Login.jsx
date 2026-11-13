import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Wheat, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const { login: setAuth } = useAuthStore();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ data }) => {
      setAuth(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      const redirects = {
        farmer: '/farmer/dashboard',
        owner: '/owner/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(redirects[data.user.role] || '/');
    },
    onError: (err) => {
      const message = err.response?.data?.message || err.message || 'Login failed';
      // Show inline error for credential issues, toast for others
      if (err.response?.status === 401) {
        setError('password', { message: 'Invalid email or password' });
        setError('email', { message: ' ' }); // mark email field red too
      } else {
        toast.error(message);
      }
    },
  });

  const onSubmit = (data) => {
    if (mutation.isPending) return; // prevent duplicate submissions
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-primary-100 p-4 rounded-full">
              <Wheat size={36} className="text-primary-600" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AgriRent</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          aria-label="Login form"
        >
          <Input
            label="Email address"
            type="email"
            id="login-email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message?.trim() ? errors.email.message : undefined}
            aria-required="true"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address',
              },
            })}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="login-password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              aria-required="true"
              {...register('password', {
                required: 'Password is required',
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Global API error */}
          {mutation.isError && !errors.email && !errors.password && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {mutation.error?.message || 'Login failed. Please try again.'}
            </div>
          )}

          <Button
            type="submit"
            loading={mutation.isPending || isSubmitting}
            disabled={mutation.isPending || isSubmitting}
            className="w-full"
            aria-busy={mutation.isPending}
          >
            {mutation.isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
