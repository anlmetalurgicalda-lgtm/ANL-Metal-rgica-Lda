import AdminShell from "@/components/admin/AdminShell";
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

  return <AdminShell adminAtual={adminAtual}>{children}</AdminShell>;
}
