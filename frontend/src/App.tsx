import { useEffect, useMemo, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Confirmation from './components/Confirmation';
import Wishlist from './components/Wishlist';
import Login from './components/Login';
import Register from './components/Register';
import Contact from './components/Contact';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminProducts from './components/admin/AdminProducts';
import AdminProductForm from './components/admin/AdminProductForm';
import AdminOrders from './components/admin/AdminOrders';
import AdminMessages from './components/admin/AdminMessages';
import AdminCategories from './components/admin/AdminCategories';
import { RequireAuth, RequireAdmin } from './components/RequireAuth';
import { CartItem, Category, Product } from './types';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { apiFetch } from './lib/api';

const CART_KEY = 'atelier_cart';

export default function App() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [productsData, categoriesData] = await Promise.all([
          apiFetch<Product[]>('/api/products'),
          apiFetch<Category[]>('/api/categories'),
        ]);
        if (!cancelled) {
          setProducts(productsData);
          setCategories(categoriesData);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === 'All' ||
        (p.category ?? '').toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.color ?? '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // ---------- Header handlers ----------
  const handleLogoClick = () => {
    setActiveCategory('All');
    setSearchQuery('');
    navigate('/');
  };

  const handleSelectProduct = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  const handleLogout = () => {
    logout();
    setCartItems([]);
    setBuyNowItem(null);
    try {
      localStorage.removeItem(CART_KEY);
    } catch {}
    navigate('/');
  };

  // ---------- Cart helpers ----------
  const requireLogin = () => {
    toast.info('Please log in to continue.');
    navigate('/login', { state: { from: location.pathname } });
  };

  const handleAddToCart = (product: Product, size: string) => {
    if (!user) return requireLogin();

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedSize === size
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedSize === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedSize: size }];
    });
    toast.success(`${product.name} added to cart.`);
  };

  const handleBuyNow = (product: Product, size: string) => {
    if (!user) return requireLogin();
    setBuyNowItem({ product, quantity: 1, selectedSize: size });
    navigate('/checkout');
  };

  const handleUpdateQuantity = (productId: number, size: string, quantity: number) => {
    if (quantity <= 0) return handleRemoveItem(productId, size);
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.selectedSize === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: number, size: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedSize === size)
      )
    );
  };

  const openCheckoutFromCart = () => {
    if (cartItems.length === 0) {
      toast.info('Your cart is empty.');
      return;
    }
    setBuyNowItem(null);
    navigate('/checkout');
  };

  const handleConfirmOrder = async () => {
    if (!user) return requireLogin();

    const itemsToOrder = buyNowItem ? [buyNowItem] : cartItems;

    try {
      await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: itemsToOrder.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          })),
        }),
      });

      if (buyNowItem) setBuyNowItem(null);
      else setCartItems([]);

      navigate('/confirmation');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to place order. Please try again.';
      if (
        msg.toLowerCase().includes('log in') ||
        msg.includes('401') ||
        msg.toLowerCase().includes('token')
      ) {
        toast.info('Your session expired. Please log in again.');
        navigate('/login');
        return;
      }
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <Header
        cartItems={cartItems}
        onCartClick={() => navigate('/cart')}
        onLogoClick={handleLogoClick}
        onWishlistClick={() => navigate('/wishlist')}
        onLoginClick={() => navigate('/login')}
        onRegisterClick={() => navigate('/register')}
        onLogout={handleLogout}
        onContactClick={() => navigate('/contact')}
        onAdminClick={() => navigate('/admin')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main>
        <Routes>
          {/* ---------- Public ---------- */}
          <Route
            path="/"
            element={
              <ShopPage
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                loading={loading}
                error={error}
                filteredProducts={filteredProducts}
                onSelectProduct={handleSelectProduct}
              />
            }
          />

          <Route
            path="/product/:id"
            element={
              <ProductDetailRoute
                products={products}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            }
          />

          <Route
            path="/cart"
            element={
              <Cart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onCheckout={openCheckoutFromCart}
                onContinueShopping={() => navigate('/')}
              />
            }
          />

          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout
                  items={buyNowItem ? [buyNowItem] : cartItems}
                  onConfirm={handleConfirmOrder}
                  onBack={() => {
                    if (buyNowItem) {
                      setBuyNowItem(null);
                      navigate(-1);
                    } else {
                      navigate('/cart');
                    }
                  }}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/confirmation"
            element={<Confirmation onContinueShopping={() => navigate('/')} />}
          />

          <Route
            path="/wishlist"
            element={
              <RequireAuth>
                <Wishlist
                  onSelect={handleSelectProduct}
                  onContinueShopping={() => navigate('/')}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/login"
            element={
              <Login
                onSuccess={() => navigate('/')}
                onGoToRegister={() => navigate('/register')}
                onBack={() => navigate('/')}
              />
            }
          />

          <Route
            path="/register"
            element={
              <Register
                onSuccess={() => navigate('/')}
                onGoToLogin={() => navigate('/login')}
                onBack={() => navigate('/')}
              />
            }
          />

          <Route path="/contact" element={<Contact onBack={() => navigate('/')} />} />

          {/* ---------- Admin ---------- */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="messages" element={<AdminMessages />} />
          </Route>

          {/* ---------- 404 ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-stone-200 mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-stone-500">
              © {new Date().getFullYear()} Atelier Luxe. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-stone-500">
              <span className="cursor-default">Privacy</span>
              <span className="cursor-default">Terms</span>
              <Link to="/contact" className="hover:text-amber-800 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------- Shop page component ----------
function ShopPage({
  categories,
  activeCategory,
  onCategoryChange,
  loading,
  error,
  filteredProducts,
  onSelectProduct,
}: {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (name: string) => void;
  loading: boolean;
  error: string | null;
  filteredProducts: Product[];
  onSelectProduct: (product: Product) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="text-center mb-12 sm:mb-16">
        <p className="text-xs tracking-[0.3em] text-amber-800 uppercase mb-3">
          Fall / Winter Collection
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-stone-800 mb-4 tracking-wide">
          The Art of Considered Dressing
        </h1>
        <p className="text-stone-500 max-w-xl mx-auto leading-relaxed">
          Specialty garments crafted from the world's finest materials, made to last a lifetime.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-10 sm:mb-14">
        <button
          onClick={() => onCategoryChange('All')}
          className={`px-4 sm:px-5 py-2 text-xs sm:text-sm tracking-wider uppercase transition-colors border-b-2 ${
            activeCategory === 'All'
              ? 'border-amber-800 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.name)}
            className={`px-4 sm:px-5 py-2 text-xs sm:text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeCategory.toLowerCase() === cat.name.toLowerCase()
                ? 'border-amber-800 text-amber-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-16 text-stone-500">Loading collection...</div>
      )}

      {error && (
        <div className="text-center py-16 text-red-600">
          Failed to load products: {error}
          <p className="text-sm text-stone-500 mt-2">
            Make sure the Laravel backend is running on http://127.0.0.1:8000
          </p>
        </div>
      )}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-16 text-stone-500">
          No products match your search.
        </div>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Product detail route wrapper ----------
function ProductDetailRoute({
  products,
  onAddToCart,
  onBuyNow,
}: {
  products: Product[];
  onAddToCart: (product: Product, size: string) => void;
  onBuyNow: (product: Product, size: string) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return <Navigate to="/" replace />;

  const product = products.find((p) => String(p.id) === id);

  if (!product && products.length === 0) {
    return <div className="text-center py-16 text-stone-500">Loading...</div>;
  }

  if (!product) {
    return <Navigate to="/" replace />;
  }

  return (
    <ProductDetail
      product={product}
      onAddToCart={onAddToCart}
      onBuyNow={onBuyNow}
      onBack={() => navigate('/')}
    />
  );
}