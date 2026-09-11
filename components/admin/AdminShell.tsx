"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import NotificacoesPanel from "./NotificacoesPanel";

interface Props {
  adminAtual: { nome: string; foto_url: string | null } | null;
  children: React.ReactNode;
}

export default function AdminShell({ adminAtual, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar adminAtual={adminAtual} aberta={menuAberto} onFechar={() => setMenuAberto(false)} />

      {menuAberto && (
        <div
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:justify-end lg:px-8">
          <button
            onClick={() => setMenuAberto(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <NotificacoesPanel />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
