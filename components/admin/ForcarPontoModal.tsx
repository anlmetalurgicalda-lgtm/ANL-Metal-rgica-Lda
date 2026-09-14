"use client";

import { useState } from "react";
import { formatarDataPT } from "@/lib/timezone";
import { LogIn, LogOut, Loader2, X } from "lucide-react";

interface Props {
  tipo: "entrada" | "saida";
  quantidade: number;
  data: string;
  aProcessar: boolean;
  onFechar: () => void;
  onConfirmar: (usarHorarioPadrao: boolean, horaCustomizada: string | null) => void;
}

const ESTILOS = {
  entrada: {
    icone: "bg-emerald-50 text-emerald-600",
    botao: "bg-emerald-600 hover:bg-emerald-700",
  },
  saida: {
    icone: "bg-rose-50 text-rose-600",
    botao: "bg-rose-600 hover:bg-rose-700",
  },
} as const;

export default function ForcarPontoModal({ tipo, quantidade, data, aProcessar, onFechar, onConfirmar }: Props) {
  const [usarHorarioPadrao, setUsarHorarioPadrao] = useState(true);
  const [horaCustomizada, setHoraCustomizada] = useState(tipo === "entrada" ? "08:00" : "19:00");

  const estilo = ESTILOS[tipo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${estilo.icone}`}>
              {tipo === "entrada" ? <LogIn size={20} /> : <LogOut size={20} />}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Forçar {tipo === "entrada" ? "Entrada" : "Saída"}</h2>
              <p className="text-xs text-slate-500">
                {quantidade} funcionário(s) · {formatarDataPT(data)}
              </p>
            </div>
          </div>
          <button onClick={onFechar} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={usarHorarioPadrao}
            onChange={(e) => setUsarHorarioPadrao(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Usar horários predefinidos de cada funcionário
        </label>

        {!usarHorarioPadrao && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hora exata de {tipo === "entrada" ? "entrada" : "saída"}
            </label>
            <input
              type="time"
              value={horaCustomizada}
              onChange={(e) => setHoraCustomizada(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1 text-xs text-slate-400">Aplicada a todos os funcionários selecionados.</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            disabled={aProcessar}
            onClick={() => onConfirmar(usarHorarioPadrao, usarHorarioPadrao ? null : horaCustomizada)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${estilo.botao}`}
          >
            {aProcessar && <Loader2 className="animate-spin" size={16} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
