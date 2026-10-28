import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import FastOrder from "./pages/FastOrder";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminProductEdit from "./pages/admin/AdminProductEdit";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminGroups from "./pages/admin/AdminGroups";
import AdminCatalog from "./pages/admin/AdminCatalog";
import AdminBulkUpload from "./pages/admin/AdminBulkUpload";
import AdminReports from "./pages/admin/AdminReports";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminChat from "./pages/admin/AdminChat";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSellerForm from "./pages/admin/AdminSellerForm";
import ChangePassword from "./pages/admin/ChangePassword";

function ProtectedRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function AdminRoute({ children }) {
    const { user, isAdmin } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin()) return <Navigate to="/dashboard" replace />;
    return children;
}

function RoleRedirect() {
    const { user, isAdmin } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return (
        <Navigate to={isAdmin() ? "/admin/dashboard" : "/dashboard"} replace />
    );
}

export default function App() {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/admin/change-password"
                    element={<ChangePassword />}
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <ProductList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products/:id"
                    element={
                        <ProtectedRoute>
                            <ProductDetail />
                        </ProtectedRoute>
                    }
                />
                <Route path="/fast-order" element={<ProtectedRoute><FastOrder /></ProtectedRoute>} />
                <Route
                    path="/cart"
                    element={
                        <ProtectedRoute>
                            <Cart />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/sellers"
                    element={
                        <AdminRoute>
                            <AdminSellers />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/sellers/new"
                    element={
                        <AdminRoute>
                            <AdminSellerForm />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/sellers/:id/edit"
                    element={
                        <AdminRoute>
                            <AdminSellerForm />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/checkout"
                    element={
                        <ProtectedRoute>
                            <Checkout />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute>
                            <OrderHistory />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders/:id"
                    element={
                        <ProtectedRoute>
                            <OrderDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/wishlist"
                    element={
                        <ProtectedRoute>
                            <Wishlist />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/chat"
                    element={
                        <ProtectedRoute>
                            <Chat />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/terms"
                    element={
                        <ProtectedRoute>
                            <Terms />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/contact"
                    element={
                        <ProtectedRoute>
                            <Contact />
                        </ProtectedRoute>
                    }
                />

                {/* ---- Admin routes ---- */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/orders"
                    element={
                        <AdminRoute>
                            <AdminOrders />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/products"
                    element={
                        <AdminRoute>
                            <AdminProducts />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/products/new"
                    element={
                        <AdminRoute>
                            <AdminProductForm />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/products/:id/edit"
                    element={
                        <AdminRoute>
                            <AdminProductEdit />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/catalog"
                    element={
                        <AdminRoute>
                            <AdminCatalog />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/pricing"
                    element={
                        <AdminRoute>
                            <AdminPricing />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/admin/groups"
                    element={
                        <AdminRoute>
                            <AdminGroups />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/bulk-upload"
                    element={
                        <AdminRoute>
                            <AdminBulkUpload />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/reports"
                    element={
                        <AdminRoute>
                            <AdminReports />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/broadcast"
                    element={
                        <AdminRoute>
                            <AdminBroadcast />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/chat"
                    element={
                        <AdminRoute>
                            <AdminChat />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/settings"
                    element={
                        <AdminRoute>
                            <AdminSettings />
                        </AdminRoute>
                    }
                />

                {/* catch-all MUST be last */}
                <Route path="*" element={<RoleRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}
