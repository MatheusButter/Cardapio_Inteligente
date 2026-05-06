import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Coffee, Wine, Utensils } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const ICONS = { utensils: Utensils, coffee: Coffee, wine: Wine };
const EMPTY = { name: { pt: "", en: "", es: "" }, description: { pt: "", en: "", es: "" }, icon: "utensils", active: true, sort_order: 0 };

export default function AdminMenus() {
  const { tf } = useI18n();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    setLoading(true);
    try { const { data } = await api.get("/menus"); setMenus(data); } catch {}
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/menus/${editing.id}`, editing);
      else await api.post("/menus", editing);
      toast.success("Cardápio salvo");
      setEditing(null); reload();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remover este cardápio? Produtos permanecem, apenas desvinculados.")) return;
    try { await api.delete(`/menus/${id}`); toast.success("Removido"); reload(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="menus-title">Cardápios</h1>
          <p className="text-sm text-[#6B7280]">Crie múltiplos menus: principal, café da manhã, happy hour...</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY, name: { pt: "", en: "", es: "" } })} className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium inline-flex items-center gap-2" data-testid="new-menu-btn">
          <Plus size={16} /> Novo cardápio
        </button>
      </div>

      {loading ? (
        <div className="text-[#6B7280]">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="menus-grid">
          {menus.map((m) => {
            const Ico = ICONS[m.icon] || Utensils;
            return (
              <div key={m.id} className="bg-white border border-[#EAE6DF] rounded-2xl p-4 flex items-center gap-3" data-testid={`menu-row-${m.id}`}>
                <div className="w-10 h-10 rounded-lg bg-[#A0522D]/10 flex items-center justify-center text-[#A0522D] shrink-0">
                  <Ico size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2F3538] truncate">{tf(m.name)}</div>
                  <div className="text-xs text-[#6B7280]">{m.active ? "Ativo" : "Inativo"} · ordem {m.sort_order}</div>
                </div>
                <button onClick={() => setEditing({ ...m })} className="p-2 rounded-lg hover:bg-[#F2EFE9] text-[#2F3538]" data-testid={`edit-menu-${m.id}`}><Pencil size={14} /></button>
                <button onClick={() => remove(m.id)} className="p-2 rounded-lg hover:bg-[#DC2626]/10 text-[#DC2626]" data-testid={`delete-menu-${m.id}`}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl" onClick={(e) => e.stopPropagation()} data-testid="menu-modal">
            <div className="border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-[#2F3538]">{editing.id ? "Editar cardápio" : "Novo cardápio"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-[#F2EFE9]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {["pt","en","es"].map((code) => (
                  <input key={code} placeholder={`Nome (${code.toUpperCase()})`} value={editing.name?.[code] || ""}
                    onChange={(e) => setEditing({ ...editing, name: { ...editing.name, [code]: e.target.value } })}
                    className="border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                    data-testid={`menu-name-${code}`} />
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-2">Ícone</label>
                <div className="flex gap-2">
                  {Object.keys(ICONS).map((k) => {
                    const Ico = ICONS[k]; const active = editing.icon === k;
                    return (
                      <button key={k} type="button" onClick={() => setEditing({ ...editing, icon: k })}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${active ? "border-[#A0522D] bg-[#A0522D]/10 text-[#A0522D]" : "border-[#EAE6DF] text-[#6B7280]"}`}
                        data-testid={`menu-icon-${k}`}>
                        <Ico size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Ordem</label>
                  <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value || "0") })}
                    className="w-full border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]" data-testid="menu-order" />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-[#2F3538] mt-7">
                  <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} data-testid="menu-active" />
                  Ativo (visível aos clientes)
                </label>
              </div>
            </div>
            <div className="border-t border-[#EAE6DF] px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-xl px-5 py-2.5 font-medium text-[#2F3538] hover:bg-[#F2EFE9]">Cancelar</button>
              <button onClick={save} className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium" data-testid="menu-save-btn">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
