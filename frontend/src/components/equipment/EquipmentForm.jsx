import { useForm } from 'react-hook-form';
import Input from '../common/Input';
import Button from '../common/Button';

const categories = ['tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'];

const EquipmentForm = ({ defaultValues, onSubmit, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Equipment Name"
        placeholder="e.g. John Deere Tractor 5075E"
        error={errors.name?.message}
        {...register('name', { required: 'Name is required' })}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Category</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...register('category', { required: 'Category is required' })}
        >
          <option value="">Select category</option>
          {categories.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        {errors.category && <span className="text-xs text-red-600">{errors.category.message}</span>}
      </div>

      <Input
        label="Daily Rate (₱)"
        type="number"
        step="0.01"
        placeholder="0.00"
        error={errors.dailyRate?.message}
        {...register('dailyRate', { required: 'Daily rate is required', min: { value: 1, message: 'Rate must be at least ₱1' } })}
      />

      <Input label="Location" placeholder="e.g. Cagayan de Oro, Misamis Oriental" {...register('location')} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          placeholder="Describe the equipment, condition, features..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...register('description')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Images</label>
        <input type="file" accept="image/*" multiple className="text-sm" {...register('images')} />
        <span className="text-xs text-gray-500">Up to 5 images (max 5MB each)</span>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        Save Equipment
      </Button>
    </form>
  );
};

export default EquipmentForm;
