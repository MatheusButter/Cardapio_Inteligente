import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const DICT = {
  pt: {
    "menu.title": "Cardápio",
    "menu.subtitle": "Descubra nossos sabores",
    "menu.search": "Buscar pratos...",
    "menu.all": "Todos",
    "menu.empty": "Nenhum prato encontrado",
    "menu.unavailable": "Indisponível",
    "menu.promo": "Promoção",
    "menu.clear": "Limpar filtros",
    "menu.poweredBy": "Cardápio Digital",
    "admin.login": "Entrar",
    "admin.email": "E-mail",
    "admin.password": "Senha",
    "admin.signIn": "Acessar painel",
    "admin.dashboard": "Painel",
    "admin.products": "Produtos",
    "admin.tags": "Tags",
    "admin.qr": "QR Code",
    "admin.logout": "Sair",
    "admin.newProduct": "Novo produto",
    "admin.newTag": "Nova tag",
    "admin.name": "Nome",
    "admin.description": "Descrição",
    "admin.category": "Categoria",
    "admin.price": "Preço",
    "admin.promo": "Promoção",
    "admin.available": "Disponível",
    "admin.color": "Cor",
    "admin.icon": "Ícone",
    "admin.save": "Salvar",
    "admin.cancel": "Cancelar",
    "admin.delete": "Excluir",
    "admin.edit": "Editar",
    "admin.image": "Imagem",
    "admin.upload": "Enviar imagem",
    "admin.uploading": "Enviando...",
    "admin.tagsSelect": "Selecione as tags",
    "admin.productsCount": "produtos",
    "admin.noProducts": "Nenhum produto cadastrado",
    "admin.noTags": "Nenhuma tag criada",
    "admin.qrTitle": "QR Code do cardápio",
    "admin.qrHint": "Imprima e coloque nas mesas para acesso instantâneo.",
    "login.invalid": "E-mail ou senha inválidos",
    "login.welcome": "Bem-vindo de volta",
    "login.subtitle": "Acesse seu painel de gerente",
  },
  en: {
    "menu.title": "Menu",
    "menu.subtitle": "Discover our flavors",
    "menu.search": "Search dishes...",
    "menu.all": "All",
    "menu.empty": "No dishes found",
    "menu.unavailable": "Unavailable",
    "menu.promo": "Promo",
    "menu.clear": "Clear filters",
    "menu.poweredBy": "Digital Menu",
    "admin.login": "Log in",
    "admin.email": "Email",
    "admin.password": "Password",
    "admin.signIn": "Access dashboard",
    "admin.dashboard": "Dashboard",
    "admin.products": "Products",
    "admin.tags": "Tags",
    "admin.qr": "QR Code",
    "admin.logout": "Log out",
    "admin.newProduct": "New product",
    "admin.newTag": "New tag",
    "admin.name": "Name",
    "admin.description": "Description",
    "admin.category": "Category",
    "admin.price": "Price",
    "admin.promo": "Promo",
    "admin.available": "Available",
    "admin.color": "Color",
    "admin.icon": "Icon",
    "admin.save": "Save",
    "admin.cancel": "Cancel",
    "admin.delete": "Delete",
    "admin.edit": "Edit",
    "admin.image": "Image",
    "admin.upload": "Upload image",
    "admin.uploading": "Uploading...",
    "admin.tagsSelect": "Select tags",
    "admin.productsCount": "products",
    "admin.noProducts": "No products yet",
    "admin.noTags": "No tags yet",
    "admin.qrTitle": "Menu QR Code",
    "admin.qrHint": "Print and place on tables for instant access.",
    "login.invalid": "Invalid email or password",
    "login.welcome": "Welcome back",
    "login.subtitle": "Access your manager dashboard",
  },
  es: {
    "menu.title": "Menú",
    "menu.subtitle": "Descubre nuestros sabores",
    "menu.search": "Buscar platos...",
    "menu.all": "Todos",
    "menu.empty": "No se encontraron platos",
    "menu.unavailable": "No disponible",
    "menu.promo": "Promo",
    "menu.clear": "Limpiar filtros",
    "menu.poweredBy": "Menú Digital",
    "admin.login": "Entrar",
    "admin.email": "Correo",
    "admin.password": "Contraseña",
    "admin.signIn": "Acceder al panel",
    "admin.dashboard": "Panel",
    "admin.products": "Productos",
    "admin.tags": "Etiquetas",
    "admin.qr": "QR Code",
    "admin.logout": "Salir",
    "admin.newProduct": "Nuevo producto",
    "admin.newTag": "Nueva etiqueta",
    "admin.name": "Nombre",
    "admin.description": "Descripción",
    "admin.category": "Categoría",
    "admin.price": "Precio",
    "admin.promo": "Promo",
    "admin.available": "Disponible",
    "admin.color": "Color",
    "admin.icon": "Icono",
    "admin.save": "Guardar",
    "admin.cancel": "Cancelar",
    "admin.delete": "Eliminar",
    "admin.edit": "Editar",
    "admin.image": "Imagen",
    "admin.upload": "Subir imagen",
    "admin.uploading": "Subiendo...",
    "admin.tagsSelect": "Selecciona etiquetas",
    "admin.productsCount": "productos",
    "admin.noProducts": "Sin productos aún",
    "admin.noTags": "Sin etiquetas aún",
    "admin.qrTitle": "QR del menú",
    "admin.qrHint": "Imprime y colócalo en las mesas para acceso instantáneo.",
    "login.invalid": "Correo o contraseña inválidos",
    "login.welcome": "Bienvenido",
    "login.subtitle": "Accede a tu panel de gerente",
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("cd_lang");
    if (saved && DICT[saved]) return saved;
    const nav = (navigator.language || "pt").slice(0, 2);
    return DICT[nav] ? nav : "pt";
  });

  useEffect(() => {
    localStorage.setItem("cd_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.pt[key] || key;
    const tf = (field) => {
      if (!field) return "";
      if (typeof field === "string") return field;
      return field[lang] || field.pt || field.en || Object.values(field)[0] || "";
    };
    return { lang, setLang, t, tf, languages: Object.keys(DICT) };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
