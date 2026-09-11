import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ erro: "Apenas administradores podem alterar palavras-passe." }, { status: 403 });
  }

  const corpo = await request.json();
  const senha = corpo.senha ?? "";

  if (senha.length < 6) {
    return NextResponse.json({ erro: "A palavra-passe tem de ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const admin_service = createAdminClient();
  const { error } = await admin_service.auth.admin.updateUserById(id, { password: senha });

  if (error) {
    return NextResponse.json({ erro: "Não foi possível alterar a palavra-passe." }, { status: 400 });
  }

  return NextResponse.json({ sucesso: true });
}
