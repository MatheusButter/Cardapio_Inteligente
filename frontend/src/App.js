import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";
import { CartProvider } from "./cart/CartContext";
import { StoreProvider } from "./store/StoreContext";
import { Toaster } from "./components/ui/sonner";
import CartDrawer from "./components/CartDrawer";
import MenuPage from "./pages/MenuPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminProducts from "./pages/AdminProducts";
import AdminTags from "./pages/AdminTags";
import AdminQR from "./pages/AdminQR";
import AdminOrders from "./pages/AdminOrders";
import AdminStaff from "./pages/AdminStaff";
import AdminMenus from "./pages/AdminMenus";
import AdminSettings from "./pages/AdminSettings";
import AdminDashboard from "./pages/AdminDashboard";

function Protected({ children, roles }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">Carregando...</div>;
  const ok = user && (!roles || roles.includes(user.role));
  if (!user || !["admin","manager","waiter","kitchen","cashier"].includes(user.role)) return <Navigate to="/admin/login" replace />;
  if (!ok) return <Navigate to="/admin/orders" replace />;
  return children;
}

function AdminIndex() {
  // Send the user to the page their role can actually see
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role === "admin" || user.role === "manager") return <Navigate to="dashboard" replace />;
  return <Navigate to="orders" replace />;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <StoreProvider>
        <CartProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MenuPage />} />
              <Route path="/menu/:id" element={<ProductDetailPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Protected><AdminLayout /></Protected>}>
                <Route index element={<AdminIndex />} />
                <Route path="dashboard" element={<Protected roles={["admin","manager"]}><AdminDashboard /></Protected>} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<Protected roles={["admin","manager"]}><AdminProducts /></Protected>} />
                <Route path="menus" element={<Protected roles={["admin","manager"]}><AdminMenus /></Protected>} />
                <Route path="tags" element={<Protected roles={["admin","manager"]}><AdminTags /></Protected>} />
                <Route path="staff" element={<Protected roles={["admin"]}><AdminStaff /></Protected>} />
                <Route path="settings" element={<Protected roles={["admin","manager"]}><AdminSettings /></Protected>} />
                <Route path="qr" element={<Protected roles={["admin","manager"]}><AdminQR /></Protected>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CartDrawer />
          </BrowserRouter>
          <Toaster position="top-right" />
        </div>
        </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
