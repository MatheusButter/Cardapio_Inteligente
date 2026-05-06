import React, { useState } from "react";
import { ShoppingBag, X, Plus, Minus, MessageCircle, Trash2, Lock } from "lucide-react";
import { useCart } from "../cart/CartContext";
import { useI18n } from "../i18n/I18nContext";
import { useStore } from "../store/StoreContext";
import { resolveImageUrl } from "../lib/api";
import CheckoutModal from "./CheckoutModal";

export default function CartDrawer() {
  const { items, count, total, inc, dec, remove, clear } = useCart();
  const { tf } = useI18n();
  const { store } = useStore();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const storeOpen = store?.is_open !== false;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-[#205427] hover:bg-[#163818] text-white rounded-full shadow-2xl px-5 py-3 inline-flex items-center gap-2 font-semibold transition-all hover:scale-105"
        data-testid="cart-fab"
        aria-label="Open cart"
        style={{ display: count === 0 ? "none" : "inline-flex" }}
      >
        <ShoppingBag size={18} />
        <span>Fechar pedido</span>
        <span className="bg-white text-[#205427] rounded-full text-xs font-bold w-6 h-6 flex items-center justify-center" data-testid="cart-count">
          {count}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-end" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full sm:max-w-md sm:h-screen rounded-t-2xl sm:rounded-none flex flex-col max-h-[90vh] sm:max-h-screen"
            onClick={(e) => e.stopPropagation()}
            data-testid="cart-drawer"
          >
            <div className="border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="font-heading text-xl font-semibold text-[#2F3538]">Seu pedido</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">{count} {count === 1 ? "item" : "itens"}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-[#F2EFE9]" data-testid="cart-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {items.length === 0 ? (
                <div className="text-center text-[#6B7280] py-12">Seu pedido está vazio</div>
              ) : items.map((it) => (
                <div key={it.lineId} className="flex gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF]" data-testid={`cart-item-${it.lineId}`}>
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#F2EFE9]">
                    {it.image_path && <img src={resolveImageUrl(it.image_path)} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-semibold text-[#2F3538] truncate">{tf(it.name)}</div>
                    {it.portionLabel && <div className="text-xs text-[#6B7280]">{tf(it.portionLabel)}</div>}
                    <div className="text-sm font-bold text-[#A0522D] mt-1">R$ {(it.price * it.qty).toFixed(2)}</div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => remove(it.lineId)} className="text-[#DC2626] hover:bg-[#DC2626]/10 rounded p-1" aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                    <div className="inline-flex items-center gap-1 bg-white border border-[#EAE6DF] rounded-full">
                      <button onClick={() => dec(it.lineId)} className="w-7 h-7 inline-flex items-center justify-center text-[#2F3538] hover:bg-[#F2EFE9] rounded-l-full" data-testid={`dec-${it.lineId}`}>
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{it.qty}</span>
                      <button onClick={() => inc(it.lineId)} className="w-7 h-7 inline-flex items-center justify-center text-[#2F3538] hover:bg-[#F2EFE9] rounded-r-full" data-testid={`inc-${it.lineId}`}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[#EAE6DF] p-6 space-y-3 sticky bottom-0 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280] uppercase tracking-wider font-semibold">Total</span>
                  <span className="font-heading font-bold text-2xl text-[#A0522D]" data-testid="cart-total">R$ {total.toFixed(2)}</span>
                </div>
                {storeOpen ? (
                  <button
                    onClick={() => { setOpen(false); setCheckoutOpen(true); }}
                    className="w-full bg-[#205427] text-white hover:bg-[#163818] rounded-xl px-6 py-3.5 font-medium transition-colors inline-flex items-center justify-center gap-2"
                    data-testid="cart-checkout-btn"
                  >
                    <MessageCircle size={16} /> Finalizar pedido
                  </button>
                ) : (
                  <div className="w-full bg-[#6B7280]/10 text-[#6B7280] rounded-xl px-6 py-3.5 font-medium inline-flex items-center justify-center gap-2" data-testid="cart-store-closed">
                    <Lock size={16} /> Loja fechada — pedidos indisponíveis
                  </div>
                )}
                <button onClick={clear} className="w-full text-xs text-[#6B7280] hover:text-[#DC2626] transition-colors">
                  Esvaziar pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
