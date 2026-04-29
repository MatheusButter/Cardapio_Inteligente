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
  images: [],
  ingredients: [],
  prep_time: null,
  portion_sizes: [],
  pairing_ids: [],
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
      setEditing((prev) => ({ ...prev, image_path: prev.image_path || data.path, images: [...(prev.images || []), data.path] }));
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx) => {
    setEditing((prev) => {
      const imgs = [...(prev.images || [])];
      imgs.splice(idx, 1);
      return { ...prev, images: imgs, image_path: imgs[0] || "" };
    });
  };

  const addIngredient = () => setEditing((p) => ({ ...p, ingredients: [...(p.ingredients || []), { pt: "", en: "", es: "" }] }));
  const updateIngredient = (i, code, val) => setEditing((p) => {
    const ing = [...(p.ingredients || [])];
    ing[i] = { ...ing[i], [code]: val };
    return { ...p, ingredients: ing };
  });
  const removeIngredient = (i) => setEditing((p) => {
    const ing = [...(p.ingredients || [])]; ing.splice(i, 1); return { ...p, ingredients: ing };
  });

  const addPortion = () => setEditing((p) => ({ ...p, portion_sizes: [...(p.portion_sizes || []), { label: { pt: "", en: "", es: "" }, price: 0 }] }));
  const updatePortion = (i, field, val) => setEditing((p) => {
    const ps = [...(p.portion_sizes || [])];
    ps[i] = field === "price" ? { ...ps[i], price: parseFloat(val || "0") } : { ...ps[i], label: { ...(ps[i].label || {}), [field]: val } };
    return { ...p, portion_sizes: ps };
  });
  const removePortion = (i) => setEditing((p) => {
    const ps = [...(p.portion_sizes || [])]; ps.splice(i, 1); return { ...p, portion_sizes: ps };
  });

  const togglePairing = (id) => setEditing((p) => {
    const set = new Set(p.pairing_ids || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    return { ...p, pairing_ids: Array.from(set) };
  });

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
              {/* Image gallery */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-2">{t("admin.image")} (galeria)</label>
                <div className="flex flex-wrap gap-2">
                  {(editing.images || []).map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F2EFE9] group">
                      <img src={resolveImageUrl(src)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-[#DC2626] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`remove-img-${i}`}>×</button>
                      {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-[#A0522D] text-white text-[9px] font-bold tracking-wider uppercase text-center py-0.5">capa</div>}
                    </div>
                  ))}
                  <label className="cursor-pointer w-20 h-20 rounded-xl border-2 border-dashed border-[#A0522D] text-[#A0522D] hover:bg-[#A0522D]/5 transition-colors inline-flex flex-col items-center justify-center text-xs font-medium">
                    <Upload size={16} />
                    <span className="mt-1">{uploading ? "..." : "Add"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onUpload} data-testid="upload-input" />
                  </label>
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

              {/* Prep time */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Tempo de preparo (min)</label>
                <input
                  type="number"
                  value={editing.prep_time ?? ""}
                  onChange={(e) => setEditing({ ...editing, prep_time: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-32 bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]"
                  data-testid="prep-time-input"
                />
              </div>

              {/* Portion sizes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Tamanhos de porção</label>
                  <button type="button" onClick={addPortion} className="text-xs text-[#A0522D] font-semibold hover:underline" data-testid="add-portion-btn">+ adicionar</button>
                </div>
                <div className="space-y-2">
                  {(editing.portion_sizes || []).map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center" data-testid={`portion-row-${i}`}>
                      <input placeholder="PT" value={p.label?.pt || ""} onChange={(e) => updatePortion(i, "pt", e.target.value)} className="col-span-3 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <input placeholder="EN" value={p.label?.en || ""} onChange={(e) => updatePortion(i, "en", e.target.value)} className="col-span-3 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <input placeholder="ES" value={p.label?.es || ""} onChange={(e) => updatePortion(i, "es", e.target.value)} className="col-span-3 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <input type="number" step="0.01" placeholder="Preço" value={p.price ?? 0} onChange={(e) => updatePortion(i, "price", e.target.value)} className="col-span-2 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <button type="button" onClick={() => removePortion(i)} className="col-span-1 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg p-2"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Ingredientes principais</label>
                  <button type="button" onClick={addIngredient} className="text-xs text-[#A0522D] font-semibold hover:underline" data-testid="add-ingredient-btn">+ adicionar</button>
                </div>
                <div className="space-y-2">
                  {(editing.ingredients || []).map((ing, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input placeholder="PT" value={ing.pt || ""} onChange={(e) => updateIngredient(i, "pt", e.target.value)} className="col-span-4 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <input placeholder="EN" value={ing.en || ""} onChange={(e) => updateIngredient(i, "en", e.target.value)} className="col-span-4 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <input placeholder="ES" value={ing.es || ""} onChange={(e) => updateIngredient(i, "es", e.target.value)} className="col-span-3 border border-[#EAE6DF] rounded-lg px-2 py-2 text-sm" />
                      <button type="button" onClick={() => removeIngredient(i)} className="col-span-1 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg p-2"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pairings */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-2">Harmonização sugerida</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {products.filter((p) => p.id !== editing.id).map((p) => {
                    const active = (editing.pairing_ids || []).includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => togglePairing(p.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? "bg-[#A0522D] text-white border-[#A0522D]" : "bg-white text-[#2F3538] border-[#EAE6DF] hover:border-[#A0522D]/40"}`}
                        data-testid={`pairing-${p.id}`}>
                        {tf(p.name)}
                      </button>
                    );
                  })}
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
