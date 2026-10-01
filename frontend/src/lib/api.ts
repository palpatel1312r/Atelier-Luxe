// frontend/src/lib/api.ts

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const BASE_URL = API_URL.replace(/\/api$/, '');

const TOKEN_KEY = 'atelier_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

/** Prepend the Laravel base URL for /storage/... image paths */
export const imageUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/storage')) return `${BASE_URL}${path}`;
  if (path.startsWith('/uploads')) return `${BASE_URL}${path}`;
  return `${BASE_URL}/storage/${path.replace(/^\/+/, '')}`;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err.message ||
      (err.errors ? Object.values(err.errors).flat().join(' ') : null) ||
      `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return res.status === 204 ? (null as T) : res.json();
}

// ============================================================
// TYPED API OBJECT
// ============================================================

export const api = {
  // Generic
  get:    <T>(p: string) => request<T>(p),
  post:   <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put:    <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch:  <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(p: string) => request<T>(p, { method: 'DELETE' }),

  // ---- AUTH ----
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, password_confirmation }),
    }),
  me:     () => request<any>('/auth/me'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  // ---- PRODUCTS ----
  getProducts: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v) as any
    ).toString();
    return request<any[]>(`/products${q ? `?${q}` : ''}`);
  },
  getProduct: (id: number) => request<any>(`/products/${id}`),

  // ---- CATEGORIES ----
  getCategories: () => request<any[]>('/categories'),
  adminCreateCategory: (data: any) =>
    request<any>('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCategory: (id: number, data: any) =>
    request<any>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCategory: (id: number) =>
    request<any>(`/admin/categories/${id}`, { method: 'DELETE' }),

  // ---- WISHLIST ----
  getWishlist:    () => request<any[]>('/wishlist'),
  addWishlist:    (productId: number) =>
    request<any>('/wishlist', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
  removeWishlist: (productId: number) =>
    request<any>(`/wishlist/${productId}`, { method: 'DELETE' }),

  // ---- CONTACT / ORDERS ----
  contact: (data: { name: string; email: string; message: string }) =>
    request<any>('/contact', { method: 'POST', body: JSON.stringify(data) }),
  createOrder: (data: any) =>
    request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),

  // ---- UPLOAD ----
  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return request<{ url: string; path: string }>('/upload', { method: 'POST', body: fd });
  },

  uploadImages: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images[]', f));
    return request<{ paths: string[] }>('/upload', { method: 'POST', body: fd });
  },

  // ---- ADMIN ----
  adminDashboard:    () => request<any>('/admin/dashboard'),
  adminMessages:     () => request<any[]>('/admin/messages'),
  adminMarkRead:     (id: number) => request<any>(`/admin/messages/${id}/read`, { method: 'PATCH' }),
  adminOrders:       () => request<any[]>('/admin/orders'),
  adminUpdateOrder:  (id: number, status: string) =>
    request<any>(`/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  adminCreateProduct: (data: any) =>
    request<any>('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateProduct: (id: number, data: any) =>
    request<any>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteProduct: (id: number) =>
    request<any>(`/admin/products/${id}`, { method: 'DELETE' }),
  adminToggleProductActive: (id: number, is_active: boolean) =>
    request<any>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),
};

// ============================================================
// BACKWARDS-COMPAT SHIMS
// ============================================================

export const uploadImage  = (file: File)    => api.uploadImage(file);
export const uploadImages = (files: File[]) => api.uploadImages(files).then((r) => r.paths);

export const getProducts = (params?: { category?: string; search?: string }) =>
  api.getProducts(params);

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cleaned = path.replace(/^\/api/, '');
  return request<T>(cleaned, options);
}