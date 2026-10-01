import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  apiFetch,
  imageUrl as resolveImageUrl,
  uploadImage,
  uploadImages,
} from '../../lib/api';

interface Category {
  id: number;
  name: string;
  slug?: string;
}

interface FormState {
  name: string;
  description: string;
  details: string;
  price: string;
  image: string;
  images: string[];
  color: string;
  categoryId: string;
  sizes: string;
  is_active: boolean;
}

const empty: FormState = {
  name: '',
  description: '',
  details: '',
  price: '',
  image: '',
  images: [],
  color: '',
  categoryId: '',
  sizes: '',
  is_active: true,
};

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = id ? Number(id) : null;
  const isEdit = productId !== null;

  const [form, setForm] = useState<FormState>(empty);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageTouched, setImageTouched] = useState(false);

  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Category[]>('/api/admin/categories'),
      isEdit
        ? apiFetch<any>(`/api/admin/products/${productId}`)
        : Promise.resolve(null),
    ])
      .then(([cats, product]) => {
        setCategories(cats);
        if (product) {
          setForm({
            name: product.name || '',
            description: product.description || '',
            details: Array.isArray(product.details) ? product.details.join('\n') : '',
            price: String(product.price ?? ''),
            image: product.image || '',
            images: Array.isArray(product.images) ? product.images : [],
            color: product.color || '',
            categoryId: String(product.category_id ?? ''),
            sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
            is_active: product.is_active !== false,
          });
          setPreviewUrl(resolveImageUrl(product.image || ''));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isEdit, productId]);

  const handleChange = (field: keyof FormState, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // -------- Main image upload (single) --------
  const handleMainFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    try {
      const { url } = await uploadImage(file);
      handleChange('image', url);
      setPreviewUrl(resolveImageUrl(url));
      setImageTouched(true);
    } catch (err: any) {
      setError(err.message);
      setPreviewUrl(resolveImageUrl(form.image));
    } finally {
      setUploadingMain(false);
      if (mainInputRef.current) mainInputRef.current.value = '';
    }
  };

  // -------- Gallery images upload (multiple) --------
  const handleGalleryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingGallery(true);
    setError(null);
    try {
      const paths = await uploadImages(files);
      setForm((f) => ({ ...f, images: [...f.images, ...paths] }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (path: string) => {
    setForm((f) => ({ ...f, images: f.images.filter((p) => p !== path) }));
  };

  const handleRemoveMainImage = () => {
    handleChange('image', '');
    setPreviewUrl('');
    setImageTouched(true);
  };

  // -------- Submit --------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const selectedCategory = categories.find((c) => String(c.id) === form.categoryId);

    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      details: form.details.split('\n').map((s) => s.trim()).filter(Boolean),
      price: Number(form.price),
      color: form.color,
      category_id: form.categoryId ? Number(form.categoryId) : null,
      category: selectedCategory?.name ?? '',
      sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      images: form.images,
      is_active: form.is_active,
    };

    if (imageTouched || !isEdit) {
      payload.image = form.image;
    }

    try {
      if (isEdit) {
        await apiFetch(`/api/admin/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-stone-500">Loading...</p>;

  const inputClass =
    'w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800';

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">Admin</p>
        <h1 className="text-3xl font-light text-stone-800">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-stone-200 p-6 space-y-5 max-w-2xl"
      >
        <div>
          <label className="block text-sm text-stone-700 mb-1">Name *</label>
          <input
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">
            Details (one per line)
          </label>
          <textarea
            value={form.details}
            onChange={(e) => handleChange('details', e.target.value)}
            rows={5}
            className={inputClass}
            placeholder={'70% Wool, 20% Cashmere\nMade in Italy'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">Price *</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">Color</label>
            <input
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* ---------- MAIN IMAGE ---------- */}
        <div>
          <label className="block text-sm text-stone-700 mb-2">Main Image</label>
          <div className="flex items-start gap-4">
            <div className="w-32 h-40 flex-shrink-0 bg-stone-100 border border-stone-200 rounded-md overflow-hidden flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => setPreviewUrl('')}
                />
              ) : (
                <span className="text-xs text-stone-400">No image</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={mainInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainFile}
                className="hidden"
                id="main-image-upload"
              />
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="main-image-upload"
                  className={`inline-block px-4 py-2 text-sm tracking-wider uppercase cursor-pointer rounded ${
                    uploadingMain
                      ? 'bg-stone-300 text-stone-500 cursor-wait'
                      : 'bg-stone-800 text-white hover:bg-amber-900'
                  }`}
                >
                  {uploadingMain ? 'Uploading...' : previewUrl ? 'Replace Main' : 'Upload Main'}
                </label>
                {previewUrl && !uploadingMain && (
                  <button
                    type="button"
                    onClick={handleRemoveMainImage}
                    className="px-4 py-2 text-sm tracking-wider uppercase text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-stone-400">JPEG, PNG, WEBP or GIF · max 5 MB</p>
            </div>
          </div>
        </div>

        {/* ---------- GALLERY IMAGES ---------- */}
        <div>
          <label className="block text-sm text-stone-700 mb-2">
            Gallery Images (multiple)
          </label>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryFiles}
            className="hidden"
            id="gallery-images-upload"
          />
          <label
            htmlFor="gallery-images-upload"
            className={`inline-block px-4 py-2 text-sm tracking-wider uppercase cursor-pointer rounded mb-3 ${
              uploadingGallery
                ? 'bg-stone-300 text-stone-500 cursor-wait'
                : 'bg-stone-800 text-white hover:bg-amber-900'
            }`}
          >
            {uploadingGallery ? 'Uploading...' : '+ Add Images'}
          </label>

          {form.images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
              {form.images.map((img, i) => (
                <div
                  key={`${img}-${i}`}
                  className="relative group aspect-[4/5] bg-stone-100 rounded overflow-hidden border border-stone-200"
                >
                  <img
                    src={resolveImageUrl(img)}
                    alt={`Gallery ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(img)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className={inputClass}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">
              Sizes (comma-separated)
            </label>
            <input
              value={form.sizes}
              onChange={(e) => handleChange('sizes', e.target.value)}
              className={inputClass}
              placeholder="S, M, L, XL"
            />
          </div>
        </div>

        {/* ---------- ACTIVE TOGGLE ---------- */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleChange('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_active ? 'bg-green-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-stone-700">
            {form.is_active ? 'Active — visible to customers' : 'Inactive — hidden from store'}
          </span>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || uploadingMain || uploadingGallery}
            className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 disabled:bg-stone-400"
          >
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="text-stone-600 px-6 py-3 text-sm tracking-[0.15em] uppercase hover:text-stone-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}