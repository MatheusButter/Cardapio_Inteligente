import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get("/store");
      setStore(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000); // poll every 30s
    return () => clearInterval(t);
  }, []);

  return (
    <StoreContext.Provider value={{ store, loading, refresh, setStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
