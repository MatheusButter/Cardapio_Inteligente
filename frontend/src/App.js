import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";
import { Toaster } from "./components/ui/sonner";
import MenuPage from "./pages/MenuPage";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminProducts from "./pages/AdminProducts";
import AdminTags from "./pages/AdminTags";
import AdminQR from "./pages/AdminQR";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">Carregando...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MenuPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Protected><AdminLayout /></Protected>}>
                <Route index element={<Navigate to="products" replace />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="qr" element={<AdminQR />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </I18nProvider>
  );
}
