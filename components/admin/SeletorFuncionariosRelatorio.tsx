"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Funcionario } from "@/lib/types";
import { Check, User, Users } from "lucide-react";

interface Props {
  selecionados: string[];
  onMudar: (ids: string[]) => void;
}

export default function SeletorFuncionariosRelatorio({ selecionados, onMudar }: Props) {
  const supabase = createClient();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  useEffect(() => {
    supabase
      .from("funcionarios")
      .select("*")
      .order("nome_completo")
      .returns<Funcionario[]>()
      .then(({ data }) => setFuncionarios(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todosAtivo = selecionados.length === 0;

  function alternar(id: string) {
    onMudar(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">Funcionários</label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onMudar([])}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-2 pr-3.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 ${
            todosAtivo
              ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
              : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-transparent hover:bg-slate-200"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              todosAtivo ? "bg-white text-brand-600" : "bg-white text-slate-400"
            }`}
          >
            <Users size={14} />
          </span>
          Todos
        </button>

        {funcionarios.map((f) => {
          const ativo = selecionados.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => alternar(f.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 ${
                ativo
                  ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300"
                  : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-transparent hover:bg-slate-200"
              }`}
            >
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                {f.foto_url ? (
                  <Image src={f.foto_url} alt={f.nome_completo} fill sizes="24px" className="object-cover" />
                ) : (
                  <User size={12} className={ativo ? "text-brand-500" : "text-slate-400"} />
                )}
              </span>
              {f.nome_completo}
              {ativo && <Check size={14} className="shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
