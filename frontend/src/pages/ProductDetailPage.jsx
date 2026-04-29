import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Sparkles, Wine, ChevronRight, Tag as TagIcon, Leaf, Flame, MilkOff, WheatOff } from "lucide-react";
import api, { resolveImageUrl } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { useCart } from "../cart/CartContext";
import { toast } from "sonner";
import LanguageToggle from "../components/LanguageToggle";

const ICONS = { leaf: Leaf, flame: Flame, sparkles: Sparkles, "milk-off": MilkOff, "wheat-off": WheatOff, tag: TagIcon };

export default function ProductDetailPage() {
  const { id } = useParams();
  const { t, tf } = useI18n();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [tags, setTags] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [activePortion, setActivePortion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/products/${id}`), api.get("/tags"), api.get("/products")])
      .then(([p, tg, all]) => {
        setProduct(p.data); setTags(tg.data); setAllProducts(all.data);
        setActiveImg(0); setActivePortion(0);
      })
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map((x) => [x.id, x])), [tags]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">404</div>;

  const images = (product.images && product.images.length > 0) ? product.images : (product.image_path ? [product.image_path] : []);
  const portions = product.portion_sizes || [];
  const ingredients = product.ingredients || [];
  const pairingIds = product.pairing_ids || [];
  const pairings = allProducts.filter((p) => pairingIds.includes(p.id));
  const currentPrice = portions.length ? portions[activePortion].price : product.price;

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32">
      <div className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EAE6DF]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#2F3538] hover:text-[#A0522D] transition-colors" data-testid="back-to-menu">
            <ArrowLeft size={16} /> {t("menu.title")}
          </Link>
          <LanguageToggle />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Gallery */}
        <div className="rounded-3xl overflow-hidden bg-white border border-[#EAE6DF] shadow-sm">
          <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
            {images[activeImg] ? (
              <img src={resolveImageUrl(images[activeImg])} alt={tf(product.name)} className="w-full h-full object-cover" data-testid="detail-hero-image" />
            ) : <div className="w-full h-full" />}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto hide-scrollbar">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? "border-[#A0522D]" : "border-transparent opacity-70"}`}
                  data-testid={`thumb-${i}`}
                >
                  <img src={resolveImageUrl(src)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mt-6">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#A0522D]">{product.category}</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2F3538] mt-1" data-testid="detail-name">{tf(product.name)}</h1>
          <p className="text-[#6B7280] mt-2 leading-relaxed">{tf(product.description)}</p>
          {product.prep_time ? (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#205427] bg-[#205427]/10 px-3 py-1.5 rounded-full" data-testid="prep-time">
              <Clock size={12} /> {product.prep_time} min
            </div>
          ) : null}
        </div>

        {/* Portion sizes */}
        {portions.length > 0 && (
          <section className="mt-8" data-testid="portion-sizes">
            <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#6B7280]">Tamanho da porção</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {portions.map((p, i) => {
                const active = activePortion === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActivePortion(i)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? "border-[#A0522D] bg-[#A0522D]/5" : "border-[#EAE6DF] bg-white hover:border-[#A0522D]/40"}`}
                    data-testid={`portion-${i}`}
                  >
                    <div className="font-heading font-semibold text-[#2F3538]">{tf(p.label)}</div>
                    <div className="font-heading font-bold text-[#A0522D] mt-1">R$ {Number(p.price).toFixed(2)}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <section className="mt-8" data-testid="ingredients-section">
            <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#6B7280]">Ingredientes principais</h2>
            <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="px-3 py-2 rounded-xl bg-white border border-[#EAE6DF] text-sm text-[#2F3538]">
                  {tf(ing)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tags */}
        {(product.tag_ids || []).length > 0 && (
          <section className="mt-8">
            <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#6B7280]">Restrições / atributos</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {product.tag_ids.map((tid) => {
                const tg = tagMap[tid]; if (!tg) return null;
                const Ico = ICONS[tg.icon] || TagIcon;
                return (
                  <span key={tid} className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                        style={{ backgroundColor: `${tg.color}1a`, color: tg.color }}>
                    <Ico size={12} />{tf(tg.name)}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Pairings */}
        {pairings.length > 0 && (
          <section className="mt-10" data-testid="pairings-section">
            <div className="flex items-center gap-2">
              <Wine size={16} className="text-[#A0522D]" />
              <h2 className="font-heading text-xl font-semibold text-[#2F3538]">Harmonização sugerida</h2>
            </div>
            <div className="mt-4 space-y-3">
              {pairings.map((p) => (
                <Link key={p.id} to={`/menu/${p.id}`} className="flex gap-4 p-4 rounded-2xl bg-white border border-[#EAE6DF] hover:shadow-md transition-all" data-testid={`pairing-${p.id}`}>
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F2EFE9] shrink-0">
                    {p.image_path ? <img src={resolveImageUrl(p.image_path)} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-[#A0522D]">Sugestão do chef</div>
                    <h3 className="font-heading font-semibold text-[#2F3538] truncate">{tf(p.name)}</h3>
                    <p className="text-xs text-[#6B7280] line-clamp-2 mt-0.5">{tf(p.description)}</p>
                  </div>
                  <ChevronRight size={18} className="self-center text-[#A0522D]" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky bottom price bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE6DF]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-[#6B7280]">{portions.length ? tf(portions[activePortion].label) : t("menu.promo")}</div>
            <div className="font-heading font-bold text-2xl text-[#A0522D]" data-testid="detail-price">R$ {Number(currentPrice).toFixed(2)}</div>
          </div>
          {product.available !== false ? (
            <button
              className="bg-[#205427] text-white hover:bg-[#163818] rounded-xl px-6 py-3 font-medium transition-colors inline-flex items-center gap-2"
              data-testid="add-order-btn"
              onClick={() => {
                add(product, portions.length ? activePortion : null);
                toast.success(`${tf(product.name)} adicionado ao pedido`);
              }}
            >
              <Sparkles size={16} /> Adicionar ao pedido
            </button>
          ) : (
            <span className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider">{t("menu.unavailable")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
