import React, { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, UserCog, Shield, ChefHat, HandPlatter, Wallet } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../lib/api";

const ROLES = [
  { key: "admin",   label: "Administrador", icon: Shield,      color: "#A0522D" },
  { key: "manager", label: "Gerente",       icon: UserCog,     color: "#205427" },
  { key: "waiter",  label: "Garçom",        icon: HandPlatter, color: "#303226" },
  { key: "kitchen", label: "Cozinha",       icon: ChefHat,     color: "#D97706" },
  { key: "cashier", label: "Caixa",         icon: Wallet,      color: "#7C3AED" },
];

const EMPTY = { email: "", password: "", name: "", role: "waiter" };

export default function AdminStaff() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/staff");
      setList(data);
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    try {
      if (editing.id) {
        const body = { name: editing.name, role: editing.role };
        if (editing.password) body.password = editing.password;
        await api.put(`/staff/${editing.id}`, body);
        toast.success("Funcionário atualizado");
      } else {
        await api.post("/staff", editing);
        toast.success("Funcionário criado");
      }
      setEditing(null); reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remover este funcionário?")) return;
    try { await api.delete(`/staff/${id}`); toast.success("Removido"); reload(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#2F3538]" data-testid="staff-title">Equipe</h1>
          <p className="text-sm text-[#6B7280]">{list.length} funcionário(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium inline-flex items-center gap-2"
          data-testid="new-staff-btn"
        >
          <Plus size={16} /> Novo funcionário
        </button>
      </div>

      {loading ? (
        <div className="text-[#6B7280]">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="staff-grid">
          {list.map((u) => {
            const role = ROLES.find((r) => r.key === u.role) || ROLES[0];
            const Ico = role.icon;
            return (
              <div key={u.id} className="bg-white border border-[#EAE6DF] rounded-2xl p-4 flex items-center gap-3" data-testid={`staff-row-${u.id}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: role.color }}>
                  <Ico size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#2F3538] truncate">{u.name}</div>
                  <div className="text-xs text-[#6B7280] truncate">{u.email} · {role.label}</div>
                </div>
                <button onClick={() => setEditing({ id: u.id, email: u.email, name: u.name, role: u.role, password: "" })} className="p-2 rounded-lg hover:bg-[#F2EFE9] text-[#2F3538]" data-testid={`edit-staff-${u.id}`}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(u.id)} className="p-2 rounded-lg hover:bg-[#DC2626]/10 text-[#DC2626]" data-testid={`delete-staff-${u.id}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl" onClick={(e) => e.stopPropagation()} data-testid="staff-modal">
            <div className="border-b border-[#EAE6DF] px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-[#2F3538]">{editing.id ? "Editar" : "Novo funcionário"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-[#F2EFE9]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Nome</label>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]" data-testid="staff-name-input" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">E-mail</label>
                <input type="email" value={editing.email} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D] disabled:bg-[#F2EFE9]" data-testid="staff-email-input" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1.5">Senha {editing.id && "(deixe vazio p/ manter)"}</label>
                <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#A0522D]" data-testid="staff-password-input" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-2">Cargo</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const Ico = r.icon;
                    const active = editing.role === r.key;
                    return (
                      <button key={r.key} type="button" onClick={() => setEditing({ ...editing, role: r.key })}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${active ? "border-[#A0522D] bg-[#A0522D]/5" : "border-[#EAE6DF] bg-white hover:border-[#A0522D]/40"}`}
                        data-testid={`role-${r.key}`}>
                        <Ico size={16} style={{ color: r.color }} />
                        <span className="text-sm font-medium text-[#2F3538]">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="border-t border-[#EAE6DF] px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-xl px-5 py-2.5 font-medium text-[#2F3538] hover:bg-[#F2EFE9]">Cancelar</button>
              <button onClick={save} className="bg-[#A0522D] text-white hover:bg-[#8A4626] rounded-xl px-5 py-2.5 font-medium" data-testid="staff-save-btn">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
