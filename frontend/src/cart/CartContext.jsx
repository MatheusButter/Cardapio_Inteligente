import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

function loadCart() {
  try { return JSON.parse(localStorage.getItem("cd_cart") || "[]"); } catch { return []; }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem("cd_cart", JSON.stringify(items));
  }, [items]);

  const add = (product, portionIdx = null) => {
    const portion = portionIdx != null && product.portion_sizes?.[portionIdx];
    const lineId = `${product.id}::${portionIdx ?? "default"}`;
    setItems((prev) => {
      const existing = prev.find((it) => it.lineId === lineId);
      if (existing) return prev.map((it) => it.lineId === lineId ? { ...it, qty: it.qty + 1 } : it);
      return [...prev, {
        lineId,
        productId: product.id,
        name: product.name,
        image_path: product.image_path || (product.images || [])[0] || null,
        price: portion ? portion.price : product.price,
        portionLabel: portion ? portion.label : null,
        qty: 1,
      }];
    });
  };

  const inc = (lineId) => setItems((prev) => prev.map((it) => it.lineId === lineId ? { ...it, qty: it.qty + 1 } : it));
  const dec = (lineId) => setItems((prev) => prev.flatMap((it) => it.lineId === lineId ? (it.qty > 1 ? [{ ...it, qty: it.qty - 1 }] : []) : [it]));
  const remove = (lineId) => setItems((prev) => prev.filter((it) => it.lineId !== lineId));
  const clear = () => setItems([]);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, total, add, inc, dec, remove, clear };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
