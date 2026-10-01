export interface Product {
  id: number;
  name: string;
  category: string;
  category_id?: number | null;
  price: number;
  description: string;
  details: string[];
   images?: string[];       // NEW
  is_active?: boolean; 
  color: string;
  sizes: string[];
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

export type ViewMode =
  | 'shop'
  | 'detail'
  | 'cart'
  | 'checkout'
  | 'confirmation'
  | 'wishlist'
  | 'login'
  | 'register'
  | 'contact'
  | 'admin';