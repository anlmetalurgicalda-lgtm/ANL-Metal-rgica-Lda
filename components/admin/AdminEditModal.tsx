"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Admin } from "@/lib/types";
import { X, Loader2, UserCircle2 } from "lucide-react";

interface Props {
  admin: Admin;
  onFechar: () => void;
  onGuardado: () => void;
}

export default function AdminEditModal({ admin, onFechar, onGuardado }: Props) {
  const supabase = createClient();
  const [nome, setNome] = useState(admin.nome);
  const [foto, setFoto] = useState<File | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function guardar() {
    if (!nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    if (novaSenha && novaSenha.length < 6) {
      setErro("A nova palavra-passe tem de ter pelo menos 6 caracteres.");
      return;
    }

    setAGuardar(true);
    setErro(null);

    let fotoUrl = admin.foto_url;
    if (foto) {
      const extensao = foto.name.split(".").pop() || "jpg";
      const caminho = `admins/${admin.id}/${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from("fotos-funcionarios")
        .upload(caminho, foto, { upsert: true });

      if (erroUpload) {
        setAGuardar(false);
        setErro("Não foi possível enviar a foto.");
        return;
      }
      const { data } = supabase.storage.from("fotos-funcionarios").getPublicUrl(caminho);
      fotoUrl = data.publicUrl;
    }

    const { error: erroUpdate } = await supabase
      .from("admins")
      .update({ nome, foto_url: fotoUrl })
      .eq("id", admin.id);

    if (erroUpdate) {
      setAGuardar(false);
      setErro("Não foi possível guardar as alterações.");
      return;
    }

    if (novaSenha) {
      const resposta = await fetch(`/api/admin/administradores/${admin.id}/senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: novaSenha }),
      });
      if (!resposta.ok) {
        const resultado = await resposta.json();
        setAGuardar(false);
        setErro(resultado.erro ?? "Não foi possível alterar a palavra-passe.");
        return;
      }
    }

    setAGuardar(false);
    onGuardado();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Editar Administrador</h2>
          <button onClick={onFechar} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-slate-100">
            {foto ? (
              <Image src={URL.createObjectURL(foto)} alt={nome} fill sizes="64px" className="object-cover" />
            ) : admin.foto_url ? (
              <Image src={admin.foto_url} alt={nome} fill sizes="64px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <UserCircle2 size={32} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Foto de perfil</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">Nome completo</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Nome de utilizador</label>
        <input
          value={admin.nome_utilizador}
          disabled
          className="mb-4 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Nova palavra-passe (opcional)</label>
        <input
          type="password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="Deixe em branco para manter a atual"
        />

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
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
