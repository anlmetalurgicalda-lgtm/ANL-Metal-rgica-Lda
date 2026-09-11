"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { nomeUtilizadorParaEmail, normalizarNomeUtilizador } from "@/lib/auth";
import { Check, Loader2, Lock, User, Eye, EyeOff, ShieldAlert, ArrowLeft, ShieldCheck } from "lucide-react";

type Estado = "inativo" | "a-entrar" | "sucesso";

export default function LoginAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nomeUtilizador, setNomeUtilizador] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("inativo");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("a-entrar");
    setErro(null);

    const email = nomeUtilizadorParaEmail(normalizarNomeUtilizador(nomeUtilizador));
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setEstado("inativo");
      setErro("Nome de utilizador ou palavra-passe incorretos.");
      return;
    }

    setEstado("sucesso");
    setTimeout(() => {
      router.push("/admin");
      router.refresh();
    }, 700);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Fundo com brilhos e padrão subtil */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <form
        onSubmit={entrar}
        className="relative w-full max-w-sm animate-fade-in-up overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-brand-950/50 backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative mb-7 flex flex-col items-center text-center">
          <div className="group relative mb-5">
            <span className="logo-halo pointer-events-none absolute -inset-8 rounded-full blur-2xl animate-glow" />
            <span className="pointer-events-none absolute -inset-1 rounded-[1.9rem] bg-gradient-to-tr from-anl-laranja/45 to-indigo-500/40 blur-md opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.7rem] border border-white/50 bg-white p-1.5 shadow-2xl shadow-brand-950/60 ring-1 ring-white/30">
              <span className="logo-sheen pointer-events-none absolute -inset-y-6 -left-1/2 w-1/2 -skew-x-12 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
              <Image
                src="/logo-icon.png"
                alt="ANL Metalúrgica Lda"
                width={100}
                height={100}
                priority
                className="relative h-full w-auto object-contain"
              />
            </div>
            <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md ring-2 ring-slate-950">
              <ShieldCheck size={16} strokeWidth={2.4} />
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Acesso de Administrador</h1>
          <p className="mt-1 text-sm text-slate-400">
            ANL Metalúrgica Lda
            <span className="mx-1.5 text-slate-600">•</span>
            <span className="font-medium text-brand-300">Controlo de Ponto</span>
          </p>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-slate-200">Nome de utilizador</label>
        <div className="group relative mb-4">
          <User
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-400"
          />
          <input
            type="text"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            required
            disabled={estado !== "inativo"}
            value={nomeUtilizador}
            onChange={(e) => setNomeUtilizador(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/10 focus:ring-2 focus:ring-brand-400/30 disabled:opacity-60"
            placeholder="Usuário"
          />
        </div>

        <label className="mb-1.5 block text-sm font-medium text-slate-200">Palavra-passe</label>
        <div className="group relative mb-6">
          <Lock
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-400"
          />
          <input
            type={mostrarPassword ? "text" : "password"}
            required
            disabled={estado !== "inativo"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/10 focus:ring-2 focus:ring-brand-400/30 disabled:opacity-60"
            placeholder="Senha"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setMostrarPassword((v) => !v)}
            aria-label={mostrarPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          >
            {mostrarPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {erro && (
          <div className="mb-4 flex animate-fade-in-up items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={estado !== "inativo"}
          className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-90 ${
            estado === "sucesso"
              ? "bg-emerald-600 shadow-emerald-900/30"
              : "bg-gradient-to-r from-brand-500 to-brand-600 shadow-brand-900/40 hover:from-brand-400 hover:to-brand-500 hover:shadow-brand-600/40"
          }`}
        >
          {estado === "a-entrar" && (
            <>
              <Loader2 className="animate-spin" size={18} /> A entrar...
            </>
          )}
          {estado === "sucesso" && (
            <>
              <Check size={18} /> Sessão iniciada
            </>
          )}
          {estado === "inativo" && "Entrar"}
        </button>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500">ou</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <a
          href="/ponto"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} /> Voltar ao ecrã de ponto
        </a>
      </form>
    </main>
  );
}
