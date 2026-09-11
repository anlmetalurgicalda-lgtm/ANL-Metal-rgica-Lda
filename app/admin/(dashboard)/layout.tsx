import NotificacoesPanel from "@/components/admin/NotificacoesPanel";
import Sidebar from "@/components/admin/Sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let adminAtual: { nome: string; foto_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from("admins").select("nome, foto_url").eq("id", user.id).maybeSingle();
    adminAtual = data;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar adminAtual={adminAtual} />
      <div className="pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-end border-b border-slate-200 bg-white/80 px-8 py-3 backdrop-blur">
          <NotificacoesPanel />
        </header>
        <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
