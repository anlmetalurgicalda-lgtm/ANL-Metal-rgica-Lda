import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ erro: "Apenas administradores podem eliminar administradores." }, { status: 403 });
  }

  if (id === user.id) {
    return NextResponse.json({ erro: "Não pode eliminar a sua própria conta." }, { status: 400 });
  }

  const admin_service = createAdminClient();

  const { count } = await admin_service
    .from("admins")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true)
    .neq("id", id);

  if (!count) {
    return NextResponse.json({ erro: "Tem de existir pelo menos um administrador ativo." }, { status: 400 });
  }

  const { error } = await admin_service.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ erro: "Não foi possível eliminar o administrador." }, { status: 400 });
  }

  return NextResponse.json({ sucesso: true });
}
