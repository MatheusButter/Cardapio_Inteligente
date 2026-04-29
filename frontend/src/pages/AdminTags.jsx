import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Tag as TagIcon, Leaf, Flame, Sparkles, MilkOff, WheatOff, Wheat, Coffee, Beef, Fish, Apple, Cake, Pizza, Croissant, Wine, IceCream, Cookie, Carrot, Salad, Egg, Soup } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const ICON_LIB = {
  tag: TagIcon, leaf: Leaf, flame: Flame, sparkles: Sparkles,
  "milk-off": MilkOff, "wheat-off": WheatOff, wheat: Wheat,
  coffee: Coffee, beef: Beef, fish: Fish, apple: Apple, cake: Cake,
  pizza: Pizza, croissant: Croissant, wine: Wine, "ice-cream": IceCream,
  cookie: Cookie, carrot: Carrot, salad: Salad, egg: Egg, soup: Soup,
};
const ICON_KEYS = Object.keys(ICON_LIB);
const COLOR_PRESETS = ["#A0522D","#205427","#303226","#DC2626","#D97706","#0EA5E9","#7C3AED","#DB2777","#0F766E","#525252"];
const EMPTY = { name: { pt: "", en: "", es: "" }, color: "#A0522D", icon: "tag" };

export default function AdminTags() {
  const { t, tf } = useI18n();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    setLoading(true);
    const { data } = await api.get("/tags");
    setTags(data); setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const openNew = () => setEditing({ ...EMPTY, name: { pt: "", en: "", es: "" } });
  const openEdit = (tag) => setEditing(JSON.parse(JSON.stringify(tag)));
  const close = () => setEditing(null);

  const save = async () => {
    try {
      if (editing.id) {
        await api.put(`/tags/${editing.id}`, editing);
        toast.success("Tag atualizada");
      } else {
        await api.post("/tags", editing);
        toast.success("Tag criada");
      }
      close(); reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir esta tag?")) return;
    try { await api.delete(`/tags/${id}`); toast.success("Tag excluída"); reload(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="tags-title">{t("admin.tags")}</h1>
          <p className="text-sm text-[#6B7280]">{tags.length}</p>
        </div>
        <button
          onClick={openNew}
          className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium transition-colors inline-flex items-center gap-2"
          data-testid="new-tag-btn"
        >
          <Plus size={16} /> {t("admin.newTag")}
        </button>
      </div>

      {loading ? (
        <div className="text-[#6B7280]">Carregando...</div>
      ) : tags.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] rounded-2xl p-10 text-center text-[#6B7280]">
          {t("admin.noTags")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="tags-grid">
          {tags.map((tag) => {
            const Ico = ICON_LIB[tag.icon] || TagIcon;
            return (
              <div key={tag.id} className="bg-white border border-[#EAE6DF] rounded-2xl p-4 flex items-center gap-3" data-testid={`tag-row-${tag.id}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: tag.color }}>
                  <Ico size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2F3538] truncate">{tf(tag.name)}</div>
                  <div className="text-xs text-[#6B7280]">{tag.color} · {tag.icon}</div>
                </div>
                <button onClick={() => openEdit(tag)} className="p-2 rounded-lg hover:bg-[#F2EFE9] text-[#2F3538]" data-testid={`edit-tag-${tag.id}`}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(tag.id)} className="p-2 rounded-lg hover:bg-[#DC2626]/10 text-[#DC2626]" data-testid={`delete-tag-${tag.id}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="tag-modal">
            <div className="border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="font-heading text-xl font-semibold text-[#2F3538]">
                  {editing.id ? t("admin.edit") : t("admin.newTag")}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">Crie etiquetas globais com cor e ícone personalizados</p>
              </div>
              <button onClick={close} className="p-2 rounded-lg hover:bg-[#F2EFE9]"><X size={18} /></button>
            </div>

            {/* Live preview */}
            <div className="px-6 pt-5 pb-3">
              <div className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">Pré-visualização</div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium" style={{ backgroundColor: editing.color }}>
                {(() => { const Ico = ICON_LIB[editing.icon] || TagIcon; return <Ico size={14} />; })()}
                {editing.name?.pt || editing.name?.en || editing.name?.es || "Nova tag"}
              </div>
            </div>

            <div className="p-6 pt-3 space-y-5">
              {/* Names */}
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">Nome (PT / EN / ES)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {["pt","en","es"].map((code) => (
                    <input
                      key={code}
                      placeholder={code.toUpperCase()}
                      value={editing.name?.[code] || ""}
                      onChange={(e) => setEditing({ ...editing, name: { ...editing.name, [code]: e.target.value } })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                      data-testid={`tag-name-${code}-input`}
                    />
                  ))}
                </div>
              </div>

              {/* Color presets */}
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">Cor</div>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: c })}
                      className={`w-9 h-9 rounded-full transition-all ${editing.color === c ? "ring-2 ring-offset-2 ring-[#2F3538]" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                      data-testid={`color-preset-${c}`}
                      aria-label={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="w-9 h-9 rounded-full border border-[#EAE6DF] cursor-pointer"
                    data-testid="tag-color-input"
                  />
                  <span className="text-xs text-[#6B7280] font-mono ml-2">{editing.color}</span>
                </div>
              </div>

              {/* Icon picker grid */}
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">Ícone</div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1" data-testid="icon-grid">
                  {ICON_KEYS.map((k) => {
                    const Ico = ICON_LIB[k];
                    const active = editing.icon === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setEditing({ ...editing, icon: k })}
                        className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                          active ? "border-[#A0522D] bg-[#A0522D]/10 text-[#A0522D]" : "border-[#EAE6DF] bg-white text-[#6B7280] hover:border-[#A0522D]/40 hover:text-[#2F3538]"
                        }`}
                        title={k}
                        data-testid={`icon-${k}`}
                      >
                        <Ico size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="border-t border-[#EAE6DF] px-6 py-4 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={close} className="rounded-xl px-5 py-2.5 font-medium text-[#2F3538] hover:bg-[#F2EFE9]">{t("admin.cancel")}</button>
              <button onClick={save} className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium transition-colors" data-testid="tag-save-btn">
                {t("admin.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
