"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { RegistoAtividadeHoje } from "@/lib/types";
import { dataLisboaISO } from "@/lib/timezone";
import { LogIn, LogOut, Clock, User } from "lucide-react";

const CORES_STATUS: Record<string, string> = {
  normal: "bg-emerald-50 text-emerald-700",
  atraso: "bg-amber-50 text-amber-700",
  forcado: "bg-slate-100 text-slate-600",
};

const ROTULOS_STATUS: Record<string, string> = {
  normal: "Normal",
  atraso: "Atraso",
  forcado: "Forçado",
};

interface LinhaTrabalhador {
  funcionarioId: string;
  nome: string;
  fotoUrl: string | null;
  entrada: RegistoAtividadeHoje | null;
  saida: RegistoAtividadeHoje | null;
}

function Celula({ registo }: { registo: RegistoAtividadeHoje | null }) {
  if (!registo) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-slate-700">{registo.hora_registo_formatada ?? "—"}</span>
      {registo.status && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_STATUS[registo.status]}`}>
          {ROTULOS_STATUS[registo.status]}
          {registo.status === "forcado" && registo.forcado_por_nome ? ` · ${registo.forcado_por_nome}` : ""}
        </span>
      )}
    </div>
  );
}

export default function AtividadeHojeTable() {
  const supabase = createClient();
  const [registos, setRegistos] = useState<RegistoAtividadeHoje[]>([]);
  const [aCarregar, setACarregar] = useState(true);

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

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900">Atividade de hoje</h2>
          <p className="text-sm text-slate-500">Entrada e saída de cada colaborador, em tempo real.</p>
        </div>
        <Clock size={18} className="text-slate-400" />
      </div>

      <div className="max-h-96 overflow-y-auto">
        {aCarregar && <p className="px-5 py-8 text-center text-sm text-slate-400">A carregar...</p>}

        {!aCarregar && porTrabalhador.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Ainda não há registos hoje.</p>
        )}

        {!aCarregar && porTrabalhador.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2">Colaborador</th>
                <th className="px-5 py-2">
                  <span className="inline-flex items-center gap-1">
                    <LogIn size={12} /> Entrada
                  </span>
                </th>
                <th className="px-5 py-2">
                  <span className="inline-flex items-center gap-1">
                    <LogOut size={12} /> Saída
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {porTrabalhador.map((l) => (
                <tr key={l.funcionarioId}>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {l.fotoUrl ? (
                          <Image src={l.fotoUrl} alt={l.nome} fill sizes="32px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <User size={14} />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-800">{l.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <Celula registo={l.entrada} />
                  </td>
                  <td className="px-5 py-2.5">
                    <Celula registo={l.saida} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
