"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LinhaRelatorioPonto } from "@/lib/types";
import { formatarDataPT, nomeDiaSemanaPT } from "@/lib/timezone";
import { exportarRelatorioExcel } from "@/lib/excel";
import { X, FileSpreadsheet, Loader2 } from "lucide-react";

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
  "Sem registo": "bg-slate-50 text-slate-400",
};

export default function RelatorioModal({ dataInicio, dataFim, funcionarioIds, onFechar }: Props) {
  const supabase = createClient();
  const [linhas, setLinhas] = useState<LinhaRelatorioPonto[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aExportar, setAExportar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
    return Array.from(grupos.entries());
  }, [linhas]);

  const totalGeral = useMemo(() => linhas.reduce((s, l) => s + (l.total_horas || 0), 0), [linhas]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Relatório de Ponto</h2>
            <p className="text-sm text-slate-500">
              {dataInicio === dataFim
                ? formatarDataPT(dataInicio)
                : `${formatarDataPT(dataInicio)} a ${formatarDataPT(dataFim)}`}{" "}
              ·{" "}
              {!funcionarioIds || funcionarioIds.length === 0
                ? "Todos os colaboradores"
                : funcionarioIds.length === 1
                  ? "1 colaborador"
                  : `${funcionarioIds.length} colaboradores`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAExportar(true);
                exportarRelatorioExcel(linhas, "relatorio-ponto-anl").finally(() => setAExportar(false));
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {aCarregar && (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              <Loader2 className="animate-spin" size={20} /> A gerar relatório...
            </div>
          )}

          {erro && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</div>}

          {!aCarregar && !erro && linhas.length === 0 && (
            <p className="py-16 text-center text-slate-400">Sem registos para o período selecionado.</p>
          )}

          {!aCarregar && !erro && linhas.length > 0 && (
            <div className="space-y-8">
              {porFuncionario.map(([nome, registos]) => {
                const subtotal = registos.reduce((s, r) => s + (r.total_horas || 0), 0);
                return (
                  <div key={nome}>
                    <h3 className="mb-2 font-semibold text-slate-800">{nome}</h3>
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {registos.map((r) => (
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
                              <td className="px-3 py-2 text-right font-medium text-slate-700">
                                {r.total_horas.toFixed(2)}h
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-semibold text-slate-800">
                            <td colSpan={5} className="px-3 py-2 text-right">
                              Total do colaborador
                            </td>
                            <td className="px-3 py-2 text-right">{subtotal.toFixed(2)}h</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <div className="rounded-xl bg-brand-50 px-5 py-3 text-right">
                  <p className="text-xs text-brand-700">Total geral do período</p>
                  <p className="text-xl font-bold text-brand-900">{totalGeral.toFixed(2)}h</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
