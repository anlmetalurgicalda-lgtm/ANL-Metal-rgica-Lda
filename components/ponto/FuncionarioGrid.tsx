"use client";

import Image from "next/image";
import type { FuncionarioKiosk } from "@/lib/types";
import { User } from "lucide-react";

interface Props {
  funcionarios: FuncionarioKiosk[];
  onSelecionar: (funcionario: FuncionarioKiosk) => void;
}

export default function FuncionarioGrid({ funcionarios, onSelecionar }: Props) {
  if (funcionarios.length === 0) {
    return (
      <p className="rounded-2xl bg-white/70 px-6 py-10 text-center text-sm text-slate-400 ring-1 ring-slate-100">
        Nenhum colaborador disponível. Peça ao Administrador para os registar.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {funcionarios.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelecionar(f)}
          className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl bg-white/90 p-5 shadow-md shadow-brand-900/5 ring-1 ring-white/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-600/15 active:scale-95"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-transparent to-brand-100/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="relative">
            <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 opacity-0 blur-md transition duration-500 group-hover:opacity-40" />
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-lg transition-all duration-300 group-hover:ring-brand-400 group-hover:scale-105">
              {f.foto_url ? (
                <Image src={f.foto_url} alt={f.nome_completo} fill sizes="96px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                  <User size={36} strokeWidth={1.6} />
                </div>
              )}
            </div>
          </div>

          <span className="line-clamp-2 min-h-[2.5rem] text-center text-sm font-semibold leading-tight text-slate-700 transition-colors group-hover:text-brand-700">
            {f.nome_completo}
          </span>
        </button>
      ))}
    </div>
  );
}
