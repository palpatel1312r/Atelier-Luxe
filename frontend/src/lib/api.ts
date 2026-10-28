import type {
  Paginated,
  Product,
  ProductQuery,
  FacetResponse,
  SuggestResult,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "atelier_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export const imageUrl = (path?: string | null) => {
  if (!path) return "";
  if (
    path.startsWith("http") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  )
    return path;
  if (path.startsWith("/uploads")) return path;
  return path;
};

async function request<T>(
  path: string,
  options: RequestInit & { raw?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (!(options.body instanceof FormData) && !options.raw) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  if (options.raw) return (await res.blob()) as unknown as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (
    name: string,
    email: string,
    password: string,
    password_confirmation: string,
  ) =>
    request<{ user: any; token: string }>("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, password_confirmation }),
    }),
  logout: () => request("/logout", { method: "POST" }),
  me: () => request<any>("/me"),
  updateProfile: (data: any) =>
    request<any>("/me", { method: "PATCH", body: JSON.stringify(data) }),

  changePassword: (data: {
    current_password: string;
    new_password: string;
    password_confirmation: string;
  }) =>
    request<{ ok: boolean; message?: string }>("/me/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /* ---------- Products ---------- */

  getProducts: (params?: ProductQuery) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
      });
    }
    const qs = q.toString();
    return request<Paginated<Product>>(`/products${qs ? `?${qs}` : ""}`);
  },

  getFacets: (params?: ProductQuery) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
      });
    }
    const qs = q.toString();
    return request<FacetResponse>(`/products/facets${qs ? `?${qs}` : ""}`);
  },

  suggestProducts: (q: string) =>
    request<SuggestResult[]>(`/products/suggest?q=${encodeURIComponent(q)}`),

  getProduct: (id: number) => request<any>(`/products/${id}`),
  getRelatedProducts: (id: number, limit = 8) =>
    request<Product[]>(`/products/${id}/related?limit=${limit}`),
  getCategories: () => request<any[]>("/categories"),

  /* ---------- Wishlist ---------- */

  getWishlist: () => request<any[]>("/wishlist"),
  addWishlist: (productId: number) =>
    request("/wishlist", {
      method: "POST",
      body: JSON.stringify({ product_id: productId }),
    }),
  removeWishlist: (productId: number) =>
    request(`/wishlist/${productId}`, { method: "DELETE" }),
  mergeWishlist: (productIds: number[]) =>
    request("/wishlist/merge", {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),

  /* ---------- Notifications ---------- */

  getNotifications: (params?: {
    unread?: "1";
    page?: number;
    per_page?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.unread) q.set("unread", params.unread);
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    const qs = q.toString();
    return request<{
      items: Array<{
        id: number;
        user_id: number;
        type: string;
        title: string;
        body: string;
        link: string;
        meta: Record<string, any>;
        is_read: boolean;
        created_at: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  getUnreadNotificationCount: () =>
    request<{ unread: number }>("/notifications/unread-count"),

  markNotificationRead: (id: number) =>
    request(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    request("/notifications/read-all", { method: "PATCH" }),

  deleteNotification: (id: number) =>
    request(`/notifications/${id}`, { method: "DELETE" }),

  /* ---------- Cart recovery ---------- */

  syncCart: (
    items: Array<{
      product_id: number;
      name: string;
      price: number;
      quantity: number;
      size: string;
      image?: string;
    }>,
  ) =>
    request<{ ok: boolean; count: number }>("/cart/sync", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  getRecoveredCart: (token: string) =>
    request<{
      cart: {
        id: number;
        user_id: number;
        items: Array<{
          product_id: number;
          name: string;
          price: number;
          quantity: number;
          size: string;
          image?: string;
        }>;
        item_count: number;
        subtotal: number;
      };
    }>(`/cart/recover/${token}`),

  /* ---------- Bulk CSV ---------- */

  adminExportProductsCsv: () =>
    request<Blob>("/admin/products/export.csv", { raw: true }),

  adminDownloadProductsTemplate: () =>
    request<Blob>("/admin/products/template.csv", { raw: true }),

  adminImportProductsCsv: (file: File, opts: { dry?: boolean } = {}) => {
    const fd = new FormData();
    fd.append("file", file);
    const q = opts.dry ? "?dry=1" : "";
    return request<{
      dry_run: boolean;
      total: number;
      created: number;
      updated: number;
      failed: number;
      errors: Array<{ row: number; message: string }>;
      preview: Array<{
        row: number;
        action: "create" | "update";
        id?: number;
        name: string;
      }>;
    }>(`/admin/products/import${q}`, {
      method: "POST",
      body: fd,
    });
  },

  /* ---------- Contact ---------- */

  contact: (data: { name: string; email: string; message: string }) =>
    request("/contact", { method: "POST", body: JSON.stringify(data) }),

  /* ---------- Orders ---------- */

  createOrder: (data: any) =>
    request<any>("/orders", { method: "POST", body: JSON.stringify(data) }),
  myOrders: () => request<any[]>("/orders/my"),
  myOrder: (id: number) => request<any>(`/orders/my/${id}`),
  downloadInvoice: (id: number) =>
    request<Blob>(`/orders/my/${id}/invoice`, { raw: true }),
  validateCoupon: (code: string, subtotal: number) =>
    request<any>("/orders/validate-coupon", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    }),

  // Week 3 — order lifecycle
  getOrder: (id: number) => request<any>(`/orders/${id}`),
  getOrderEvents: (id: number) =>
    request<
      Array<{
        id: number;
        order_id: number;
        status: string;
        note: string;
        created_by: number | null;
        created_at: string;
      }>
    >(`/orders/${id}/events`),
  cancelOrder: (id: number) =>
    request<any>(`/orders/${id}/cancel`, { method: "PATCH" }),

  /* ---------- Payments ---------- */

  createPaymentIntent: (amount: number) =>
    request<any>("/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  confirmPayment: (payment_id: string) =>
    request<any>("/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ payment_id }),
    }),
  createUpiIntent: (amount: number, vpa: string) =>
    request<any>("/payments/upi/create", {
      method: "POST",
      body: JSON.stringify({ amount, vpa }),
    }),
  confirmUpiPayment: (payment_id: string) =>
    request<any>("/payments/upi/confirm", {
      method: "POST",
      body: JSON.stringify({ payment_id }),
    }),

  /* ---------- Reviews ---------- */

  getReviews: (productId: number) =>
    request<any[]>(`/reviews/product/${productId}`),
  getProductReviews: (
    productId: number,
    params?: { sort?: string; page?: number; per_page?: number },
  ) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
      });
    }
    const qs = q.toString();
    return request<any>(`/reviews/product/${productId}${qs ? `?${qs}` : ""}`);
  },
  getMyReview: (productId: number) =>
    request<any>(`/reviews/product/${productId}/mine`),
  createReview: (data: any) =>
    request("/reviews", { method: "POST", body: JSON.stringify(data) }),
  updateReview: (
    id: number,
    data: { rating?: number; title?: string; body?: string },
  ) =>
    request<any>(`/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteReview: (id: number) => request(`/reviews/${id}`, { method: "DELETE" }),

  /* ---------- Uploads ---------- */

  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return request<{ url: string; path: string }>("/upload", {
      method: "POST",
      body: fd,
    });
  },
  uploadImages: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("images[]", f));
    return request<{ paths: string[] }>("/upload/multiple", {
      method: "POST",
      body: fd,
    });
  },

  /* ---------- Admin ---------- */

  adminDashboard: () => request<any>("/admin/dashboard"),
  adminMessages: () => request<any[]>("/admin/messages"),
  adminMarkRead: (id: number) =>
    request(`/admin/messages/${id}/read`, { method: "PATCH" }),
  adminOrders: () => request<any[]>("/admin/orders"),
  adminUpdateOrder: (id: number, data: any) =>
    request(`/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  adminDownloadInvoice: (id: number) =>
    request<Blob>(`/admin/orders/${id}/invoice`, { raw: true }),
  adminCreateProduct: (data: any) =>
    request("/admin/products", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateProduct: (id: number, data: any) =>
    request(`/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  adminDeleteProduct: (id: number) =>
    request(`/admin/products/${id}`, { method: "DELETE" }),
  adminToggleProductActive: (id: number, is_active: boolean) =>
    request(`/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),
  adminCategories: () => request<any[]>("/admin/categories"),
  adminCreateCategory: (data: any) =>
    request("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminUpdateCategory: (id: number, data: any) =>
    request(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  adminDeleteCategory: (id: number) =>
    request(`/admin/categories/${id}`, { method: "DELETE" }),
  adminCoupons: () => request<any[]>("/admin/coupons"),
  adminCreateCoupon: (data: any) =>
    request("/admin/coupons", { method: "POST", body: JSON.stringify(data) }),
  adminDeleteCoupon: (id: number) =>
    request(`/admin/coupons/${id}`, { method: "DELETE" }),

  /* ---------- Misc ---------- */

  post: (path: string, body?: any) =>
    request(path.startsWith("/") ? path : `/${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /* ---------- Analytics ---------- */

  adminAnalyticsSummary: (params?: {
    days?: number;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<any>(`/admin/analytics/summary${qs ? `?${qs}` : ""}`);
  },

  adminAnalyticsRevenueSeries: (params?: {
    days?: number;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<{
      series: Array<{ date: string; revenue: number; orders: number }>;
    }>(`/admin/analytics/revenue-series${qs ? `?${qs}` : ""}`);
  },

  adminAnalyticsTopProducts: (params?: {
    days?: number;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{
      products: Array<{
        product_id: number;
        name: string;
        image: string;
        units: number;
        revenue: number;
      }>;
    }>(`/admin/analytics/top-products${qs ? `?${qs}` : ""}`);
  },

  adminAnalyticsTopCustomers: (params?: {
    days?: number;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{
      customers: Array<{
        user_id: number | null;
        name: string;
        email: string;
        orders: number;
        revenue: number;
      }>;
    }>(`/admin/analytics/top-customers${qs ? `?${qs}` : ""}`);
  },

  adminAnalyticsStatusBreakdown: (params?: {
    days?: number;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<{
      statuses: Array<{ status: string; count: number }>;
    }>(`/admin/analytics/status-breakdown${qs ? `?${qs}` : ""}`);
  },

  adminAnalyticsCategoryPerformance: (params?: {
    days?: number;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<{
      categories: Array<{ category: string; revenue: number; units: number }>;
    }>(`/admin/analytics/category-performance${qs ? `?${qs}` : ""}`);
  },
};

export const uploadImage = (file: File) => api.uploadImage(file);
export const uploadImages = (files: File[]) =>
  api.uploadImages(files).then((r) => r.paths);
export const getProducts = (params?: ProductQuery) => api.getProducts(params);

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { raw?: boolean } = {},
): Promise<T> {
  const cleaned = path.replace(/^\/api/, "");
  return request<T>(cleaned.startsWith("/") ? cleaned : `/${cleaned}`, options);
}
