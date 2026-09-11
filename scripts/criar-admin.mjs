// Cria (ou atualiza a senha de) um administrador diretamente via Supabase Auth Admin API.
// Uso:
//   node --env-file=.env.local scripts/criar-admin.mjs <nome_utilizador> <senha> "<Nome Completo>"
// Exemplo (o admin inicial pedido para este projeto):
//   node --env-file=.env.local scripts/criar-admin.mjs carlosvhg 32108573 "Carlos"
//
// Requer no .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings > API > service_role — NUNCA no browser)

import { createClient } from "@supabase/supabase-js";

const [, , nomeUtilizadorArg, senhaArg, nomeArg] = process.argv;

const nomeUtilizador = (nomeUtilizadorArg || "carlosvhg").trim().toLowerCase();
const senha = senhaArg || "32108573";
const nome = nomeArg || "Carlos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local e corra com --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `${nomeUtilizador}@anl-metalurgica.internal`;

async function main() {
  const { data: existentes, error: erroListar } = await supabase.auth.admin.listUsers();
  if (erroListar) {
    console.error("Erro ao listar utilizadores:", erroListar.message);
    process.exit(1);
  }

  const existente = existentes.users.find((u) => u.email === email);
  let userId;

  if (existente) {
    const { error: erroAtualizar } = await supabase.auth.admin.updateUserById(existente.id, { password: senha });
    if (erroAtualizar) {
      console.error("Erro ao atualizar a senha:", erroAtualizar.message);
      process.exit(1);
    }
    userId = existente.id;
    console.log(`Utilizador "${nomeUtilizador}" já existia — senha atualizada.`);
  } else {
    const { data: criado, error: erroCriar } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, nome_utilizador: nomeUtilizador },
    });
    if (erroCriar || !criado.user) {
      console.error("Erro ao criar utilizador:", erroCriar?.message);
      process.exit(1);
    }
    userId = criado.user.id;
    console.log(`Utilizador "${nomeUtilizador}" criado.`);
  }

  const { error: erroUpsert } = await supabase
    .from("admins")
    .upsert({ id: userId, nome, nome_utilizador: nomeUtilizador, email, ativo: true }, { onConflict: "id" });

  if (erroUpsert) {
    console.error("Erro ao registar em public.admins:", erroUpsert.message);
    process.exit(1);
  }

  console.log(`Pronto. Login em /admin/login com o nome de utilizador "${nomeUtilizador}".`);
}

main();
