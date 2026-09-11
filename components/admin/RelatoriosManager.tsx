"use client";

import { useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { formatarDataPT, nomeDiaSemanaPT } from "@/lib/timezone";
import { FileBarChart, CalendarDays, CalendarRange } from "lucide-react";
import CalendarioMensal from "./CalendarioMensal";
import RelatorioModal from "./RelatorioModal";
import SeletorFuncionariosRelatorio from "./SeletorFuncionariosRelatorio";

export default function RelatoriosManager() {
  const [funcionarioIds, setFuncionarioIds] = useState<string[]>([]);
  const [mes, setMes] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [periodoModal, setPeriodoModal] = useState<{ inicio: string; fim: string } | null>(null);

  function abrirRelatorioDoDia() {
    if (!diaSelecionado) return;
    setPeriodoModal({ inicio: diaSelecionado, fim: diaSelecionado });
  }

  function abrirRelatorioDoMes() {
    const inicio = format(startOfMonth(mes), "yyyy-MM-dd");
    const fim = format(endOfMonth(mes), "yyyy-MM-dd");
    setPeriodoModal({ inicio, fim });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500">Selecione um dia no calendário ou abra o mês completo.</p>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <SeletorFuncionariosRelatorio selecionados={funcionarioIds} onMudar={setFuncionarioIds} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <CalendarioMensal
          mes={mes}
          diaSelecionado={diaSelecionado}
          onMudarMes={(novoMes) => {
            setMes(novoMes);
            setDiaSelecionado(null);
          }}
          onSelecionarDia={setDiaSelecionado}
        />

        <div className="flex flex-col justify-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">A mostrar o relatório do dia</p>
              <p className="truncate font-semibold text-slate-800">
                {diaSelecionado
                  ? `${nomeDiaSemanaPT(diaSelecionado)}, ${formatarDataPT(diaSelecionado)}`
                  : "Nenhum dia selecionado"}
              </p>
            </div>
            <button
              onClick={abrirRelatorioDoDia}
              disabled={!diaSelecionado}
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Abrir
            </button>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CalendarRange size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">Relatório do mês completo</p>
              <p className="truncate font-semibold capitalize text-slate-800">
                {format(mes, "MMMM 'de' yyyy", { locale: pt })}
              </p>
            </div>
            <button
              onClick={abrirRelatorioDoMes}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <FileBarChart size={16} /> Abrir
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Dentro do relatório encontra o botão para exportar em Excel.
          </p>
        </div>
      </div>

      {periodoModal && (
        <RelatorioModal
          dataInicio={periodoModal.inicio}
          dataFim={periodoModal.fim}
          funcionarioIds={funcionarioIds.length ? funcionarioIds : null}
          onFechar={() => setPeriodoModal(null)}
        />
      )}
    </div>
  );
}
