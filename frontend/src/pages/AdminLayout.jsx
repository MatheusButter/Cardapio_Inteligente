import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Package, Tags, QrCode, LogOut, Utensils, ExternalLink, ClipboardList, Users, BookOpen, Settings } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import LanguageToggle from "../components/LanguageToggle";

const navItem = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    isActive ? "bg-[#A0522D] text-white" : "text-[#D1D5DB] hover:bg-white/10"
  }`;

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const role = user?.role || "";
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canManageContent = isAdmin || isManager;          // products, tags, menus, qr, settings
  const canSeeOrders = ["admin","manager","waiter","kitchen","cashier"].includes(role);

  const onLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] grid grid-cols-1 md:grid-cols-12">
      <aside className="md:col-span-3 lg:col-span-2 bg-[#2F3538] md:min-h-screen text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 text-[#A0522D]">
            <Utensils size={18} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">{t("menu.poweredBy")}</span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-white mt-1">{t("admin.dashboard")}</h2>
          {user && (
            <div className="mt-2">
              <p className="text-xs text-[#D1D5DB] truncate">{user.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#A0522D]/20 text-[#E0B98C]">
                {{ admin: "Administrador", manager: "Gerente", waiter: "Garçom", kitchen: "Cozinha", cashier: "Caixa" }[role] || role}
              </span>
            </div>
          )}
        </div>
        <nav className="px-3 space-y-1 flex-1" data-testid="admin-nav">
          {canSeeOrders && (
            <NavLink to="/admin/orders" className={navItem} data-testid="nav-orders">
              <ClipboardList size={18} /> Pedidos
            </NavLink>
          )}
          {canManageContent && (
            <>
              <NavLink to="/admin/products" className={navItem} data-testid="nav-products">
                <Package size={18} /> {t("admin.products")}
              </NavLink>
              <NavLink to="/admin/menus" className={navItem} data-testid="nav-menus">
                <BookOpen size={18} /> Cardápios
              </NavLink>
              <NavLink to="/admin/tags" className={navItem} data-testid="nav-tags">
                <Tags size={18} /> {t("admin.tags")}
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin/staff" className={navItem} data-testid="nav-staff">
              <Users size={18} /> Equipe
            </NavLink>
          )}
          {canManageContent && (
            <>
              <NavLink to="/admin/qr" className={navItem} data-testid="nav-qr">
                <QrCode size={18} /> {t("admin.qr")}
              </NavLink>
              <NavLink to="/admin/settings" className={navItem} data-testid="nav-settings">
                <Settings size={18} /> Configurações
              </NavLink>
            </>
          )}
        </nav>
        <div className="p-4 space-y-2 border-t border-white/10">
          <Link
            to="/" target="_blank"
            className="flex items-center gap-2 text-xs text-[#D1D5DB] hover:text-white"
            data-testid="view-menu-link"
          >
            <ExternalLink size={14} /> Ver cardápio
          </Link>
          <div className="flex items-center justify-between">
            <LanguageToggle />
          </div>
          <button
            onClick={onLogout}
            className="w-full inline-flex items-center gap-2 text-sm text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
            data-testid="logout-btn"
          >
            <LogOut size={16} /> {t("admin.logout")}
          </button>
        </div>
      </aside>
      <main className="md:col-span-9 lg:col-span-10 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
