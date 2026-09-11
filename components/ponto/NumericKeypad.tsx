"use client";

import { Delete } from "lucide-react";

interface Props {
  valor: string;
  onChange: (valor: string) => void;
  tamanho?: number;
  erro?: boolean;
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "apagar"];

export default function NumericKeypad({ valor, onChange, tamanho = 6, erro = false }: Props) {
  function premir(tecla: string) {
    if (tecla === "apagar") {
      onChange(valor.slice(0, -1));
      return;
    }
    if (tecla === "") return;
    if (valor.length >= tamanho) return;
    onChange(valor + tecla);
  }

  return (
    <div className="w-full">
      <div className={`mb-6 flex justify-center gap-3 ${erro ? "animate-shake" : ""}`}>
        {Array.from({ length: tamanho }).map((_, i) => {
          const preenchido = i < valor.length;
          const atual = i === valor.length;
          return (
            <span
              key={i}
              className={`flex h-4 w-4 items-center justify-center rounded-full transition-all duration-200 ${
                erro
                  ? "bg-rose-400 ring-4 ring-rose-100"
                  : preenchido
                    ? "scale-110 bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/40"
                    : atual
                      ? "bg-white ring-2 ring-brand-400"
                      : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TECLAS.map((tecla, i) =>
          tecla === "" ? (
            <div key={i} />
          ) : tecla === "apagar" ? (
            <button
              key={i}
              type="button"
              onClick={() => premir(tecla)}
              aria-label="Apagar"
              className="flex h-14 items-center justify-center rounded-2xl text-slate-500 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 active:scale-90"
            >
              <Delete size={22} />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => premir(tecla)}
              className="flex h-14 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all duration-150 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-300 active:scale-90 active:bg-brand-100"
            >
              {tecla}
            </button>
          )
        )}
      </div>
    </div>
  );
}
