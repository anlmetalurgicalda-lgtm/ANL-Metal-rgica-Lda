// Os administradores autenticam-se só com nome de utilizador. O Supabase Auth
// exige um email único por conta, por isso usamos internamente um domínio
// técnico que nunca recebe correio real — apenas identifica a conta.
export const DOMINIO_EMAIL_ADMIN = "anl-metalurgica.internal";

export function nomeUtilizadorParaEmail(nomeUtilizador: string): string {
  return `${nomeUtilizador.trim().toLowerCase()}@${DOMINIO_EMAIL_ADMIN}`;
}

export function normalizarNomeUtilizador(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}
