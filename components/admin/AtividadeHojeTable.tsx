"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { RegistoAtividadeHoje } from "@/lib/types";
import { dataLisboaISO, formatarDataPT } from "@/lib/timezone";
import { ChevronRight, Clock, User, Users } from "lucide-react";

const ROTULOS_STATUS: Record<string, string> = {
  atraso: "Atraso",
  forcado: "Forçado",
};

const CORES_STATUS: Record<string, string> = {
  atraso: "bg-amber-50 text-amber-700",
  forcado: "bg-slate-100 text-slate-500",
};

interface LinhaTrabalhador {
  funcionarioId: string;
  nome: string;
  fotoUrl: string | null;
  entrada: RegistoAtividadeHoje | null;
  saida: RegistoAtividadeHoje | null;
}

type Filtro = "todos" | "sem_saida";

export default function AtividadeHojeTable() {
  const supabase = createClient();
  const [registos, setRegistos] = useState<RegistoAtividadeHoje[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  async function carregar() {
    const hoje = dataLisboaISO();
    const { data } = await supabase
      .from("vw_registos_detalhados")
      .select("*")
      .eq("data", hoje)
      .in("tipo", ["entrada", "saida"])
      .order("hora_registo_local", { ascending: false })
      .returns<RegistoAtividadeHoje[]>();
    setRegistos(data ?? []);
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel("atividade-hoje")
      .on("postgres_changes", { event: "*", schema: "public", table: "registos_ponto" }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porTrabalhador = useMemo(() => {
    const mapa = new Map<string, LinhaTrabalhador>();
    for (const r of registos) {
      const atual = mapa.get(r.funcionario_id) ?? {
        funcionarioId: r.funcionario_id,
        nome: r.nome_completo,
        fotoUrl: r.foto_url,
        entrada: null,
        saida: null,
      };
      if (r.tipo === "entrada") atual.entrada = r;
      else atual.saida = r;
      mapa.set(r.funcionario_id, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [registos]);

  const semSaida = useMemo(() => porTrabalhador.filter((l) => l.entrada && !l.saida), [porTrabalhador]);
  const visiveis = filtro === "sem_saida" ? semSaida : porTrabalhador;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900">Atividade de hoje</h2>
          <p className="text-sm text-slate-500">Clock In e Clock Out de cada funcionário, em tempo real.</p>
        </div>
        <Clock size={18} className="text-slate-400" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Já fizeram Clock In · {formatarDataPT(dataLisboaISO())}
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-100">
          <button
            onClick={() => setFiltro("todos")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filtro === "todos" ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Users size={12} /> Todos
            <span className={filtro === "todos" ? "text-white/80" : "text-slate-400"}>{porTrabalhador.length}</span>
          </button>
          <button
            onClick={() => setFiltro("sem_saida")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filtro === "sem_saida" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${filtro === "sem_saida" ? "bg-white" : "bg-amber-400"}`}
            />
            Sem Clock Out
            <span className={filtro === "sem_saida" ? "text-white/80" : "text-slate-400"}>{semSaida.length}</span>
          </button>
        </div>
      </div>

      <div className="max-h-[28rem] space-y-2 overflow-y-auto p-3">
        {aCarregar && <p className="px-2 py-8 text-center text-sm text-slate-400">A carregar...</p>}

        {!aCarregar && visiveis.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-slate-400">
            {filtro === "sem_saida" ? "Todos os que fizeram Clock In já registaram Clock Out." : "Ainda não há registos hoje."}
          </p>
        )}

        {!aCarregar &&
          visiveis.map((l) => (
            <div
              key={l.funcionarioId}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:shadow-sm"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white">
                {l.fotoUrl ? (
                  <Image src={l.fotoUrl} alt={l.nome} fill sizes="40px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                )}
              </div>

              <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{l.nome}</span>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <HoraChip registo={l.entrada} tipo="entrada" />
                <ChevronRight size={14} className="shrink-0 text-slate-300" />
                {l.saida ? (
                  <HoraChip registo={l.saida} tipo="saida" />
                ) : (
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    Ainda no local
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function HoraChip({ registo, tipo }: { registo: RegistoAtividadeHoje | null; tipo: "entrada" | "saida" }) {
  if (!registo) {
    return (
      <span className="whitespace-nowrap rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-300">—</span>
    );
  }

  const cor = tipo === "entrada" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  const ponto = tipo === "entrada" ? "bg-emerald-500" : "bg-rose-500";

  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ponto}`} />
      {registo.hora_registo_formatada ?? "—"}
      {registo.status && registo.status !== "normal" && (
        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CORES_STATUS[registo.status]}`}>
          {ROTULOS_STATUS[registo.status]}
        </span>
      )}
    </span>
  );
}
