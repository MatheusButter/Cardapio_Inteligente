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

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">Carregando...</div>;
  if (!user || !["admin","manager","waiter","kitchen","cashier"].includes(user.role)) return <Navigate to="/admin/login" replace />;
  return children;
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
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="menus" element={<AdminMenus />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="qr" element={<AdminQR />} />
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
