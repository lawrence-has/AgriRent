import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { register as registerApi } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel';

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
    <div className="relative min-h-screen overflow-hidden bg-[#f1f0e8] flex items-center justify-center p-4 sm:p-8 lg:p-10">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#8fa875]/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-28 h-[28rem] w-[28rem] rounded-full bg-[#d8bd75]/20 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#e6e1d2] bg-[#fffefa] shadow-[0_30px_90px_rgba(31,50,34,0.18)] lg:grid-cols-[1fr,0.95fr]">
        <AuthBrandPanel />
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
        <div className="mb-7">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary-700">Join the community</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#29392b] mt-2">Create your account</h1>
          <p className="text-[#7c8174] text-sm mt-2">Bring your farm or equipment business to AgriRent.</p>
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

        <p className="text-center text-sm text-[#777d70] mt-7">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
