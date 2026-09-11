"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Users, Clock, FileBarChart, LayoutDashboard, ShieldCheck, UserCircle2 } from "lucide-react";
import LogoutButton from "./LogoutButton";

const LINKS = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/funcionarios", label: "Funcionários", icon: Users },
  { href: "/admin/ponto", label: "Gestão de Ponto", icon: Clock },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/admin/administradores", label: "Administradores", icon: ShieldCheck },
];

interface Props {
  adminAtual: { nome: string; foto_url: string | null } | null;
}

export default function Sidebar({ adminAtual }: Props) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="relative">
          <span className="logo-halo pointer-events-none absolute -inset-3 rounded-2xl blur-lg" />
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/95 p-1 shadow-lg shadow-black/30">
            <Image src="/logo-icon.png" alt="ANL" width={48} height={48} className="h-full w-auto object-contain" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">ANL Metalúrgica</p>
          <p className="text-xs text-slate-400">Controlo de Ponto</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map((l) => {
          const ativo = l.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                ativo ? "bg-brand-600 text-white shadow-lg shadow-brand-900/40" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <l.icon size={18} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {adminAtual && (
          <div className="mb-1 flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-slate-300">
              {adminAtual.foto_url ? (
                <Image src={adminAtual.foto_url} alt={adminAtual.nome} fill sizes="36px" className="object-cover" />
              ) : (
                <UserCircle2 size={20} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{adminAtual.nome}</p>
              <p className="text-xs text-slate-400">Administrador</p>
            </div>
          </div>
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
