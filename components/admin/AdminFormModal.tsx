"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { normalizarNomeUtilizador } from "@/lib/auth";
import type { Funcionario } from "@/lib/types";
import { X, Loader2, UserCircle2 } from "lucide-react";

interface Props {
  onFechar: () => void;
  onCriado: () => void;
}

export default function AdminFormModal({ onFechar, onCriado }: Props) {
  const supabase = createClient();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [nome, setNome] = useState("");
  const [nomeUtilizador, setNomeUtilizador] = useState("");
  const [nomeUtilizadorEditadoManualmente, setNomeUtilizadorEditadoManualmente] = useState(false);
  const [senha, setSenha] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("funcionarios")
      .select("*")
      .eq("ativo", true)
      .order("nome_completo")
      .returns<Funcionario[]>()
      .then(({ data }) => setFuncionarios(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aoMudarNome(valor: string) {
    setNome(valor);
    if (!nomeUtilizadorEditadoManualmente) {
      setNomeUtilizador(normalizarNomeUtilizador(valor.split(" ")[0] || ""));
    }
  }

  function aoSelecionarFuncionario(id: string) {
    setFuncionarioId(id);
    const f = funcionarios.find((x) => x.id === id);
    if (f) aoMudarNome(f.nome_completo);
  }

  async function guardar() {
    if (!nome.trim() || !nomeUtilizador.trim() || senha.length < 6) {
      setErro("Preencha o nome, o nome de utilizador e uma palavra-passe com pelo menos 6 caracteres.");
      return;
    }

    setAGuardar(true);
    setErro(null);

    const resposta = await fetch("/api/admin/administradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        nomeUtilizador,
        senha,
        funcionarioId: funcionarioId || null,
      }),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      setAGuardar(false);
      setErro(resultado.erro ?? "Não foi possível criar o administrador.");
      return;
    }

    if (foto && resultado.id) {
      const extensao = foto.name.split(".").pop() || "jpg";
      const caminho = `admins/${resultado.id}/${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from("fotos-funcionarios")
        .upload(caminho, foto, { upsert: true });

      if (!erroUpload) {
        const { data } = supabase.storage.from("fotos-funcionarios").getPublicUrl(caminho);
        await supabase.from("admins").update({ foto_url: data.publicUrl }).eq("id", resultado.id);
      }
    }

    setAGuardar(false);
    onCriado();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Novo Administrador</h2>
          <button onClick={onFechar} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
            {foto ? (
              <Image src={URL.createObjectURL(foto)} alt="Pré-visualização" fill sizes="64px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <UserCircle2 size={32} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Foto de perfil (opcional)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Associar a um colaborador existente (opcional)
        </label>
        <select
          value={funcionarioId}
          onChange={(e) => aoSelecionarFuncionario(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">— Nenhum, é uma conta nova —</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome_completo}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-slate-700">Nome completo</label>
        <input
          value={nome}
          onChange={(e) => aoMudarNome(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Nome de utilizador (para login)</label>
        <input
          value={nomeUtilizador}
          onChange={(e) => {
            setNomeUtilizadorEditadoManualmente(true);
            setNomeUtilizador(normalizarNomeUtilizador(e.target.value));
          }}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="ex.: carlosvhg"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Palavra-passe</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <p className="mb-4 text-xs text-slate-400">Mínimo de 6 caracteres.</p>

        {erro && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</div>}

        <div className="flex justify-end gap-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={aGuardar}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {aGuardar && <Loader2 className="animate-spin" size={16} />}
            Criar Administrador
          </button>
        </div>
      </div>
    </div>
  );
}
