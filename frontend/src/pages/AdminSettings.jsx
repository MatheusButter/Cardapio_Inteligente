import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, Save, Phone, MapPin } from "lucide-react";
import api, { formatApiErrorDetail } from "../lib/api";
import { useStore } from "../store/StoreContext";

export default function AdminSettings() {
  const { store, refresh } = useStore();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (store) setForm({ ...store }); }, [store]);

  if (!form) return <div className="text-[#6B7280]">Carregando...</div>;

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/store", {
        is_open: form.is_open,
        store_name: form.store_name,
        whatsapp: form.whatsapp,
        address: form.address,
      });
      await refresh();
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="settings-title">Configurações do estabelecimento</h1>
      <p className="text-sm text-[#6B7280] mt-1">Abertura da loja, dados de contato e checkout</p>

      {/* Open/closed hero card */}
      <div className={`mt-6 rounded-2xl p-5 border-2 transition-colors ${form.is_open ? "bg-[#205427]/5 border-[#205427]/30" : "bg-[#DC2626]/5 border-[#DC2626]/30"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-[10px] font-bold tracking-[0.25em] uppercase ${form.is_open ? "text-[#205427]" : "text-[#DC2626]"}`}>
              {form.is_open ? "Loja aberta" : "Loja fechada"}
            </div>
            <div className="font-heading text-xl font-semibold text-[#2F3538] mt-1">
              {form.is_open ? "Clientes podem fazer pedidos" : "Apenas visualização do cardápio"}
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              Quando fechada, clientes não conseguem fechar pedido. Funcionários continuam podendo registrar.
            </p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, is_open: !f.is_open }))}
            className={`relative w-16 h-9 rounded-full transition-colors ${form.is_open ? "bg-[#205427]" : "bg-[#6B7280]/30"}`}
            data-testid="toggle-store-open"
            aria-label="Toggle store open"
          >
            <span className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow transition-transform ${form.is_open ? "translate-x-7" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white border border-[#EAE6DF] rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 inline-flex items-center gap-1">
            <Store size={12} /> Nome do estabelecimento
          </label>
          <input
            value={form.store_name || ""}
            onChange={(e) => setForm({ ...form, store_name: e.target.value })}
            className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
            data-testid="store-name-input"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 inline-flex items-center gap-1">
            <Phone size={12} /> WhatsApp (com DDD e país, ex: 5511999998888)
          </label>
          <input
            value={form.whatsapp || ""}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })}
            placeholder="5511999998888"
            className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D] font-mono"
            data-testid="whatsapp-input"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5 inline-flex items-center gap-1">
            <MapPin size={12} /> Endereço
          </label>
          <input
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
            data-testid="address-input"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save} disabled={saving}
          className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-6 py-3 font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          data-testid="save-settings-btn"
        >
          <Save size={16} /> Salvar
        </button>
      </div>
    </div>
  );
}
