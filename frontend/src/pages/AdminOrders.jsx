import React, { useEffect, useMemo, useState } from "react";
import { ChefHat, HandPlatter, CheckCircle2, Clock, RefreshCw, Coins, CircleDollarSign, X } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const COLUMNS = [
  { key: "pending",   label: "Novo",            color: "#A0522D", next: "kitchen",   icon: Clock },
  { key: "kitchen",   label: "Na cozinha",      color: "#D97706", next: "ready",     icon: ChefHat },
  { key: "ready",     label: "Aguardando garçom", color: "#205427", next: "delivered", icon: HandPlatter },
  { key: "delivered", label: "Entregue",        color: "#303226", next: "completed", icon: CheckCircle2 },
];

export default function AdminOrders() {
  const { tf } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const reload = async () => {
    try {
      const { data } = await api.get("/orders", { params: { limit: 200 } });
      setOrders(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 6000); // auto refresh every 6s
    return () => clearInterval(t);
  }, []);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    for (const o of orders) if (map[o.status]) map[o.status].push(o);
    return map;
  }, [orders]);

  const advance = async (order, nextStatus) => {
    try {
      await api.patch(`/orders/${order.id}/status`, { status: nextStatus });
      toast.success(`Pedido ${order.code} → ${COLUMNS.find(c => c.key === nextStatus)?.label || nextStatus}`);
      reload();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const cancel = async (order) => {
    if (!window.confirm(`Cancelar pedido ${order.code}?`)) return;
    try { await api.patch(`/orders/${order.id}/status`, { status: "cancelled" }); toast.success("Cancelado"); reload(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="orders-title">Pedidos</h1>
          <p className="text-sm text-[#6B7280]">Atualização automática a cada 6s · {orders.length} pedidos</p>
        </div>
        <button onClick={reload} className="border-2 border-[#A0522D] text-[#A0522D] hover:bg-[#A0522D]/5 rounded-xl px-4 py-2 font-medium inline-flex items-center gap-2" data-testid="refresh-orders-btn">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-[#6B7280]">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="orders-board">
          {COLUMNS.map((col) => {
            const ColIco = col.icon;
            const list = byStatus[col.key] || [];
            return (
              <div key={col.key} className="bg-[#F2EFE9] rounded-2xl p-3 min-h-[300px]" data-testid={`column-${col.key}`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <ColIco size={16} style={{ color: col.color }} />
                  <h2 className="font-heading font-semibold text-[#2F3538] flex-1">{col.label}</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: col.color }}>{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((o) => (
                    <div key={o.id} className="bg-white rounded-xl p-3 border border-[#EAE6DF] shadow-sm" data-testid={`order-${o.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-[#2F3538]">{o.code}</div>
                          <div className="text-xs text-[#6B7280]">
                            {o.customer_name} · {o.mode === "table" ? `Mesa ${o.table_number}` : "Balcão"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#A0522D]">R$ {Number(o.total).toFixed(2)}</div>
                          <div className="text-[10px] text-[#6B7280] mt-0.5 inline-flex items-center gap-0.5">
                            {o.payment_method === "cash" ? <><Coins size={10} />Dinheiro</> : <><CircleDollarSign size={10} />A pagar</>}
                          </div>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-xs text-[#2F3538]">
                        {o.items.slice(0, 4).map((it, i) => (
                          <li key={i} className="truncate">{it.qty}× {tf(it.name)}{it.portion_label ? ` (${tf(it.portion_label)})` : ""}</li>
                        ))}
                        {o.items.length > 4 && <li className="text-[#6B7280]">+{o.items.length - 4} itens</li>}
                      </ul>
                      {o.note && <div className="mt-2 text-[11px] text-[#6B7280] italic">“{o.note}”</div>}
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => setSelected(o)} className="text-xs text-[#A0522D] font-semibold hover:underline" data-testid={`view-${o.id}`}>Ver</button>
                        {col.next && (
                          <button onClick={() => advance(o, col.next)} className="ml-auto text-xs bg-[#205427] text-white hover:bg-[#163818] rounded-lg px-3 py-1.5 font-semibold" data-testid={`advance-${o.id}`}>
                            Avançar →
                          </button>
                        )}
                        <button onClick={() => cancel(o)} className="text-xs text-[#DC2626] hover:underline">×</button>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <div className="text-xs text-[#6B7280] text-center py-6">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="order-detail-modal">
            <div className="border-b border-[#EAE6DF] px-5 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <div className="font-heading text-xl font-bold">{selected.code}</div>
                <div className="text-xs text-[#6B7280]">{selected.customer_name} · {selected.mode === "table" ? `Mesa ${selected.table_number}` : "Balcão"}</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-[#F2EFE9]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <ul className="space-y-1.5 text-sm">
                {selected.items.map((it, i) => (
                  <li key={i} className="flex justify-between"><span>{it.qty}× {tf(it.name)}{it.portion_label ? ` (${tf(it.portion_label)})` : ""}</span><span className="font-semibold">R$ {(it.qty*it.unit_price).toFixed(2)}</span></li>
                ))}
              </ul>
              <div className="flex justify-between pt-3 border-t border-[#EAE6DF]">
                <span className="text-sm text-[#6B7280] uppercase tracking-wider font-semibold">Total</span>
                <span className="font-heading font-bold text-xl text-[#A0522D]">R$ {Number(selected.total).toFixed(2)}</span>
              </div>
              {selected.note && <div className="bg-[#F2EFE9] rounded-xl p-3 text-sm italic text-[#2F3538]">“{selected.note}”</div>}
              <div className="pt-3 border-t border-[#EAE6DF]">
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">Histórico</div>
                <ul className="space-y-1 text-xs">
                  {(selected.status_history || []).map((h, i) => (
                    <li key={i} className="flex justify-between text-[#2F3538]"><span>{h.status}{h.by ? ` · ${h.by}` : ""}</span><span className="text-[#6B7280]">{new Date(h.at).toLocaleTimeString()}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
