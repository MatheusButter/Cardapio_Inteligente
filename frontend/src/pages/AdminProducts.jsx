import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Upload, X, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import api, { resolveImageUrl, formatApiErrorDetail } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const EMPTY = {
  name: { pt: "", en: "", es: "" },
  description: { pt: "", en: "", es: "" },
  category: "",
  price: 0,
  promo: false,
  available: true,
  tag_ids: [],
  image_path: "",
};

export default function AdminProducts() {
  const { t, tf } = useI18n();
  const [products, setProducts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // product or EMPTY or null
  const [uploading, setUploading] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [p, t] = await Promise.all([api.get("/products"), api.get("/tags")]);
    setProducts(p.data); setTags(t.data); setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const openNew = () => setEditing({ ...EMPTY, name: { pt: "", en: "", es: "" }, description: { pt: "", en: "", es: "" } });
  const openEdit = (p) => setEditing(JSON.parse(JSON.stringify(p)));
  const close = () => setEditing(null);

  const save = async () => {
    try {
      if (editing.id) {
        await api.put(`/products/${editing.id}`, editing);
        toast.success("Produto atualizado");
      } else {
        await api.post("/products", editing);
        toast.success("Produto criado");
      }
      close(); reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Produto excluído");
      reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setEditing((prev) => ({ ...prev, image_path: data.path }));
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const toggleTag = (id) => {
    setEditing((prev) => {
      const set = new Set(prev.tag_ids || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, tag_ids: Array.from(set) };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="products-title">{t("admin.products")}</h1>
          <p className="text-sm text-[#6B7280]">{products.length} {t("admin.productsCount")}</p>
        </div>
        <button
          onClick={openNew}
          className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium transition-colors inline-flex items-center gap-2"
          data-testid="new-product-btn"
        >
          <Plus size={16} /> {t("admin.newProduct")}
        </button>
      </div>

      {loading ? (
        <div className="text-[#6B7280]">Carregando...</div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] rounded-2xl p-10 text-center text-[#6B7280]">
          {t("admin.noProducts")}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="admin-products-grid">
          {products.map((p) => (
            <article key={p.id} className="bg-white border border-[#EAE6DF] rounded-2xl p-4 flex gap-4" data-testid={`admin-product-${p.id}`}>
              <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-[#F2EFE9]">
                {p.image_path ? (
                  <img src={resolveImageUrl(p.image_path)} alt="" className="w-full h-full object-cover" />
                ) : <div className="w-full h-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-[#2F3538] truncate">{tf(p.name)}</h3>
                  <div className="font-heading font-bold text-[#A0522D]">R$ {Number(p.price).toFixed(2)}</div>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">{p.category}</p>
                <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">{tf(p.description)}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {p.promo && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#A0522D]/10 text-[#A0522D]">{t("menu.promo")}</span>}
                  {!p.available && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#6B7280]/10 text-[#6B7280]">{t("menu.unavailable")}</span>}
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-[#F2EFE9] text-[#2F3538]" data-testid={`edit-${p.id}`}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(p.id)} className="p-2 rounded-lg hover:bg-[#DC2626]/10 text-[#DC2626]" data-testid={`delete-${p.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={close}>
          <div
            className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="product-modal"
          >
            <div className="sticky top-0 bg-white border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-[#2F3538]">
                {editing.id ? t("admin.edit") : t("admin.newProduct")}
              </h2>
              <button onClick={close} data-testid="close-modal-btn" className="p-2 rounded-lg hover:bg-[#F2EFE9]">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Image */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">{t("admin.image")}</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F2EFE9] shrink-0">
                    {editing.image_path ? (
                      <img src={resolveImageUrl(editing.image_path)} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <label className="cursor-pointer border-2 border-[#A0522D] text-[#A0522D] hover:bg-[#A0522D]/5 rounded-xl px-4 py-2 font-medium transition-colors inline-flex items-center gap-2">
                    <Upload size={14} />
                    {uploading ? t("admin.uploading") : t("admin.upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={onUpload} data-testid="upload-input" />
                  </label>
                  {editing.image_path && (
                    <button
                      onClick={() => setEditing((p) => ({ ...p, image_path: "" }))}
                      className="text-xs text-[#DC2626] hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Names per language */}
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
                      data-testid={`name-${code}-input`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["pt","en","es"].map((code) => (
                  <div key={code}>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">
                      {t("admin.description")} ({code.toUpperCase()})
                    </label>
                    <textarea
                      rows={3}
                      value={editing.description?.[code] || ""}
                      onChange={(e) => setEditing({ ...editing, description: { ...editing.description, [code]: e.target.value } })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                      data-testid={`desc-${code}-input`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">{t("admin.category")}</label>
                  <input
                    value={editing.category || ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                    data-testid="category-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">{t("admin.price")}</label>
                  <input
                    type="number" step="0.01"
                    value={editing.price ?? 0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value || "0") })}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                    data-testid="price-input"
                  />
                </div>
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="inline-flex items-center gap-2 text-sm text-[#2F3538]">
                    <input type="checkbox" checked={!!editing.promo} onChange={(e) => setEditing({ ...editing, promo: e.target.checked })} data-testid="promo-checkbox" />
                    {t("admin.promo")}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-[#2F3538]">
                    <input type="checkbox" checked={editing.available !== false} onChange={(e) => setEditing({ ...editing, available: e.target.checked })} data-testid="available-checkbox" />
                    {t("admin.available")}
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">{t("admin.tagsSelect")}</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tg) => {
                    const active = (editing.tag_ids || []).includes(tg.id);
                    return (
                      <button
                        key={tg.id} type="button"
                        onClick={() => toggleTag(tg.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border inline-flex items-center gap-1.5 transition-all ${
                          active ? "text-white" : "bg-white text-[#2F3538]"
                        }`}
                        style={{
                          backgroundColor: active ? tg.color : undefined,
                          borderColor: active ? tg.color : "#EAE6DF",
                        }}
                        data-testid={`select-tag-${tg.id}`}
                      >
                        <TagIcon size={12} />
                        {tf(tg.name)}
                      </button>
                    );
                  })}
                  {tags.length === 0 && <span className="text-sm text-[#6B7280]">{t("admin.noTags")}</span>}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[#EAE6DF] px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={close} className="rounded-xl px-5 py-2.5 font-medium text-[#2F3538] hover:bg-[#F2EFE9] transition-colors" data-testid="modal-cancel-btn">
                {t("admin.cancel")}
              </button>
              <button onClick={save} className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium transition-colors" data-testid="modal-save-btn">
                {t("admin.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
