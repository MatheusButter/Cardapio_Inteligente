import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const ICONS = ["tag", "leaf", "flame", "sparkles", "milk-off", "wheat-off"];
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
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white border border-[#EAE6DF] rounded-2xl p-4 flex items-center gap-3" data-testid={`tag-row-${tag.id}`}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: tag.color }}
              >
                <TagIcon size={16} />
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
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white w-full max-w-lg rounded-2xl" onClick={(e) => e.stopPropagation()} data-testid="tag-modal">
            <div className="border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-[#2F3538]">
                {editing.id ? t("admin.edit") : t("admin.newTag")}
              </h2>
              <button onClick={close} className="p-2 rounded-lg hover:bg-[#F2EFE9]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["pt","en","es"].map((code) => (
                  <div key={code}>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">
                      {t("admin.name")} ({code.toUpperCase()})
                    </label>
                    <input
                      value={editing.name?.[code] || ""}
                      onChange={(e) => setEditing({ ...editing, name: { ...editing.name, [code]: e.target.value } })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                      data-testid={`tag-name-${code}-input`}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">{t("admin.color")}</label>
                  <input
                    type="color"
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="w-full h-11 bg-white border border-[#EAE6DF] rounded-xl px-2"
                    data-testid="tag-color-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">{t("admin.icon")}</label>
                  <select
                    value={editing.icon}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    className="w-full h-11 bg-white border border-[#EAE6DF] rounded-xl px-3"
                    data-testid="tag-icon-input"
                  >
                    {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-[#EAE6DF] px-6 py-4 flex items-center justify-end gap-2">
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
