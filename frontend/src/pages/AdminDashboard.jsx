import React, { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Receipt, Coins, Package, Clock, ChefHat, HandPlatter, CheckCircle2, XCircle, Users, Tag as TagIcon } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import api from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const STATUS_META = {
  pending:   { label: "Novo",         color: "#A0522D", icon: Clock },
  kitchen:   { label: "Na cozinha",   color: "#D97706", icon: ChefHat },
  ready:     { label: "Aguardando garçom", color: "#205427", icon: HandPlatter },
  delivered: { label: "Entregue",     color: "#303226", icon: CheckCircle2 },
  completed: { label: "Concluído",    color: "#0F766E", icon: CheckCircle2 },
  cancelled: { label: "Cancelado",    color: "#6B7280", icon: XCircle },
};

function KpiCard({ icon: Icon, label, value, sublabel, color = "#A0522D", testid }) {
  return (
    <div className="bg-white border border-[#EAE6DF] rounded-2xl p-5" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B7280]">{label}</div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2F3538] mt-1">{value}</div>
          {sublabel && <div className="text-xs text-[#6B7280] mt-1">{sublabel}</div>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a`, color }}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { tf } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try { const r = await api.get("/analytics"); setData(r.data); } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading || !data) return <div className="text-[#6B7280]">Carregando dashboard...</div>;

  const brl = (v) => `R$ ${Number(v || 0).toFixed(2)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="dashboard-title">Visão do negócio</h1>
          <p className="text-sm text-[#6B7280]">Atualização automática a cada 30s</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Coins} label="Receita hoje" value={brl(data.today.revenue)}
                 sublabel={`${data.today.orders} pedidos`} color="#205427" testid="kpi-revenue-today" />
        <KpiCard icon={ShoppingBag} label="Pedidos hoje" value={data.today.orders}
                 sublabel={`Ticket médio ${brl(data.avg_ticket_today)}`} color="#A0522D" testid="kpi-orders-today" />
        <KpiCard icon={TrendingUp} label="Receita semana" value={brl(data.week.revenue)}
                 sublabel={`${data.week.orders} pedidos`} color="#D97706" testid="kpi-revenue-week" />
        <KpiCard icon={Receipt} label="Receita mês" value={brl(data.month.revenue)}
                 sublabel={`${data.month.orders} pedidos`} color="#303226" testid="kpi-revenue-month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Revenue last 7 days */}
        <div className="lg:col-span-2 bg-white border border-[#EAE6DF] rounded-2xl p-5" data-testid="chart-7days">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-[#2F3538]">Receita — últimos 7 dias</h2>
            <span className="text-xs text-[#6B7280]">{data.week.orders} pedidos na semana</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.last_7_days} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #EAE6DF", borderRadius: 12 }}
                formatter={(value, name) => name === "revenue" ? [brl(value), "Receita"] : [value, "Pedidos"]}
              />
              <Line type="monotone" dataKey="revenue" stroke="#A0522D" strokeWidth={2.5} dot={{ r: 4, fill: "#A0522D" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status board */}
        <div className="bg-white border border-[#EAE6DF] rounded-2xl p-5" data-testid="status-board">
          <h2 className="font-heading font-semibold text-[#2F3538] mb-3">Pedidos por status</h2>
          <div className="space-y-2">
            {Object.entries(STATUS_META).map(([key, m]) => {
              const Ico = m.icon;
              return (
                <div key={key} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#FAF8F5]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${m.color}1a`, color: m.color }}>
                    <Ico size={14} />
                  </div>
                  <span className="flex-1 text-sm text-[#2F3538]">{m.label}</span>
                  <span className="font-heading font-bold text-[#2F3538]" data-testid={`status-count-${key}`}>{data.by_status[key] || 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Top products */}
        <div className="bg-white border border-[#EAE6DF] rounded-2xl p-5" data-testid="top-products">
          <h2 className="font-heading font-semibold text-[#2F3538] mb-3">Top 5 — últimos 30 dias</h2>
          {data.top_products.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">Ainda sem dados suficientes</p>
          ) : (
            <ul className="space-y-2">
              {data.top_products.map((p, i) => {
                const maxQty = data.top_products[0]?.qty || 1;
                const pct = (p.qty / maxQty) * 100;
                return (
                  <li key={p.product_id || i} className="relative">
                    <div className="flex items-center gap-3 relative z-10 p-2">
                      <span className="w-6 h-6 rounded-full bg-[#A0522D] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-[#2F3538] truncate">{tf(p.name)}</span>
                      <span className="text-xs text-[#6B7280] shrink-0">{p.qty}× · {brl(p.revenue)}</span>
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-[#A0522D]/8" style={{ width: `${pct}%` }} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Hourly */}
        <div className="bg-white border border-[#EAE6DF] rounded-2xl p-5" data-testid="hourly-chart">
          <h2 className="font-heading font-semibold text-[#2F3538] mb-3">Pedidos por hora — hoje</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#6B7280" }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #EAE6DF", borderRadius: 12 }}
                labelFormatter={(h) => `${h}h`}
                formatter={(v, n) => n === "orders" ? [v, "Pedidos"] : [v, n]}
              />
              <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                {data.hourly.map((_, idx) => (
                  <Cell key={idx} fill={data.hourly[idx].orders > 0 ? "#A0522D" : "#EAE6DF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Catalog snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6" data-testid="catalog-snapshot">
        <KpiCard icon={Package} label="Pratos ativos" value={data.catalog.active_products}
                 sublabel={`de ${data.catalog.total_products} total`} color="#A0522D" testid="kpi-products" />
        <KpiCard icon={TagIcon} label="Tags" value={data.catalog.tags} color="#205427" testid="kpi-tags" />
        <KpiCard icon={Users} label="Equipe" value={data.catalog.staff} color="#303226" testid="kpi-staff" />
        <KpiCard icon={Clock} label="Em aberto agora"
                 value={(data.by_status.pending || 0) + (data.by_status.kitchen || 0) + (data.by_status.ready || 0)}
                 sublabel="Pedidos não entregues" color="#D97706" testid="kpi-open" />
      </div>
    </div>
  );
}
