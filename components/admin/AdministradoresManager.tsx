"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Admin } from "@/lib/types";
import { formatarDataHoraLisboa } from "@/lib/timezone";
import { Plus, ShieldCheck, UserCircle2, Pencil, Trash2, Loader2 } from "lucide-react";
import AdminFormModal from "./AdminFormModal";
import AdminEditModal from "./AdminEditModal";

export default function AdministradoresManager() {
  const supabase = createClient();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Admin | null>(null);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  async function carregar() {
    setACarregar(true);
    const { data } = await supabase
      .from("admins")
      .select("*")
      .order("criado_em")
      .returns<Admin[]>();
    setAdmins(data ?? []);
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function eliminar(a: Admin) {
    if (!window.confirm(`Eliminar o administrador "${a.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setAEliminar(a.id);
    const resposta = await fetch(`/api/admin/administradores/${a.id}`, { method: "DELETE" });
    const resultado = await resposta.json();
    setAEliminar(null);

    if (!resposta.ok) {
      alert(resultado.erro ?? "Não foi possível eliminar o administrador.");
      return;
    }

    carregar();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Administradores</h1>
          <p className="text-sm text-slate-500">Quem tem acesso ao painel de gestão.</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus size={18} /> Novo Administrador
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Administrador</th>
              <th className="px-4 py-3">Nome de utilizador</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {aCarregar && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  A carregar...
                </td>
              </tr>
            )}
            {!aCarregar && admins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum administrador registado.
                </td>
              </tr>
            )}
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="flex items-center gap-3 px-4 py-3">
                  <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-600">
                    {a.foto_url ? (
                      <Image src={a.foto_url} alt={a.nome} fill sizes="36px" className="object-cover" />
                    ) : (
                      <UserCircle2 size={20} />
                    )}
                  </div>
                  <span className="font-medium text-slate-800">{a.nome}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.nome_utilizador}</td>
                <td className="px-4 py-3 text-slate-500">{formatarDataHoraLisboa(a.criado_em)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      a.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ShieldCheck size={12} /> {a.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditando(a)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    {a.id !== meuId && (
                      <button
                        onClick={() => eliminar(a)}
                        disabled={aEliminar === a.id}
                        className="rounded p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                        title="Eliminar"
                      >
                        {aEliminar === a.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <AdminFormModal
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}

      {editando && (
        <AdminEditModal
          admin={editando}
          onFechar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}
