import React, { useMemo } from "react";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "../i18n/I18nContext";

export default function AdminQR() {
  const { t } = useI18n();
  const menuUrl = useMemo(() => `${window.location.origin}/`, []);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(menuUrl)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(menuUrl);
    toast.success("Link copiado");
  };

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="qr-title">{t("admin.qrTitle")}</h1>
      <p className="text-sm text-[#6B7280] mt-1">{t("admin.qrHint")}</p>

      <div className="mt-6 bg-white border border-[#EAE6DF] rounded-2xl p-6 max-w-xl">
        <div className="flex flex-col items-center">
          <img src={qrUrl} alt="QR code" className="rounded-xl border border-[#EAE6DF]" data-testid="qr-image" />
          <div className="mt-4 w-full bg-[#F2EFE9] rounded-xl p-3 text-sm text-[#2F3538] break-all" data-testid="qr-url">
            {menuUrl}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={copy} className="border-2 border-[#A0522D] text-[#A0522D] hover:bg-[#A0522D]/5 rounded-xl px-4 py-2 font-medium transition-colors inline-flex items-center gap-2" data-testid="copy-link-btn">
              <Copy size={14} /> Copiar link
            </button>
            <a href={qrUrl} download="cardapio-qr.png" className="bg-[#2F3538] text-white hover:bg-[#1C2022] rounded-xl px-4 py-2 font-medium transition-colors inline-flex items-center gap-2" data-testid="download-qr-btn">
              <Download size={14} /> Baixar QR
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
