"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Props {
  mes: Date;
  diaSelecionado: string | null;
  onMudarMes: (mes: Date) => void;
  onSelecionarDia: (diaISO: string) => void;
}

export default function CalendarioMensal({ mes, diaSelecionado, onMudarMes, onSelecionarDia }: Props) {
  const inicio = startOfMonth(mes);
  const fim = endOfMonth(mes);
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  // getDay: 0=Domingo..6=Sábado. Queremos a semana a começar em Segunda.
  const deslocamento = (getDay(inicio) + 6) % 7;
  const celulasVazias = Array.from({ length: deslocamento });

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => onMudarMes(subMonths(mes, 1))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold capitalize text-slate-800">
          {format(mes, "MMMM 'de' yyyy", { locale: pt })}
        </span>
        <button
          onClick={() => onMudarMes(addMonths(mes, 1))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Mês seguinte"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulasVazias.map((_, i) => (
          <div key={`vazia-${i}`} />
        ))}
        {dias.map((dia) => {
          const iso = format(dia, "yyyy-MM-dd");
          const selecionado = diaSelecionado === iso;
          return (
            <button
              key={iso}
              onClick={() => onSelecionarDia(iso)}
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                selecionado
                  ? "bg-brand-600 text-white shadow-sm"
                  : isToday(dia)
                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                    : isSameMonth(dia, mes)
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-slate-300"
              }`}
            >
              {format(dia, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
