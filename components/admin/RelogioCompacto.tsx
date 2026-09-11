"use client";

import { useEffect, useState } from "react";
import { formatarDataHoraLisboa } from "@/lib/timezone";
import { Clock } from "lucide-react";

export default function RelogioCompacto() {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const intervalo = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  if (!agora) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Clock size={16} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tabular-nums text-slate-800">{formatarDataHoraLisboa(agora, "HH:mm:ss")}</p>
        <p className="text-xs capitalize text-slate-400">{formatarDataHoraLisboa(agora, "EEEE, dd 'de' MMMM")}</p>
      </div>
    </div>
  );
}
