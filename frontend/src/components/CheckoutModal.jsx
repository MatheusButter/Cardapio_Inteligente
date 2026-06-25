import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";
import { useCart } from "../cart/CartContext";
import { useStore } from "../store/StoreContext";
import { useI18n } from "../i18n/I18nContext";

export default function CheckoutModal({ open, onClose }) {
  const { items, total, clear } = useCart();
  const { store } = useStore();
  const { tf } = useI18n();
  const [mode, setMode] = useState("table");
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  if (!open) return null;

  const submit = async () => {
    if (!customerName.trim()) { toast.error("Digite seu nome"); return; }
    if (mode === "table" && !tableNumber.trim()) { toast.error("Informe a mesa"); return; }
    setSubmitting(true);
    try {
      const body = {
        customer_name: customerName,
        mode, table_number: mode === "table" ? tableNumber : null,
        note,
        items: items.map((i) => ({
          product_id: i.productId, name: i.name, portion_label: i.portionLabel,
          unit_price: i.price, qty: i.qty,
        })),
      };
      const { data } = await api.post("/orders", body);
      setDone(data);
      clear();
      toast.success(`Pedido ${data.code} enviado!`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="checkout-modal">
        <div className="sticky top-0 bg-white border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-[#2F3538]">Finalizar pedido</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F2EFE9]" data-testid="checkout-close"><X size={18} /></button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#205427]/10 text-[#205427] flex items-center justify-center mb-4">
              <Check size={28} />
            </div>
            <div className="font-heading text-2xl font-bold text-[#2F3538]" data-testid="order-confirm-code">{done.code}</div>
            <p className="text-sm text-[#6B7280] mt-1">Pedido enviado à cozinha</p>
            <div className="mt-6 bg-[#F2EFE9] rounded-xl p-4 text-left">
              <div className="text-xs text-[#6B7280]">Cliente</div>
              <div className="font-semibold text-[#2F3538]">{done.customer_name}</div>
              <div className="text-xs text-[#6B7280] mt-2">Local</div>
              <div className="font-semibold text-[#2F3538]">{done.mode === "table" ? `Mesa ${done.table_number}` : "Retirar no balcão"}</div>
              <div className="text-xs text-[#6B7280] mt-2">Total</div>
              <div className="font-heading font-bold text-xl text-[#A0522D]">R$ {Number(done.total).toFixed(2)}</div>
            </div>
            <p className="text-xs text-[#6B7280] mt-4">
              Acompanhe seu pedido na própria mesa. Pague diretamente no estabelecimento.
            </p>
            <div className="mt-6">
              <button
                onClick={() => { setDone(null); onClose(); }}
                className="w-full bg-[#205427] text-white hover:bg-[#163818] rounded-xl px-6 py-3 font-medium transition-colors"
                data-testid="order-confirm-close-btn"
              >
                Voltar ao cardápio
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Seu nome</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: Ana Silva"
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                  data-testid="checkout-name" autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-2">Onde receber</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMode("table")}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${mode === "table" ? "border-[#A0522D] bg-[#A0522D]/5 text-[#A0522D]" : "border-[#EAE6DF] text-[#6B7280]"}`}
                    data-testid="checkout-mode-table">Na mesa</button>
                  <button type="button" onClick={() => setMode("takeout")}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${mode === "takeout" ? "border-[#A0522D] bg-[#A0522D]/5 text-[#A0522D]" : "border-[#EAE6DF] text-[#6B7280]"}`}
                    data-testid="checkout-mode-takeout">Retirar no balcão</button>
                </div>
              </div>
              {mode === "table" && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Número da mesa</label>
                  <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Ex: 12"
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                    data-testid="checkout-table" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Observações (opcional)</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: sem cebola, ponto bem passado..."
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                  data-testid="checkout-note" />
              </div>
              <div className="bg-[#F2EFE9] rounded-xl p-3 text-sm text-[#2F3538]">
                <div className="font-semibold mb-1">Resumo</div>
                <ul className="space-y-0.5">
                  {items.map((i) => (
                    <li key={i.lineId} className="flex justify-between"><span>{i.qty}× {tf(i.name)}</span><span>R$ {(i.price * i.qty).toFixed(2)}</span></li>
                  ))}
                </ul>
                <div className="mt-2 pt-2 border-t border-[#EAE6DF] flex justify-between font-bold">
                  <span>Total</span><span className="text-[#A0522D]">R$ {total.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#6B7280] text-center">Pagamento será feito diretamente no estabelecimento.</p>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[#EAE6DF] px-6 py-4">
              <button onClick={submit} disabled={submitting}
                className="w-full bg-[#205427] text-white hover:bg-[#163818] rounded-xl px-6 py-3.5 font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="checkout-submit">
                {submitting ? "Enviando..." : "Confirmar pedido"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
