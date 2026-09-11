"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { FuncionarioKiosk } from "@/lib/types";
import { ArrowLeft, Loader2, User, KeyRound, ShieldAlert } from "lucide-react";
import NumericKeypad from "./NumericKeypad";

interface Props {
  funcionario: FuncionarioKiosk;
  onVoltar: () => void;
  onSucesso: (senha: string) => void;
}

export default function EcraPin({ funcionario, onVoltar, onSucesso }: Props) {
  const supabase = createClient();
  const [senha, setSenha] = useState("");
  const [aVerificar, setAVerificar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (senha.length !== 6) return;
    let cancelado = false;
    setAVerificar(true);
    setErro(null);

    supabase
      .rpc("verificar_senha_funcionario", { p_funcionario_id: funcionario.id, p_senha: senha })
      .then(({ data, error }) => {
        if (cancelado) return;
        setAVerificar(false);
        if (error || !data) {
          setErro("Código incorreto. Tente novamente.");
          setSenha("");
          return;
        }
        onSucesso(senha);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senha]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <button
        onClick={onVoltar}
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-white/90 px-8 pb-8 pt-10 shadow-2xl shadow-brand-900/15 ring-1 ring-white/80 backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-50/80 to-transparent" />

        <div className="relative mb-4">
          <span className="absolute -inset-2 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 opacity-25 blur-md" />
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-xl">
            {funcionario.foto_url ? (
              <Image src={funcionario.foto_url} alt={funcionario.nome_completo} fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                <User size={36} strokeWidth={1.6} />
              </div>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md ring-2 ring-white">
            <KeyRound size={16} strokeWidth={2.4} />
          </span>
        </div>

        <p className="relative text-center text-xl font-bold tracking-tight text-slate-800">{funcionario.nome_completo}</p>
        <p className="relative mb-6 mt-1 text-center text-sm text-slate-500">Introduza o seu código de 6 dígitos</p>

        <div
          className={`mb-3 flex h-6 items-center justify-center gap-2 text-sm font-medium transition-colors ${
            erro && !aVerificar ? "text-rose-600" : "text-brand-600"
          }`}
        >
          {aVerificar && (
            <>
              <Loader2 className="animate-spin" size={15} /> A verificar...
            </>
          )}
          {erro && !aVerificar && (
            <>
              <ShieldAlert size={15} /> {erro}
            </>
          )}
        </div>

        <NumericKeypad valor={senha} onChange={setSenha} erro={!!erro && !aVerificar} />
      </div>
    </div>
  );
}
