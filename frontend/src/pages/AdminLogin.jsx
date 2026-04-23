import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { formatApiErrorDetail } from "../lib/api";
import { Utensils, LockKeyhole } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle";

export default function AdminLogin() {
  const { t } = useI18n();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@cardapio.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user.role === "admin") return <Navigate to="/admin/products" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/admin/products");
    } catch (error) {
      setErr(formatApiErrorDetail(error.response?.data?.detail) || t("login.invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4"><LanguageToggle /></div>
        <div className="bg-white rounded-2xl shadow-xl border border-[#EAE6DF] p-8">
          <div className="flex items-center gap-2 text-[#A0522D] mb-4">
            <Utensils size={18} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">{t("menu.poweredBy")}</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="login-title">
            {t("login.welcome")}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1 mb-6">{t("login.subtitle")}</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                {t("admin.email")}
              </label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#EAE6DF] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#A0522D]"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                {t("admin.password")}
              </label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#EAE6DF] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#A0522D]"
                data-testid="login-password-input"
              />
            </div>
            {err && <div className="text-sm text-[#DC2626]" data-testid="login-error">{err}</div>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-6 py-3 font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="login-submit-btn"
            >
              <LockKeyhole size={16} />
              {loading ? "..." : t("admin.signIn")}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-[#6B7280] mt-4">
          admin@cardapio.com / admin123
        </p>
      </div>
    </div>
  );
}
