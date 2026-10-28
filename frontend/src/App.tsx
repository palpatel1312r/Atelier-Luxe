import { useEffect, useState, useCallback, useRef } from "react";
import OAuthCallback from "./components/OAuthCallback";
import AdminCartsRecovery from "./components/admin/AdminCartsRecovery";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import AdminProductsImportExport from "./components/admin/AdminProductsImportExport";
import Header from "./components/Header";
import ProductCard from "./components/ProductCard";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import Confirmation from "./components/Confirmation";
import Wishlist from "./components/Wishlist";
import Login from "./components/Login";
import Register from "./components/Register";
import Contact from "./components/Contact";
import MyOrders from "./components/MyOrders";
import Profile from "./components/Profile";
import OrderDetail from "./components/OrderDetail";
import ForgotPassword from "./components/ForgotPassword";
import NotFound from "./components/NotFound";
import AdminReviews from "./components/admin/AdminReviews";
import AdminUsers from "./components/admin/AdminUsers";
import AdminCoupons from "./components/admin/AdminCoupons";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminProducts from "./components/admin/AdminProducts";
import AdminProductForm from "./components/admin/AdminProductForm";
import CartRecovery from "./components/CartRecovery";
import AdminOrders from "./components/admin/AdminOrders";
import AdminMessages from "./components/admin/AdminMessages";
import AdminCategories from "./components/admin/AdminCategories";
import { RequireAuth, RequireAdmin } from "./components/RequireAuth";
import Filters from "./components/Filters";
import ShopFilters from "./components/ShopFilters";
import ActiveFilterPills from "./components/ActiveFilterPills";
import {
  Category,
  Product,
  ProductQuery,
  Paginated,
  FacetResponse,
} from "./types";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import { useToast } from "./context/ToastContext";
import { apiFetch, api } from "./lib/api";
import Loader from "./components/Loader";

export default function App() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const {
    items: cartItems,
    buyNowItem,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setBuyNow,
    checkoutItems,
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") ?? "";

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (q) next.set("search", q);
          else next.delete("search");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [productsData, setProductsData] = useState<Paginated<Product> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFacetsLoading(true);

    const params: ProductQuery = {
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      min_price: searchParams.get("min_price") || undefined,
      max_price: searchParams.get("max_price") || undefined,
      colors: searchParams.get("colors") || undefined,
      sizes: searchParams.get("sizes") || undefined,
      in_stock: searchParams.get("in_stock") as "1" | undefined,
    };

    api
      .getFacets(params)
      .then((data) => {
        if (!cancelled) setFacets(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFacetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const runFetch = () => {
      const params: ProductQuery = {
        category: searchParams.get("category") || undefined,
        search: searchParams.get("search") || undefined,
        min_price: searchParams.get("min_price") || undefined,
        max_price: searchParams.get("max_price") || undefined,
        colors: searchParams.get("colors") || undefined,
        sizes: searchParams.get("sizes") || undefined,
        in_stock: searchParams.get("in_stock") as "1" | undefined,
        sort: (searchParams.get("sort") as any) || undefined,
        page: Number(searchParams.get("page")) || 1,
        per_page: 24,
      };

      api
        .getProducts(params)
        .then((data) => {
          if (!cancelled) setProductsData(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message || "Failed to load products");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    const hasSearch = !!searchParams.get("search");
    if (hasSearch) {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
      searchTimer.current = window.setTimeout(runFetch, 300);
    } else {
      runFetch();
    }

    return () => {
      cancelled = true;
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [searchParams]);

  const handleLogoClick = () => {
    setSearchParams({}, { replace: false });
    navigate("/");
  };

  const handleSelectProduct = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const requireLogin = () => {
    toast.info("Please log in to continue.");
    navigate("/login", { state: { from: location.pathname } });
  };

  const handleAddToCart = (product: Product, size: string) => {
    if (!user) return requireLogin();
    addItem(product, size, 1);
    toast.success(`${product.name} added to cart.`);
  };

  const handleBuyNow = (product: Product, size: string) => {
    if (!user) return requireLogin();
    setBuyNow({ product, quantity: 1, selectedSize: size });
    navigate("/checkout");
  };

  const handleUpdateQuantity = (
    productId: number,
    size: string,
    quantity: number,
  ) => {
    updateQuantity(productId, size, quantity);
  };

  const handleRemoveItem = (productId: number, size: string) => {
    removeItem(productId, size);
  };

  const openCheckoutFromCart = () => {
    if (cartItems.length === 0) {
      toast.info("Your cart is empty.");
      return;
    }
    setBuyNow(null);
    navigate("/checkout");
  };

  const handleConfirmOrder = async (form: any) => {
    const itemsToOrder = buyNowItem ? [buyNowItem] : cartItems;
    try {
      const order = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: itemsToOrder.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            size: item.selectedSize,
            name: item.product.name,
            price: item.product.price,
          })),
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone || "",
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zipCode,
          country: form.country,
          coupon_code: form.coupon_code,
          payment_method: form.payment_method,
          payment_id: form.payment_id,
        }),
      });
      clearCart();
      setBuyNow(null);
      navigate("/confirmation", { state: { order } });
    } catch (err: any) {
      const msg = err.message || "Failed to place order. Please try again.";
      toast.error(msg);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <Header
        cartItems={cartItems}
        onCartClick={() => navigate("/cart")}
        onLogoClick={handleLogoClick}
        onWishlistClick={() => navigate("/wishlist")}
        onLoginClick={() => navigate("/login")}
        onRegisterClick={() => navigate("/register")}
        onLogout={handleLogout}
        onContactClick={() => navigate("/contact")}
        onAdminClick={() => navigate("/admin")}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <ShopPage
                categories={categories}
                loading={loading}
                error={error}
                productsData={productsData}
                facets={facets}
                facetsLoading={facetsLoading}
                onSelectProduct={handleSelectProduct}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
              />
            }
          />
          <Route path="/cart/recover/:token" element={<CartRecovery />} />
          <Route
            path="/product/:id"
            element={
              <ProductDetailRoute
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
                onContinueShopping={() => navigate("/")}
              />
            }
          />

          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout
                  items={checkoutItems}
                  onConfirm={handleConfirmOrder}
                  onBack={() => {
                    if (buyNowItem) {
                      setBuyNow(null);
                      navigate(-1);
                    } else {
                      navigate("/cart");
                    }
                  }}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/confirmation"
            element={<Confirmation onContinueShopping={() => navigate("/")} />}
          />

          <Route
            path="/wishlist"
            element={
              <RequireAuth>
                <Wishlist
                  onSelect={handleSelectProduct}
                  onContinueShopping={() => navigate("/")}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/login"
            element={
              <Login
                onSuccess={() => navigate("/")}
                onGoToRegister={() => navigate("/register")}
                onBack={() => navigate("/")}
              />
            }
          />

          <Route
            path="/register"
            element={
              <Register
                onSuccess={() => navigate("/")}
                onGoToLogin={() => navigate("/login")}
                onBack={() => navigate("/")}
              />
            }
          />

          <Route path="/oauth/callback" element={<OAuthCallback />} />

          <Route
            path="/contact"
            element={<Contact onBack={() => navigate("/")} />}
          />

          <Route
            path="/orders"
            element={
              <RequireAuth>
                <MyOrders />
              </RequireAuth>
            }
          />

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
            <Route
              path="products/import-export"
              element={<AdminProductsImportExport />}
            />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route
              path="carts/recovery"
              element={<AdminCartsRecovery />}
            />{" "}
            {/* ← ADD */}
            <Route path="orders" element={<AdminOrders />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="coupons" element={<AdminCoupons />} />
          </Route>

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RequireAuth>
                <OrderDetail />
              </RequireAuth>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<NotFound />} />
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
              <Link
                to="/contact"
                className="hover:text-amber-800 transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Shop page
   ============================================================ */
function ShopPage({
  categories,
  loading,
  error,
  productsData,
  facets,
  facetsLoading,
  onSelectProduct,
  searchParams,
  setSearchParams,
}: {
  categories: Category[];
  loading: boolean;
  error: string | null;
  productsData: Paginated<Product> | null;
  facets: FacetResponse | null;
  facetsLoading: boolean;
  onSelectProduct: (product: Product) => void;
  searchParams: URLSearchParams;
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void;
}) {
  const activeCategory = searchParams.get("category") ?? "All";

  const setCategory = (name: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (name && name !== "All") next.set("category", name);
        else next.delete("category");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const setSort = (sort: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (sort) next.set("sort", sort);
        else next.delete("sort");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const setPage = (page: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (page > 1) next.set("page", String(page));
        else next.delete("page");
        return next;
      },
      { replace: false },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAll = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        const search = prev.get("search");
        if (search) next.set("search", search);
        return next;
      },
      { replace: true },
    );
  };

  const updateParams = (
    updater: (prev: URLSearchParams) => URLSearchParams,
  ) => {
    setSearchParams(updater, { replace: true });
  };

  const products = productsData?.items ?? [];
  const totalPages = productsData?.total_pages ?? 1;
  const currentPage = productsData?.page ?? 1;
  const total = productsData?.total ?? 0;
  const sort = searchParams.get("sort") ?? "";

  const pills: { label: string; onRemove: () => void }[] = [];

  const cat = searchParams.get("category");
  if (cat && cat !== "All") {
    pills.push({
      label: `Category: ${cat}`,
      onRemove: () =>
        updateParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("category");
          next.delete("page");
          return next;
        }),
    });
  }

  const colors = (searchParams.get("colors") ?? "").split(",").filter(Boolean);
  colors.forEach((c) => {
    pills.push({
      label: `Color: ${c}`,
      onRemove: () =>
        updateParams((prev) => {
          const next = new URLSearchParams(prev);
          const remaining = colors.filter((x) => x !== c);
          if (remaining.length) next.set("colors", remaining.join(","));
          else next.delete("colors");
          next.delete("page");
          return next;
        }),
    });
  });

  const sizes = (searchParams.get("sizes") ?? "").split(",").filter(Boolean);
  sizes.forEach((s) => {
    pills.push({
      label: `Size: ${s}`,
      onRemove: () =>
        updateParams((prev) => {
          const next = new URLSearchParams(prev);
          const remaining = sizes.filter((x) => x !== s);
          if (remaining.length) next.set("sizes", remaining.join(","));
          else next.delete("sizes");
          next.delete("page");
          return next;
        }),
    });
  });

  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");
  if (minPrice || maxPrice) {
    pills.push({
      label: `Price: ${minPrice ? `₹${minPrice}` : "0"} – ${maxPrice ? `₹${maxPrice}` : "∞"}`,
      onRemove: () =>
        updateParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("min_price");
          next.delete("max_price");
          next.delete("page");
          return next;
        }),
    });
  }

  if (searchParams.get("in_stock") === "1") {
    pills.push({
      label: "In stock only",
      onRemove: () =>
        updateParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("in_stock");
          next.delete("page");
          return next;
        }),
    });
  }
  if (searchParams.get("on_sale") === "1") {
    pills.push({
      label: "On sale",
      onRemove: () =>
        updateParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("on_sale");
          next.delete("page");
          return next;
        }),
    });
  }

  const activeFilterCount = pills.length;

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
          Specialty garments crafted from the world's finest materials, made to
          last a lifetime.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-10 sm:mb-14">
        <button
          onClick={() => setCategory("All")}
          className={`px-4 sm:px-5 py-2 text-xs sm:text-sm tracking-wider uppercase transition-colors border-b-2 ${
            activeCategory === "All"
              ? "border-amber-800 text-amber-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.slug || cat.name)}
            className={`px-4 sm:px-5 py-2 text-xs sm:text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeCategory.toLowerCase() ===
              (cat.slug || cat.name).toLowerCase()
                ? "border-amber-800 text-amber-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex gap-10">
        <Filters
          facets={facets}
          loading={facetsLoading}
          searchParams={searchParams}
          onUpdate={updateParams}
          onClearAll={clearAll}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-6">
            <ShopFilters
              facets={facets}
              loading={facetsLoading}
              searchParams={searchParams}
              onUpdate={updateParams}
              onClearAll={clearAll}
              activeCount={activeFilterCount}
            />

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-stone-500">
                {loading
                  ? "Loading…"
                  : `${total} ${total === 1 ? "product" : "products"}`}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
              >
                <option value="">Featured</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="on_sale_first">On sale first</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          <ActiveFilterPills pills={pills} />

          {loading && (
            <div className="text-center py-16 text-stone-500">
              Loading collection...
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-red-600">
              Failed to load products: {error}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              No products match your filters.
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="block mx-auto mt-4 text-amber-800 hover:text-amber-900 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 sm:gap-10">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="px-3 py-1.5 text-sm border border-stone-200 rounded disabled:opacity-40 hover:border-amber-800"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-stone-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    className="px-3 py-1.5 text-sm border border-stone-200 rounded disabled:opacity-40 hover:border-amber-800"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Product detail route wrapper
   ============================================================ */
function ProductDetailRoute({
  onAddToCart,
  onBuyNow,
}: {
  onAddToCart: (product: Product, size: string) => void;
  onBuyNow: (product: Product, size: string) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getProduct(Number(id))
      .then((data) => setProduct(data))
      .catch((e) => setError(e.message || "Product not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader label="Loading product…" />;

  if (error || !product) {
    return (
      <div className="text-center py-16 text-stone-500">
        <p className="mb-4">{error ?? "Product not found"}</p>
        <button
          onClick={() => navigate("/")}
          className="text-amber-800 hover:text-amber-900 underline"
        >
          Back to shop
        </button>
      </div>
    );
  }

  return (
    <ProductDetail
      product={product}
      onAddToCart={onAddToCart}
      onBuyNow={onBuyNow}
      onBack={() => navigate("/")}
      onProductSelect={(p) => navigate(`/product/${p.id}`)}
    />
  );
}
