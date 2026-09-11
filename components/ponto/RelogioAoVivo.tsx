"use client";

import { useEffect, useState } from "react";
import { formatarDataHoraLisboa } from "@/lib/timezone";

interface Props {
  /** Variante para fundos escuros (texto claro). */
  escuro?: boolean;
}

export default function RelogioAoVivo({ escuro = false }: Props) {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const intervalo = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  if (!agora) return <div className="h-16" />;

  return (
    <div className="relative text-center">
      <div className={`text-5xl font-semibold tabular-nums ${escuro ? "text-white" : "text-brand-900"}`}>
        {formatarDataHoraLisboa(agora, "HH:mm:ss")}
      </div>
      <div className={`mt-1 text-sm capitalize ${escuro ? "text-brand-200" : "text-slate-500"}`}>
        {formatarDataHoraLisboa(agora, "EEEE, dd 'de' MMMM 'de' yyyy")} · Hora de Lisboa
      </div>
    </div>
  );
}
