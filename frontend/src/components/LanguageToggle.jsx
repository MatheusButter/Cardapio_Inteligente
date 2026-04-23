import React from "react";
import { useI18n } from "../i18n/I18nContext";

export default function LanguageToggle() {
  const { lang, setLang, languages } = useI18n();
  return (
    <div
      className="flex rounded-lg overflow-hidden border border-[#EAE6DF] bg-white"
      data-testid="language-toggle"
    >
      {languages.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
            lang === code
              ? "bg-[#303226] text-white"
              : "text-[#6B7280] hover:text-[#2F3538]"
          }`}
          data-testid={`lang-${code}`}
          aria-label={`Change language to ${code}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
