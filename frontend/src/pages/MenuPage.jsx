import React, { useEffect, useMemo, useState } from "react";
import { Search, X, Utensils, Leaf, Flame, Sparkles, MilkOff, WheatOff, Tag as TagIcon } from "lucide-react";
import api, { resolveImageUrl } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import LanguageToggle from "../components/LanguageToggle";

const ICONS = {
  leaf: Leaf,
  flame: Flame,
  sparkles: Sparkles,
  "milk-off": MilkOff,
  "wheat-off": WheatOff,
  tag: TagIcon,
};

function TagIconRender({ name, color }) {
  const Ico = ICONS[name] || TagIcon;
  return <Ico size={12} style={{ color }} />;
}

export default function MenuPage() {
  const { t, tf, lang } = useI18n();
  const [products, setProducts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTagIds, setActiveTagIds] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/products"), api.get("/tags")])
      .then(([p, t]) => {
        if (cancelled) return;
        setProducts(p.data);
        setTags(t.data);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map((x) => [x.id, x])), [tags]);

  const toggleTag = (id) => {
    setActiveTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (activeTagIds.size > 0) {
        const pSet = new Set(p.tag_ids || []);
        for (const id of activeTagIds) if (!pSet.has(id)) return false;
      }
      if (q) {
        const name = (tf(p.name) || "").toLowerCase();
        const desc = (tf(p.description) || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [products, query, activeTagIds, activeCategory, tf, lang]);

  const hasFilters = query || activeTagIds.size > 0 || activeCategory !== "all";
  const clearFilters = () => { setQuery(""); setActiveTagIds(new Set()); setActiveCategory("all"); };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md pt-4 pb-3 border-b border-[#EAE6DF]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 text-[#A0522D]">
                <Utensils size={18} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">{t("menu.poweredBy")}</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#2F3538] mt-1" data-testid="menu-title">
                {t("menu.title")}
              </h1>
              <p className="text-sm text-[#6B7280]">{t("menu.subtitle")}</p>
            </div>
            <LanguageToggle />
          </div>

          {/* Search */}
          <div className="w-full bg-white border border-[#EAE6DF] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#A0522D] focus-within:border-transparent flex items-center gap-2 shadow-sm">
            <Search size={18} className="text-[#6B7280]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("menu.search")}
              className="flex-1 outline-none bg-transparent text-sm text-[#2F3538] placeholder-[#6B7280]"
              data-testid="menu-search-input"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear" data-testid="menu-search-clear">
                <X size={16} className="text-[#6B7280]" />
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar" data-testid="category-row">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === c
                    ? "bg-[#2F3538] text-white shadow-md"
                    : "bg-white border border-[#EAE6DF] text-[#2F3538] hover:bg-[#F2EFE9]"
                }`}
                data-testid={`category-${c}`}
              >
                {c === "all" ? t("menu.all") : c}
              </button>
            ))}
          </div>

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto hide-scrollbar pb-1" data-testid="tag-row">
              {tags.map((tg) => {
                const active = activeTagIds.has(tg.id);
                return (
                  <button
                    key={tg.id}
                    onClick={() => toggleTag(tg.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all inline-flex items-center gap-1.5 border ${
                      active ? "text-white shadow-md" : "bg-white text-[#2F3538] hover:bg-[#F2EFE9]"
                    }`}
                    style={{
                      backgroundColor: active ? tg.color : undefined,
                      borderColor: active ? tg.color : "#EAE6DF",
                    }}
                    data-testid={`tag-${tg.id}`}
                  >
                    <TagIconRender name={tg.icon} color={active ? "#fff" : tg.color} />
                    {tf(tg.name)}
                  </button>
                );
              })}
            </div>
          )}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-xs text-[#A0522D] font-semibold hover:underline"
              data-testid="clear-filters-btn"
            >
              {t("menu.clear")}
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-w-3xl mx-auto px-4 mt-5">
        {loading ? (
          <div className="space-y-4">
            {[0,1,2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white border border-[#EAE6DF] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280]" data-testid="menu-empty">
            {t("menu.empty")}
          </div>
        ) : (
          <ul className="space-y-4" data-testid="menu-list">
            {filtered.map((p, idx) => (
              <li
                key={p.id}
                className="animate-fade-slide-up"
                style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
                data-testid={`product-card-${p.id}`}
              >
                <article
                  className={`flex flex-row gap-4 p-4 rounded-2xl bg-white shadow-sm border border-[#EAE6DF] transition-all ${
                    p.available === false ? "opacity-60" : "hover:shadow-md"
                  }`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-[#F2EFE9]">
                    {p.image_path ? (
                      <img
                        src={resolveImageUrl(p.image_path)}
                        alt={tf(p.name)}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#A0522D]">
                        <Utensils size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading font-semibold text-[#2F3538] text-lg leading-tight truncate">
                        {tf(p.name)}
                      </h3>
                      <div className="text-right shrink-0">
                        {p.promo ? (
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#A0522D] bg-[#A0522D]/10 px-2 py-0.5 rounded-md mb-1">
                            {t("menu.promo")}
                          </span>
                        ) : null}
                        <div className="font-heading font-bold text-[#A0522D] text-lg">
                          R$ {Number(p.price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">{tf(p.description)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      {(p.tag_ids || []).map((tid) => {
                        const tg = tagMap[tid];
                        if (!tg) return null;
                        return (
                          <span
                            key={tid}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1"
                            style={{ backgroundColor: `${tg.color}1a`, color: tg.color }}
                            data-testid={`product-tag-${tid}`}
                          >
                            <TagIconRender name={tg.icon} color={tg.color} />
                            {tf(tg.name)}
                          </span>
                        );
                      })}
                      {p.available === false && (
                        <span className="ml-auto text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                          {t("menu.unavailable")}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
