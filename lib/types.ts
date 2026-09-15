export type PontoTipo = "entrada" | "saida" | "falta" | "folga" | "ferias";
export type RegistoStatus = "normal" | "atraso" | "forcado";
export type NotificacaoTipo =
  | "foto_pendente"
  | "falta_nao_justificada"
  | "atraso_bloqueado"
  | "info";
export type FotoStatus = "pendente" | "aprovada" | "rejeitada";

export interface FuncionarioKiosk {
  id: string;
  nome_completo: string;
  foto_url: string | null;
}

export interface Funcionario {
  id: string;
  nome_completo: string;
  numero_funcionario: string | null;
  email: string | null;
  foto_url: string | null;
  foto_pendente_url: string | null;
  foto_status: FotoStatus;
  hora_entrada_padrao: string;
  hora_saida_padrao: string;
  dias_trabalho: number[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface RegistoPonto {
  id: string;
  funcionario_id: string;
  data: string;
  tipo: PontoTipo;
  hora_registo: string | null;
  status: RegistoStatus | null;
  forcado_por: string | null;
  observacao: string | null;
  criado_em: string;
}

export interface RegistoDetalhado {
  id: string;
  funcionario_id: string;
  nome_completo: string;
  numero_funcionario: string | null;
  data: string;
  tipo: PontoTipo;
  hora_registo_local: string | null;
  hora_registo_formatada: string | null;
  status: RegistoStatus | null;
  forcado_por: string | null;
  forcado_por_nome: string | null;
  observacao: string | null;
  criado_em: string;
}

export interface Notificacao {
  id: string;
  tipo: NotificacaoTipo;
  funcionario_id: string | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  metadata: Record<string, unknown> | null;
  criado_em: string;
}

export interface LinhaRelatorioPonto {
  funcionario_id: string;
  nome_completo: string;
  numero_funcionario: string | null;
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  situacao: "Trabalhado" | "Incompleto" | "Falta" | "Folga" | "Férias" | "Sem registo";
  status_registo: RegistoStatus | null;
  total_horas: number;
}

export interface Admin {
  id: string;
  nome: string;
  nome_utilizador: string;
  email: string;
  foto_url: string | null;
  funcionario_id: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface RegistoAtividadeHoje {
  id: string;
  funcionario_id: string;
  nome_completo: string;
  foto_url: string | null;
  tipo: PontoTipo;
  hora_registo_formatada: string | null;
  status: RegistoStatus | null;
  forcado_por_nome: string | null;
}

export interface ConfiguracoesEmpresa {
  id: number;
  nome_empresa: string;
  morada: string;
  fuso_horario: string;
  idioma: string;
  hora_entrada_padrao: string;
  hora_saida_padrao: string;
  tolerancia_minutos: number;
}
