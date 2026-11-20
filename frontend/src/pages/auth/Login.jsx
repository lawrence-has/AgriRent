import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

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
    <div className="relative min-h-screen overflow-hidden bg-[#f1f0e8] flex items-center justify-center p-4 sm:p-8 lg:p-10">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#8fa875]/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-28 h-[28rem] w-[28rem] rounded-full bg-[#d8bd75]/20 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#e6e1d2] bg-[#fffefa] shadow-[0_30px_90px_rgba(31,50,34,0.18)] lg:grid-cols-[1fr,0.95fr]">
        <AuthBrandPanel />
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary-700">Welcome back</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#29392b]">Sign in to AgriRent</h1>
          <p className="text-[#7c8174] text-sm mt-2">Your next season starts here.</p>
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

        <p className="text-center text-sm text-[#777d70] mt-7">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">
            Register
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
