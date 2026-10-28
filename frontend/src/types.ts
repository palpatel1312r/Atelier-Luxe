export interface Product {
  id: number;
  name: string;
  category: string;
  category_id?: number | null;
  price: number;
  sale_price?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  effective_price: number;
  is_on_sale: boolean;
  discount_pct: number;
  description: string;
  details: string[];
  image?: string;
  images?: string[];
  is_active?: boolean;
  color: string;
  sizes: string[];
  size_prices?: Record<string, number>;
  stock?: number;
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ProductQuery {
  category?: string;
  search?: string;
  min_price?: number | string;
  max_price?: number | string;
  colors?: string;
  sizes?: string;
  in_stock?: "1" | "0";
  on_sale?: "1" | "0";
  featured?: "1" | "0";
  sort?: "newest" | "price_asc" | "price_desc" | "name" | "on_sale_first" | "";
  page?: number;
  per_page?: number;
}

export interface FacetValue {
  name: string;
  count: number;
}

export interface CategoryFacet extends FacetValue {
  category_id?: number | null;
}

export interface FacetResponse {
  categories: CategoryFacet[];
  colors: FacetValue[];
  sizes: FacetValue[];
  price_range: {
    min: number;
    max: number;
  };
  on_sale_count?: number;
}

export interface SuggestResult {
  id: number;
  name: string;
  image?: string;
  price: number;
  category: string;
}

export type ViewMode =
  | "shop"
  | "detail"
  | "cart"
  | "checkout"
  | "confirmation"
  | "wishlist"
  | "login"
  | "register"
  | "contact"
  | "admin";
