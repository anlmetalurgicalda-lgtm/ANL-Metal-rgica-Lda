"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { FuncionarioKiosk } from "@/lib/types";
import { ArrowLeft, Camera, LogIn, LogOut, Loader2, User, CheckCircle2, AlertTriangle } from "lucide-react";
import RelogioAoVivo from "./RelogioAoVivo";

interface Props {
  funcionario: FuncionarioKiosk;
  senha: string;
  onSair: () => void;
}

type Resultado = { sucesso: boolean; mensagem: string } | null;

export default function EcraPerfil({ funcionario, senha, onSair }: Props) {
  const supabase = createClient();
  const [aEnviar, setAEnviar] = useState(false);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [modoFoto, setModoFoto] = useState(false);
  const [ficheiroFoto, setFicheiroFoto] = useState<File | null>(null);

  async function registar(tipo: "entrada" | "saida") {
    setAEnviar(true);
    setResultado(null);

    const { data, error } = await supabase.rpc("registar_ponto_kiosk", {
      p_funcionario_id: funcionario.id,
      p_senha: senha,
      p_tipo: tipo,
    });

    setAEnviar(false);

    if (error) {
      setResultado({ sucesso: false, mensagem: "Erro de ligação. Tente novamente." });
      return;
    }

    if (data?.sucesso) {
      setResultado({
        sucesso: true,
        mensagem: `${tipo === "entrada" ? "Entrada" : "Saída"} registada às ${data.hora}.`,
      });
      setTimeout(onSair, 2000);
      return;
    }

    const mensagens: Record<string, string> = {
      funcionario_nao_encontrado: "Funcionário não encontrado.",
      ja_registado: `Já existe um registo de ${tipo === "entrada" ? "entrada" : "saída"} hoje.`,
      dia_marcado_falta_folga: "Este dia já está marcado como falta ou folga.",
      fora_da_tolerancia:
        data?.mensagem ??
        "Fora do tempo de tolerância permitido. Apenas o Administrador pode forçar este registo.",
    };

    setResultado({
      sucesso: false,
      mensagem: mensagens[data?.erro] ?? "Não foi possível registar o ponto.",
    });
  }

  async function enviarFoto() {
    if (!ficheiroFoto) {
      setResultado({ sucesso: false, mensagem: "Escolha uma foto primeiro." });
      return;
    }

    setAEnviar(true);
    setResultado(null);

    const extensao = ficheiroFoto.name.split(".").pop() || "jpg";
    const caminho = `pendente/${funcionario.id}/${Date.now()}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("fotos-funcionarios")
      .upload(caminho, ficheiroFoto, { upsert: true });

    if (erroUpload) {
      setAEnviar(false);
      setResultado({ sucesso: false, mensagem: "Falha ao enviar a foto. Tente novamente." });
      return;
    }

    const { data: urlPublica } = supabase.storage.from("fotos-funcionarios").getPublicUrl(caminho);

    const { data, error } = await supabase.rpc("enviar_foto_pendente_kiosk", {
      p_funcionario_id: funcionario.id,
      p_senha: senha,
      p_foto_url: urlPublica.publicUrl,
    });

    setAEnviar(false);

    if (error || !data?.sucesso) {
      setResultado({ sucesso: false, mensagem: "Não foi possível enviar a foto." });
      return;
    }

    setResultado({
      sucesso: true,
      mensagem: "Foto enviada. Fica pendente até ser aprovada pelo Administrador.",
    });
    setTimeout(onSair, 2200);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <button
        onClick={onSair}
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Terminar
      </button>

      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-white/90 px-8 pb-8 pt-10 shadow-2xl shadow-brand-900/15 ring-1 ring-white/80 backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-brand-50/80 to-transparent" />

        {/* Cabeçalho do colaborador */}
        <div className="relative mb-4">
          <span className="absolute -inset-2 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 opacity-25 blur-md" />
          <div className="relative h-28 w-28 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-xl">
            {funcionario.foto_url ? (
              <Image src={funcionario.foto_url} alt={funcionario.nome_completo} fill sizes="112px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                <User size={42} strokeWidth={1.6} />
              </div>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white">
            <CheckCircle2 size={18} strokeWidth={2.4} />
          </span>
        </div>

        <p className="relative text-center text-2xl font-bold tracking-tight text-slate-800">
          Olá, {funcionario.nome_completo.split(" ")[0]}
        </p>
        <p className="relative mt-1 text-center text-sm text-slate-500">{funcionario.nome_completo}</p>

        {/* Relógio em destaque */}
        <div className="relative my-6 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-900 px-6 py-5 shadow-lg shadow-brand-900/30">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <RelogioAoVivo escuro />
        </div>

        {!modoFoto ? (
          <>
            <p className="mb-3 text-center text-sm font-medium text-slate-500">O que pretende registar?</p>
            <div className="grid w-full grid-cols-2 gap-4">
              <button
                disabled={aEnviar}
                onClick={() => registar("entrada")}
                className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 py-7 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-110">
                  {aEnviar ? <Loader2 className="animate-spin" size={28} /> : <LogIn size={28} />}
                </span>
                <span className="text-lg">Entrada</span>
              </button>
              <button
                disabled={aEnviar}
                onClick={() => registar("saida")}
                className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 py-7 font-semibold text-white shadow-lg shadow-rose-600/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-600/40 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-110">
                  {aEnviar ? <Loader2 className="animate-spin" size={28} /> : <LogOut size={28} />}
                </span>
                <span className="text-lg">Saída</span>
              </button>
            </div>

            <button
              onClick={() => setModoFoto(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-300"
            >
              <Camera size={16} /> Mudar foto de perfil
            </button>
          </>
        ) : (
          <div className="w-full animate-fade-in-up">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                <Camera size={22} />
              </span>
              <span className="text-sm font-medium text-slate-700">
                {ficheiroFoto ? ficheiroFoto.name : "Toque para escolher uma foto"}
              </span>
              <span className="text-xs text-slate-400">PNG, JPG ou WEBP</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFicheiroFoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <p className="my-3 text-center text-xs text-slate-500">
              A nova foto fica pendente até ser aprovada pelo Administrador.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModoFoto(false)}
                className="rounded-xl bg-white py-3 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                disabled={aEnviar}
                onClick={enviarFoto}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-medium text-white shadow-md shadow-brand-600/30 transition hover:from-brand-400 hover:to-brand-500 disabled:opacity-60"
              >
                {aEnviar && <Loader2 className="animate-spin" size={16} />}
                Enviar foto
              </button>
            </div>
          </div>
        )}

        {resultado && (
          <div
            className={`mt-5 flex w-full animate-fade-in-up items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium ring-1 ${
              resultado.sucesso
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-rose-50 text-rose-800 ring-rose-200"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                resultado.sucesso ? "bg-emerald-500" : "bg-rose-500"
              }`}
            >
              {resultado.sucesso ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </span>
            <span>{resultado.mensagem}</span>
          </div>
        )}
      </div>
    </div>
  );
}
