"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LinhaRelatorioPonto } from "@/lib/types";
import { formatarDataPT, nomeDiaSemanaPT } from "@/lib/timezone";
import { exportarRelatorioExcel } from "@/lib/excel";
import { X, FileSpreadsheet, Loader2, LayoutGrid } from "lucide-react";

interface Props {
  dataInicio: string;
  dataFim: string;
  funcionarioIds: string[] | null;
  onFechar: () => void;
}

const CORES_SITUACAO: Record<string, string> = {
  Trabalhado: "bg-emerald-50 text-emerald-700",
  Incompleto: "bg-amber-50 text-amber-700",
  Falta: "bg-rose-50 text-rose-700",
  Folga: "bg-slate-100 text-slate-600",
  Férias: "bg-indigo-50 text-indigo-700",
  "Sem registo": "bg-slate-50 text-slate-400",
};

const ABA_RESUMO = "__resumo__";

export default function RelatorioModal({ dataInicio, dataFim, funcionarioIds, onFechar }: Props) {
  const supabase = createClient();
  const [linhas, setLinhas] = useState<LinhaRelatorioPonto[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aExportar, setAExportar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<string>(ABA_RESUMO);

  useEffect(() => {
    setACarregar(true);
    setErro(null);
    supabase
      .rpc("obter_relatorio_ponto", {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
        p_funcionario_ids: funcionarioIds,
      })
      .then(({ data, error }) => {
        if (error) {
          setErro("Não foi possível carregar o relatório.");
        } else {
          setLinhas((data as LinhaRelatorioPonto[] | null) ?? []);
        }
        setACarregar(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, funcionarioIds]);

  const porFuncionario = useMemo(() => {
    const grupos = new Map<string, LinhaRelatorioPonto[]>();
    for (const linha of linhas) {
      const lista = grupos.get(linha.nome_completo) ?? [];
      lista.push(linha);
      grupos.set(linha.nome_completo, lista);
    }
    return Array.from(grupos.entries()).map(([nome, registos]) => ({
      nome,
      registos,
      subtotal: registos.reduce((s, r) => s + (r.total_horas || 0), 0),
      subtotalExtra: registos.reduce((s, r) => s + (r.horas_extra || 0), 0),
      diasTrabalhados: registos.filter((r) => r.situacao === "Trabalhado" || r.situacao === "Incompleto").length,
      faltas: registos.filter((r) => r.situacao === "Falta").length,
      folgas: registos.filter((r) => r.situacao === "Folga").length,
      ferias: registos.filter((r) => r.situacao === "Férias").length,
    }));
  }, [linhas]);

  const datasUnicas = useMemo(() => Array.from(new Set(linhas.map((l) => l.data))).sort(), [linhas]);

  const horasPorDataEColaborador = useMemo(() => {
    const mapa = new Map<string, Map<string, number>>();
    for (const l of linhas) {
      if (!mapa.has(l.data)) mapa.set(l.data, new Map());
      mapa.get(l.data)!.set(l.nome_completo, l.total_horas || 0);
    }
    return mapa;
  }, [linhas]);

  const totalPorDia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const data of datasUnicas) {
      const porColaborador = horasPorDataEColaborador.get(data);
      const total = porColaborador ? Array.from(porColaborador.values()).reduce((s, h) => s + h, 0) : 0;
      mapa.set(data, total);
    }
    return mapa;
  }, [datasUnicas, horasPorDataEColaborador]);

  const totalGeral = useMemo(() => linhas.reduce((s, l) => s + (l.total_horas || 0), 0), [linhas]);

  useEffect(() => {
    setAbaAtiva(ABA_RESUMO);
  }, [linhas]);

  const funcionarioAtivo = porFuncionario.find((p) => p.nome === abaAtiva);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Relatório de Ponto</h2>
            <p className="text-sm text-slate-500">
              {dataInicio === dataFim
                ? formatarDataPT(dataInicio)
                : `${formatarDataPT(dataInicio)} a ${formatarDataPT(dataFim)}`}{" "}
              ·{" "}
              {!funcionarioIds || funcionarioIds.length === 0
                ? "Todos os funcionários"
                : funcionarioIds.length === 1
                  ? "1 funcionário"
                  : `${funcionarioIds.length} funcionários`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAExportar(true);
                exportarRelatorioExcel(linhas, "relatorio-ponto-anl", dataInicio, dataFim).finally(() => setAExportar(false));
              }}
              disabled={linhas.length === 0 || aExportar}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {aExportar ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />} Exportar Excel
            </button>
            <button onClick={onFechar} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        {aCarregar && (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="animate-spin" size={20} /> A gerar relatório...
          </div>
        )}

        {erro && <div className="mx-6 mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</div>}

        {!aCarregar && !erro && linhas.length === 0 && (
          <p className="py-16 text-center text-slate-400">Sem registos para o período selecionado.</p>
        )}

        {!aCarregar && !erro && linhas.length > 0 && (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-6 pt-2">
              <button
                onClick={() => setAbaAtiva(ABA_RESUMO)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${
                  abaAtiva === ABA_RESUMO
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid size={15} /> Resumo
              </button>
              {porFuncionario.map(({ nome }) => (
                <button
                  key={nome}
                  onClick={() => setAbaAtiva(nome)}
                  className={`shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${
                    abaAtiva === nome
                      ? "border-brand-600 text-brand-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {nome}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {abaAtiva === ABA_RESUMO && (
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2">Data</th>
                        <th className="px-3 py-2">Dia</th>
                        {porFuncionario.map(({ nome }) => (
                          <th key={nome} className="px-3 py-2 text-right">
                            {nome}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right">Total do Dia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {datasUnicas.map((data) => (
                        <tr key={data}>
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 text-slate-700">{formatarDataPT(data)}</td>
                          <td className="px-3 py-2 text-slate-500">{nomeDiaSemanaPT(data)}</td>
                          {porFuncionario.map(({ nome }) => {
                            const horas = horasPorDataEColaborador.get(data)?.get(nome) ?? 0;
                            return (
                              <td key={nome} className="px-3 py-2 text-right text-slate-700">
                                {horas > 0 ? `${horas.toFixed(2)}h` : "—"}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {(totalPorDia.get(data) ?? 0).toFixed(2)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold text-slate-800">
                        <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2" colSpan={2}>
                          Total do funcionário
                        </td>
                        {porFuncionario.map(({ nome, subtotal }) => (
                          <td key={nome} className="px-3 py-2 text-right">
                            {subtotal.toFixed(2)}h
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right text-brand-700">{totalGeral.toFixed(2)}h</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {funcionarioAtivo && (
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Dia</th>
                        <th className="px-3 py-2">Entrada</th>
                        <th className="px-3 py-2">Saída</th>
                        <th className="px-3 py-2">Situação</th>
                        <th className="px-3 py-2 text-right">Horas</th>
                        <th className="px-3 py-2 text-right">Hora Extra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {funcionarioAtivo.registos.map((r) => (
                        <tr key={`${r.funcionario_id}-${r.data}`}>
                          <td className="px-3 py-2 text-slate-700">{formatarDataPT(r.data)}</td>
                          <td className="px-3 py-2 text-slate-500">{nomeDiaSemanaPT(r.data)}</td>
                          <td className="px-3 py-2 text-slate-700">{r.hora_entrada ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{r.hora_saida ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_SITUACAO[r.situacao]}`}>
                              {r.situacao}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700">{r.total_horas.toFixed(2)}h</td>
                          <td className="px-3 py-2 text-right font-medium text-orange-600">
                            {r.horas_extra > 0 ? `+${r.horas_extra.toFixed(2)}h` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold text-slate-800">
                        <td colSpan={5} className="px-3 py-2 text-right">
                          Total do funcionário
                        </td>
                        <td className="px-3 py-2 text-right">{funcionarioAtivo.subtotal.toFixed(2)}h</td>
                        <td className="px-3 py-2 text-right text-orange-700">
                          {funcionarioAtivo.subtotalExtra > 0 ? `+${funcionarioAtivo.subtotalExtra.toFixed(2)}h` : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
