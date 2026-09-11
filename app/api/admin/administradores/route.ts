import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nomeUtilizadorParaEmail, normalizarNomeUtilizador } from "@/lib/auth";

export async function POST(request: Request) {
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
    return NextResponse.json({ erro: "Apenas administradores podem criar outros administradores." }, { status: 403 });
  }

  const corpo = await request.json();
  const nome = (corpo.nome ?? "").trim();
  const nomeUtilizador = normalizarNomeUtilizador(corpo.nomeUtilizador ?? "");
  const senha = corpo.senha ?? "";
  const funcionarioId = corpo.funcionarioId || null;

  if (!nome || !nomeUtilizador || senha.length < 6) {
    return NextResponse.json(
      { erro: "Nome, nome de utilizador e uma palavra-passe com pelo menos 6 caracteres são obrigatórios." },
      { status: 400 }
    );
  }

  const admin_service = createAdminClient();
  const email = nomeUtilizadorParaEmail(nomeUtilizador);

  const { data: novoUtilizador, error: erroCriarUtilizador } = await admin_service.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, nome_utilizador: nomeUtilizador },
  });

  if (erroCriarUtilizador || !novoUtilizador.user) {
    const jaExiste = erroCriarUtilizador?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      { erro: jaExiste ? "Já existe uma conta com este nome de utilizador." : "Não foi possível criar a conta." },
      { status: 400 }
    );
  }

  const { error: erroInserir } = await admin_service.from("admins").insert({
    id: novoUtilizador.user.id,
    nome,
    nome_utilizador: nomeUtilizador,
    email,
    funcionario_id: funcionarioId,
  });

  if (erroInserir) {
    await admin_service.auth.admin.deleteUser(novoUtilizador.user.id);
    return NextResponse.json({ erro: "Não foi possível registar o administrador." }, { status: 400 });
  }

  return NextResponse.json({ sucesso: true });
}
