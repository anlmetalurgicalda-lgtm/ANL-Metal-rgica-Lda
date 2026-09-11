"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notificacao } from "@/lib/types";
import { formatarDataHoraLisboa } from "@/lib/timezone";
import { Bell, Camera, AlertTriangle, ShieldAlert, Info } from "lucide-react";

const ICONES: Record<Notificacao["tipo"], JSX.Element> = {
  foto_pendente: <Camera size={16} className="text-brand-600" />,
  falta_nao_justificada: <AlertTriangle size={16} className="text-amber-600" />,
  atraso_bloqueado: <ShieldAlert size={16} className="text-rose-600" />,
  info: <Info size={16} className="text-slate-500" />,
};

export default function NotificacoesPanel() {
  const supabase = createClient();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  async function carregar() {
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(30)
      .returns<Notificacao[]>();
    setNotificacoes(data ?? []);
  }

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel("notificacoes-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes" }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marcarLida(id: string) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    carregar();
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white">
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] rounded-xl bg-white shadow-xl ring-1 ring-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-medium text-slate-900">Notificações</h3>
            <span className="text-xs text-slate-400">{notificacoes.length} recentes</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Sem notificações.</p>
            )}
            {notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.lida && marcarLida(n.id)}
                className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  n.lida ? "opacity-60" : "bg-brand-50/40"
                }`}
              >
                <div className="mt-0.5">{ICONES[n.tipo]}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{n.titulo}</p>
                  <p className="text-xs text-slate-500">{n.mensagem}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatarDataHoraLisboa(n.criado_em)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
