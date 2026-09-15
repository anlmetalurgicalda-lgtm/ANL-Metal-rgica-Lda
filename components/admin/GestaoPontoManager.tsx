"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Funcionario, LinhaRelatorioPonto, PontoTipo } from "@/lib/types";
import { dataLisboaISO } from "@/lib/timezone";
import { User, LogIn, LogOut, CalendarOff, Ban, CheckCheck, RotateCcw, Palmtree, Utensils, Coffee } from "lucide-react";
import ForcarPontoModal from "./ForcarPontoModal";

type TipoForcar = "entrada" | "saida_almoco" | "retorno_almoco" | "saida";

interface LinhaGestao {
  funcionario: Funcionario;
  horaEntrada: string | null;
  horaSaidaAlmoco: string | null;
  horaRetornoAlmoco: string | null;
  horaSaida: string | null;
  situacao: string;
  statusRegisto: string | null;
  totalHoras: number;
}

const CORES_SITUACAO: Record<string, string> = {
  Trabalhado: "bg-emerald-50 text-emerald-700",
  Incompleto: "bg-amber-50 text-amber-700",
  Falta: "bg-rose-50 text-rose-700",
  Folga: "bg-slate-100 text-slate-600",
  Férias: "bg-indigo-50 text-indigo-700",
  "Sem registo": "bg-slate-50 text-slate-400",
};

const ROTULOS_STATUS: Record<string, string> = {
  normal: "Normal",
  atraso: "Atraso",
  forcado: "Forçado pelo Admin",
};

export default function GestaoPontoManager() {
  const supabase = createClient();
  const [linhas, setLinhas] = useState<LinhaGestao[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [data, setData] = useState(dataLisboaISO());
  const [aProcessar, setAProcessar] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [modalForcar, setModalForcar] = useState<TipoForcar | null>(null);

  async function carregar() {
    setACarregar(true);
    const [{ data: funcionarios }, { data: relatorio }] = await Promise.all([
      supabase.from("funcionarios").select("*").eq("ativo", true).order("nome_completo").returns<Funcionario[]>(),
      supabase.rpc("obter_relatorio_ponto", { p_data_inicio: data, p_data_fim: data, p_funcionario_ids: null }),
    ]);

    const mapa = new Map(
      ((relatorio as LinhaRelatorioPonto[] | null) ?? []).map((r) => [r.funcionario_id, r])
    );

    setLinhas(
      (funcionarios ?? []).map((f) => {
        const r = mapa.get(f.id);
        return {
          funcionario: f,
          horaEntrada: r?.hora_entrada ?? null,
          horaSaidaAlmoco: r?.hora_saida_almoco ?? null,
          horaRetornoAlmoco: r?.hora_retorno_almoco ?? null,
          horaSaida: r?.hora_saida ?? null,
          situacao: r?.situacao ?? "Sem registo",
          statusRegisto: r?.status_registo ?? null,
          totalHoras: r?.total_horas ?? 0,
        };
      })
    );
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    setSelecionados(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodos() {
    setSelecionados(
      selecionados.size === linhas.length ? new Set() : new Set(linhas.map((l) => l.funcionario.id))
    );
  }

  function pedirForcar(tipo: TipoForcar) {
    if (selecionados.size === 0) {
      setMensagem({ tipo: "erro", texto: "Selecione pelo menos um funcionário." });
      return;
    }
    setMensagem(null);
    setModalForcar(tipo);
  }

  async function aplicar(tipo: PontoTipo, usarHorarioPadrao: boolean, horaCustomizada: string | null) {
    if (selecionados.size === 0) {
      setMensagem({ tipo: "erro", texto: "Selecione pelo menos um funcionário." });
      return;
    }

    setAProcessar(true);
    setMensagem(null);

    const { error } = await supabase.rpc("forcar_ponto_admin", {
      p_funcionario_ids: Array.from(selecionados),
      p_tipo: tipo,
      p_data: data,
      p_usar_horario_padrao: usarHorarioPadrao,
      p_hora_customizada: horaCustomizada,
    });

    setAProcessar(false);
    setModalForcar(null);

    if (error) {
      setMensagem({ tipo: "erro", texto: "Não foi possível aplicar a ação." });
      return;
    }

    const rotulos: Record<PontoTipo, string> = {
      entrada: "Clock In forçado",
      saida_almoco: "Lunch Out forçado",
      retorno_almoco: "Lunch In forçado",
      saida: "Clock Out forçado",
      falta: "Falta marcada",
      folga: "Folga marcada",
      ferias: "Férias marcadas",
    };
    setMensagem({ tipo: "sucesso", texto: `${rotulos[tipo]} para ${selecionados.size} funcionário(s).` });
    carregar();
  }

  async function voltarAoNormal() {
    if (selecionados.size === 0) {
      setMensagem({ tipo: "erro", texto: "Selecione pelo menos um funcionário." });
      return;
    }

    if (!window.confirm(`Repor o estado normal de ${selecionados.size} funcionário(s) nesta data? Isto remove entradas, saídas, faltas ou folgas registadas.`)) {
      return;
    }

    setAProcessar(true);
    setMensagem(null);

    const { error } = await supabase.rpc("limpar_ponto_admin", {
      p_funcionario_ids: Array.from(selecionados),
      p_data: data,
    });

    setAProcessar(false);

    if (error) {
      setMensagem({ tipo: "erro", texto: "Não foi possível repor o estado normal." });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: `Estado normal reposto para ${selecionados.size} funcionário(s).` });
    carregar();
  }

  const totalFalta = linhas.filter((l) => l.situacao === "Falta").length;
  const totalSemRegisto = linhas.filter((l) => l.situacao === "Sem registo").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Gestão de Ponto</h1>
        <p className="text-sm text-slate-500">
          Forçar Clock In/Out, pausa de almoço, faltas, folgas ou férias — individual ou em massa.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => pedirForcar("entrada")}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <LogIn size={16} /> Forçar Clock In
          </button>
          <button
            onClick={() => pedirForcar("saida_almoco")}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            <Utensils size={16} /> Forçar Lunch Out
          </button>
          <button
            onClick={() => pedirForcar("retorno_almoco")}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Coffee size={16} /> Forçar Lunch In
          </button>
          <button
            onClick={() => pedirForcar("saida")}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <LogOut size={16} /> Forçar Clock Out
          </button>
          <button
            disabled={aProcessar}
            onClick={() => aplicar("falta", true, null)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-3 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:opacity-60"
          >
            <Ban size={16} /> Marcar Falta
          </button>
          <button
            disabled={aProcessar}
            onClick={() => aplicar("folga", true, null)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            <CalendarOff size={16} /> Marcar Folga
          </button>
          <button
            disabled={aProcessar}
            onClick={() => aplicar("ferias", true, null)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Palmtree size={16} /> Marcar Férias
          </button>
          <button
            disabled={aProcessar}
            onClick={voltarAoNormal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw size={16} /> Voltar ao Normal
          </button>
        </div>
      </div>

      {mensagem && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
            mensagem.tipo === "sucesso" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {!aCarregar && (totalFalta > 0 || totalSemRegisto > 0) && (
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          {totalSemRegisto > 0 && (
            <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-slate-500 ring-1 ring-slate-200">
              {totalSemRegisto} sem registo hoje
            </span>
          )}
          {totalFalta > 0 && (
            <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700 ring-1 ring-rose-100">
              {totalFalta} em falta
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm text-slate-500">
            {selecionados.size} de {linhas.length} selecionado(s)
          </span>
          <button
            onClick={selecionarTodos}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <CheckCheck size={16} />
            {selecionados.size === linhas.length && linhas.length > 0 ? "Limpar seleção" : "Selecionar todos"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-2"></th>
                <th className="px-4 py-2">Funcionário</th>
                <th className="px-4 py-2">Horário previsto</th>
                <th className="px-4 py-2">Clock In</th>
                <th className="px-4 py-2">Lunch Out</th>
                <th className="px-4 py-2">Lunch In</th>
                <th className="px-4 py-2">Clock Out</th>
                <th className="px-4 py-2">Situação</th>
                <th className="px-4 py-2 text-right">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aCarregar && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    A carregar...
                  </td>
                </tr>
              )}
              {!aCarregar && linhas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Nenhum funcionário ativo.
                  </td>
                </tr>
              )}
              {!aCarregar &&
                linhas.map((l) => {
                  const selecionado = selecionados.has(l.funcionario.id);
                  return (
                    <tr
                      key={l.funcionario.id}
                      onClick={() => alternarSelecao(l.funcionario.id)}
                      className={`cursor-pointer transition ${selecionado ? "bg-brand-50/60" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => alternarSelecao(l.funcionario.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                            {l.funcionario.foto_url ? (
                              <Image
                                src={l.funcionario.foto_url}
                                alt={l.funcionario.nome_completo}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <User size={14} />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-slate-800">{l.funcionario.nome_completo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {l.funcionario.hora_entrada_padrao?.slice(0, 5)} – {l.funcionario.hora_saida_padrao?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{l.horaEntrada ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{l.horaSaidaAlmoco ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{l.horaRetornoAlmoco ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{l.horaSaida ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_SITUACAO[l.situacao]}`}>
                          {l.situacao}
                        </span>
                        {l.statusRegisto && (
                          <span className="ml-1.5 text-xs text-slate-400">{ROTULOS_STATUS[l.statusRegisto]}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                        {l.totalHoras > 0 ? `${l.totalHoras.toFixed(2)}h` : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {modalForcar && (
        <ForcarPontoModal
          tipo={modalForcar}
          quantidade={selecionados.size}
          data={data}
          aProcessar={aProcessar}
          onFechar={() => setModalForcar(null)}
          onConfirmar={(usarHorarioPadrao, horaCustomizada) => aplicar(modalForcar, usarHorarioPadrao, horaCustomizada)}
        />
      )}
    </div>
  );
}
