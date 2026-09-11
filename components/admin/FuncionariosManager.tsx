"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Funcionario } from "@/lib/types";
import { Plus, Pencil, User, Check, X as XIcon, Ban, CheckCircle2 } from "lucide-react";
import FuncionarioFormModal from "./FuncionarioFormModal";

const NOMES_DIAS = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function FuncionariosManager() {
  const supabase = createClient();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);

  async function carregar() {
    setACarregar(true);
    const { data } = await supabase
      .from("funcionarios")
      .select("*")
      .order("nome_completo")
      .returns<Funcionario[]>();
    setFuncionarios(data ?? []);
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function aprovarFoto(id: string) {
    await supabase.rpc("aprovar_foto_funcionario", { p_funcionario_id: id });
    carregar();
  }

  async function rejeitarFoto(id: string) {
    await supabase.rpc("rejeitar_foto_funcionario", { p_funcionario_id: id });
    carregar();
  }

  async function alternarAtivo(f: Funcionario) {
    await supabase.from("funcionarios").update({ ativo: !f.ativo }).eq("id", f.id);
    carregar();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Funcionários</h1>
          <p className="text-sm text-slate-500">Colaboradores, horários e fotos de perfil.</p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setModalAberto(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus size={18} /> Novo Colaborador
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">Horário</th>
              <th className="px-4 py-3">Dias</th>
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
            {!aCarregar && funcionarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum colaborador registado.
                </td>
              </tr>
            )}
            {funcionarios.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                    {f.foto_url ? (
                      <Image src={f.foto_url} alt={f.nome_completo} fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{f.nome_completo}</p>
                    <p className="text-xs text-slate-400">{f.numero_funcionario || "—"}</p>
                    {f.foto_status === "pendente" && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Foto pendente
                        </span>
                        <button onClick={() => aprovarFoto(f.id)} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50" title="Aprovar foto">
                          <Check size={14} />
                        </button>
                        <button onClick={() => rejeitarFoto(f.id)} className="rounded p-0.5 text-rose-600 hover:bg-rose-50" title="Rejeitar foto">
                          <XIcon size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {f.hora_entrada_padrao?.slice(0, 5)} – {f.hora_saida_padrao?.slice(0, 5)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {f.dias_trabalho.map((d) => NOMES_DIAS[d]).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      f.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {f.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditando(f);
                      setModalAberto(true);
                    }}
                    className="mr-1 rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => alternarAtivo(f)}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                    title={f.ativo ? "Desativar" : "Ativar"}
                  >
                    {f.ativo ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <FuncionarioFormModal
          funcionario={editando}
          onFechar={() => setModalAberto(false)}
          onGuardado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}
