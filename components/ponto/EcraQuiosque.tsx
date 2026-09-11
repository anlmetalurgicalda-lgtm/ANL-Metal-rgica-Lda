"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { FuncionarioKiosk } from "@/lib/types";
import RelogioAoVivo from "./RelogioAoVivo";
import FuncionarioGrid from "./FuncionarioGrid";
import EcraPin from "./EcraPin";
import EcraPerfil from "./EcraPerfil";
import { Clock, ArrowLeft, Fingerprint, ChevronRight, Users } from "lucide-react";

type Fase = "inicial" | "grelha" | "pin" | "perfil";

const TEMPO_INATIVIDADE_MS = 45_000;

export default function EcraQuiosque({ funcionarios }: { funcionarios: FuncionarioKiosk[] }) {
  const [fase, setFase] = useState<Fase>("inicial");
  const [selecionado, setSelecionado] = useState<FuncionarioKiosk | null>(null);
  const [senhaVerificada, setSenhaVerificada] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function voltarAoInicio() {
    setFase("inicial");
    setSelecionado(null);
    setSenhaVerificada("");
  }

  function reiniciarTemporizador() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(voltarAoInicio, TEMPO_INATIVIDADE_MS);
  }

  useEffect(() => {
    if (fase === "inicial") {
      if (temporizador.current) clearTimeout(temporizador.current);
      return;
    }
    reiniciarTemporizador();
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-slate-100"
      onClick={fase !== "inicial" ? reiniciarTemporizador : undefined}
    >
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-12">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <div className="group relative">
            {/* Halo laranja da marca + brilho que percorre a logo */}
            <span className="logo-halo pointer-events-none absolute -inset-6 rounded-full blur-2xl animate-glow" />
            <span className="pointer-events-none absolute -inset-1 rounded-[1.75rem] bg-gradient-to-tr from-anl-laranja/40 to-indigo-500/35 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/85 p-1.5 shadow-xl shadow-brand-900/10 backdrop-blur-sm transition-transform duration-500 group-hover:-translate-y-1 sm:h-32 sm:w-32">
              <span className="pointer-events-none absolute inset-0 rounded-[1.6rem] ring-1 ring-inset ring-white/60" />
              <span className="logo-sheen pointer-events-none absolute -inset-y-6 -left-1/2 w-1/2 -skew-x-12 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
              <Image
                src="/logo-icon.png"
                alt="ANL Metalúrgica Lda"
                width={112}
                height={112}
                priority
                className="relative h-full w-auto object-contain transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">ANL Metalúrgica Lda</h1>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Controlo de Ponto</p>
          </div>
          {fase === "inicial" && <RelogioAoVivo />}
        </div>

        {fase === "inicial" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <button
              onClick={() => setFase("grelha")}
              className="group relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl bg-white/90 px-14 py-12 shadow-2xl shadow-brand-900/15 backdrop-blur-md ring-1 ring-white/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-brand-600/20 hover:shadow-2xl active:scale-95"
            >
              {/* Efeito de brilho de fundo no hover */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/50 via-transparent to-brand-100/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Ícone estilizado com anéis de pulso e gradiente moderno */}
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-2 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 opacity-20 blur-md transition duration-500 group-hover:opacity-40 group-hover:blur-lg" />
                <span className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 text-white shadow-xl shadow-brand-600/30 ring-4 ring-white/80 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-brand-500/50">
                  <Fingerprint className="h-12 w-12 stroke-[1.8] transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-600 shadow-md ring-2 ring-brand-100">
                    <Clock className="h-4 w-4 stroke-[2.5]" />
                  </span>
                </span>
              </div>

              {/* Textos de ação */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-800 transition-colors group-hover:text-brand-700">
                    Registar Ponto
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-600" />
                </div>
                <span className="text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-600">
                  Toque para escolher o seu perfil
                </span>
              </div>
            </button>
          </div>
        )}

        {fase === "grelha" && (
          <div className="w-full animate-fade-in-up">
            <button
              onClick={voltarAoInicio}
              className="mb-6 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <div className="mb-8 text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-100">
                <Users size={14} /> Quem é você?
              </span>
              <p className="text-sm text-slate-500">Selecione a sua fotografia para registar entrada ou saída.</p>
            </div>
            <FuncionarioGrid
              funcionarios={funcionarios}
              onSelecionar={(f) => {
                setSelecionado(f);
                setFase("pin");
              }}
            />
          </div>
        )}

        {fase === "pin" && selecionado && (
          <div className="flex w-full flex-1 animate-fade-in-up items-center justify-center">
            <EcraPin
              funcionario={selecionado}
              onVoltar={() => setFase("grelha")}
              onSucesso={(senha) => {
                setSenhaVerificada(senha);
                setFase("perfil");
              }}
            />
          </div>
        )}

        {fase === "perfil" && selecionado && (
          <div className="flex w-full flex-1 animate-fade-in-up items-center justify-center">
            <EcraPerfil funcionario={selecionado} senha={senhaVerificada} onSair={voltarAoInicio} />
          </div>
        )}

        {fase === "inicial" && (
          <div className="mt-10 text-center text-xs text-slate-400">
            <a href="/admin/login" className="underline hover:text-slate-600">
              Acesso do Administrador
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
