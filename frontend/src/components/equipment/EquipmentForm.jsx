import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ImagePlus } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';

const categories = ['tractor', 'cultivator', 'harvester', 'planter', 'sprayer', 'irrigation', 'other'];

const EquipmentForm = ({ defaultValues, onSubmit, isLoading }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues, mode: 'onTouched' });
  const [previews, setPreviews] = useState([]);
  const selectedImages = watch('images');

  useEffect(() => {
    const files = selectedImages ? Array.from(selectedImages).filter((file) => file instanceof File) : [];
    const localPreviews = files.map((file) => ({ src: URL.createObjectURL(file), name: file.name, local: true }));
    const existingPreviews = Array.isArray(defaultValues?.images)
      ? defaultValues.images.map((src) => ({ src, name: 'Current equipment image', local: false }))
      : [];
    setPreviews([...existingPreviews, ...localPreviews]);
    return () => localPreviews.forEach(({ src }) => URL.revokeObjectURL(src));
  }, [selectedImages, defaultValues?.images]);

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
        <label htmlFor="equipment-images" className="text-sm font-medium text-gray-700">Equipment images</label>
        <label htmlFor="equipment-images" className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5c1] bg-[#f7f8f3] px-5 py-6 text-center transition hover:border-[#829875] hover:bg-[#f0f3e9]">
          <span className="mb-2 rounded-xl bg-white p-2.5 text-[#58734f] shadow-sm transition group-hover:-translate-y-0.5"><ImagePlus size={19} /></span>
          <span className="text-sm font-semibold text-[#40543d]">Choose photos of your equipment</span>
          <span className="mt-1 text-xs text-[#858b7e]">Up to 5 images · 5 MB each</span>
        </label>
        <input
          id="equipment-images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          aria-describedby="equipment-image-help equipment-image-error"
          {...register('images', {
            validate: {
              maxFiles: (files) => !files?.length || files.length <= 5 || 'Choose up to 5 images',
              maxSize: (files) => !files?.length || Array.from(files).every((file) => file.size <= 5 * 1024 * 1024) || 'Each image must be 5 MB or smaller',
            },
          })}
        />
        <span id="equipment-image-help" className="text-xs text-gray-500">JPEG, PNG, or WebP format.</span>
        <span id="equipment-image-error" role="alert" className="text-xs text-red-600">{errors.images?.message}</span>
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5" aria-label="Selected image previews">
            {previews.map((preview, index) => (
              <div key={`${preview.src}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-[#e7e5da] bg-[#f0efe8]">
                <img src={preview.src} alt={preview.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {preview.local && <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-[#20382a]/80 px-1.5 py-1 text-[9px] font-semibold text-white">{preview.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" loading={isLoading} className="w-full">
        Save Equipment
      </Button>
    </form>
  );
};

export default EquipmentForm;
