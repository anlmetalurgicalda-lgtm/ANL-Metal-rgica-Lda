-- =====================================================================================
-- ANL Metalúrgica Lda — Sistema de Controlo de Ponto
-- Script SQL completo para o Supabase (PostgreSQL)
-- Execute este ficheiro completo no SQL Editor do Supabase (Project > SQL Editor > New query)
--
-- Contém: extensões, enums, tabelas, índices, triggers, funções (RPC), views,
--         Storage (bucket de fotos) e políticas de RLS.
--
-- Idioma do sistema: pt-PT | Fuso horário de referência: Europe/Lisbon
-- =====================================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSÕES
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;   -- crypt()/gen_salt() para hash de senhas
create extension if not exists pg_cron with schema extensions;    -- agendamento (deteção de faltas diária)

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type ponto_tipo as enum ('entrada', 'saida', 'falta', 'folga');
exception when duplicate_object then null; end $$;

do $$ begin
  create type registo_status as enum ('normal', 'atraso', 'forcado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notificacao_tipo as enum ('foto_pendente', 'falta_nao_justificada', 'atraso_bloqueado', 'info');
exception when duplicate_object then null; end $$;

do $$ begin
  create type foto_status as enum ('pendente', 'aprovada', 'rejeitada');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. FUNÇÃO AUXILIAR: atualizar coluna atualizado_em
-- ---------------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. TABELA: configuracoes_empresa (linha única de configuração global)
-- ---------------------------------------------------------------------------
create table if not exists public.configuracoes_empresa (
  id                    int primary key default 1 check (id = 1),
  nome_empresa          text not null default 'ANL Metalúrgica Lda',
  morada                text not null default 'Rua Dr Calado nº 26, 1º andar, 3080-152 Figueira da Foz, Coimbra, Portugal',
  fuso_horario          text not null default 'Europe/Lisbon',
  idioma                text not null default 'pt-PT',
  hora_entrada_padrao   time not null default '08:00',
  hora_saida_padrao     time not null default '19:00',
  tolerancia_minutos    int not null default 20,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

insert into public.configuracoes_empresa (id) values (1)
on conflict (id) do nothing;

drop trigger if exists trg_configuracoes_empresa_atualizado_em on public.configuracoes_empresa;
create trigger trg_configuracoes_empresa_atualizado_em
  before update on public.configuracoes_empresa
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- 4. TABELA: admins (utilizadores administradores — usam Supabase Auth normal)
--    O login é feito só por NOME DE UTILIZADOR (não por email). Internamente,
--    cada admin continua a ter uma conta Supabase Auth normal, mas com um
--    email técnico gerado como "<nome_utilizador>@anl-metalurgica.internal"
--    — nunca é enviado nenhum email para esse endereço, serve apenas como
--    identificador único exigido pelo Supabase Auth.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text not null,
  nome_utilizador  text not null unique,
  email            text not null unique,
  foto_url         text,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

-- Migração aditiva (segura de correr novamente mesmo que a tabela já exista
-- de uma execução anterior deste script sem estas colunas). A coluna
-- funcionario_id (referência a public.funcionarios) só é adicionada mais
-- abaixo, depois de essa tabela ser criada na secção 5.
alter table public.admins add column if not exists nome_utilizador text;
alter table public.admins add column if not exists foto_url text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'admins_nome_utilizador_key') then
    alter table public.admins add constraint admins_nome_utilizador_key unique (nome_utilizador);
  end if;
end $$;

-- A criação de admins (incluindo o primeiro) é feita pela aplicação:
--  - script único de arranque: node --env-file=.env.local scripts/criar-admin.mjs
--  - ou, já com um admin ativo, pelo próprio painel em /admin/administradores
-- Ambos usam a Service Role Key (nunca exposta ao browser) para criar o
-- utilizador no Supabase Auth e inserir a linha correspondente aqui.

-- ---------------------------------------------------------------------------
-- 5. TABELA: funcionarios (colaboradores da empresa)
-- ---------------------------------------------------------------------------
create table if not exists public.funcionarios (
  id                    uuid primary key default gen_random_uuid(),
  nome_completo         text not null,
  numero_funcionario    text unique,
  email                 text,
  senha_hash            text not null,
  foto_url              text,                 -- foto aprovada (visível na grelha do quiosque)
  foto_pendente_url     text,                 -- foto enviada pelo colaborador, aguarda aprovação
  foto_status           foto_status not null default 'aprovada',
  hora_entrada_padrao   time not null default '08:00',
  hora_saida_padrao     time not null default '19:00',
  -- dias da semana em que o colaborador trabalha, formato ISO DOW (1=Segunda ... 7=Domingo)
  dias_trabalho         int[] not null default '{1,2,3,4,5,6}',
  ativo                 boolean not null default true,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  constraint chk_dias_trabalho check (dias_trabalho <@ array[1,2,3,4,5,6,7])
);

create index if not exists idx_funcionarios_ativo on public.funcionarios (ativo);

-- Só agora, com public.funcionarios já criada, se pode ligar um admin a um
-- colaborador (usado quando se "promove" um funcionário a administrador).
alter table public.admins add column if not exists funcionario_id uuid references public.funcionarios(id) on delete set null;

drop trigger if exists trg_funcionarios_atualizado_em on public.funcionarios;
create trigger trg_funcionarios_atualizado_em
  before update on public.funcionarios
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- 6. TABELA: registos_ponto
-- ---------------------------------------------------------------------------
create table if not exists public.registos_ponto (
  id              uuid primary key default gen_random_uuid(),
  funcionario_id  uuid not null references public.funcionarios(id) on delete cascade,
  data            date not null,                 -- dia de referência (Europe/Lisbon)
  tipo            ponto_tipo not null,
  hora_registo    timestamptz,                    -- nulo para falta/folga
  status          registo_status,
  forcado_por     uuid references public.admins(id),
  observacao      text,
  criado_em       timestamptz not null default now(),
  unique (funcionario_id, data, tipo)
);

create index if not exists idx_registos_funcionario_data on public.registos_ponto (funcionario_id, data);
create index if not exists idx_registos_data on public.registos_ponto (data);

-- Impede combinações inválidas: não pode haver falta/folga no mesmo dia que entrada/saida
create or replace function public.validar_registo_ponto()
returns trigger
language plpgsql
as $$
declare
  v_existe_oposto boolean;
begin
  if new.tipo in ('falta', 'folga') then
    select exists (
      select 1 from public.registos_ponto
      where funcionario_id = new.funcionario_id
        and data = new.data
        and tipo in ('entrada', 'saida', 'falta', 'folga')
        and tipo <> new.tipo
        and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000')
    ) into v_existe_oposto;
  else
    select exists (
      select 1 from public.registos_ponto
      where funcionario_id = new.funcionario_id
        and data = new.data
        and tipo in ('falta', 'folga')
        and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000')
    ) into v_existe_oposto;
  end if;

  if v_existe_oposto then
    raise exception 'Já existe um registo incompatível para este funcionário nesta data (%).', new.data;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_registo_ponto on public.registos_ponto;
create trigger trg_validar_registo_ponto
  before insert or update on public.registos_ponto
  for each row execute function public.validar_registo_ponto();

-- ---------------------------------------------------------------------------
-- 7. TABELA: notificacoes (central de notificações do Admin)
-- ---------------------------------------------------------------------------
create table if not exists public.notificacoes (
  id              uuid primary key default gen_random_uuid(),
  tipo            notificacao_tipo not null,
  funcionario_id  uuid references public.funcionarios(id) on delete cascade,
  titulo          text not null,
  mensagem        text not null,
  lida            boolean not null default false,
  metadata        jsonb,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_notificacoes_lida on public.notificacoes (lida, criado_em desc);

-- ---------------------------------------------------------------------------
-- 8. TRIGGER: notificação automática quando um colaborador envia foto pendente
-- ---------------------------------------------------------------------------
create or replace function public.notificar_foto_pendente()
returns trigger
language plpgsql
as $$
begin
  if new.foto_pendente_url is not null
     and new.foto_pendente_url is distinct from old.foto_pendente_url then
    update public.funcionarios set foto_status = 'pendente' where id = new.id;

    insert into public.notificacoes (tipo, funcionario_id, titulo, mensagem, metadata)
    values (
      'foto_pendente',
      new.id,
      'Nova foto de perfil pendente',
      new.nome_completo || ' enviou uma nova foto de perfil e aguarda aprovação.',
      jsonb_build_object('foto_pendente_url', new.foto_pendente_url)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_foto_pendente on public.funcionarios;
create trigger trg_notificar_foto_pendente
  after update of foto_pendente_url on public.funcionarios
  for each row execute function public.notificar_foto_pendente();

-- ---------------------------------------------------------------------------
-- 9. FUNÇÃO RPC: verificar_senha_funcionario (usada apenas internamente)
-- ---------------------------------------------------------------------------
create or replace function public.verificar_senha_funcionario(p_funcionario_id uuid, p_senha text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select senha_hash into v_hash from public.funcionarios where id = p_funcionario_id and ativo = true;
  if v_hash is null then
    return false;
  end if;
  return v_hash = crypt(p_senha, v_hash);
end;
$$;

revoke all on function public.verificar_senha_funcionario(uuid, text) from public;

-- ---------------------------------------------------------------------------
-- 10-B. FUNÇÃO RPC: enviar_foto_pendente_kiosk
--     Permite que o colaborador, a partir do quiosque (sem sessão Supabase Auth),
--     envie uma nova foto de perfil depois de confirmar a sua senha. O ficheiro
--     em si é enviado para o Storage (bucket fotos-funcionarios, pasta pendente/)
--     pelo cliente; esta função só regista o caminho e dispara a notificação
--     (via trigger notificar_foto_pendente) para o Admin aprovar.
-- ---------------------------------------------------------------------------
create or replace function public.enviar_foto_pendente_kiosk(
  p_funcionario_id uuid,
  p_senha text,
  p_foto_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select senha_hash into v_hash from public.funcionarios where id = p_funcionario_id and ativo = true;
  if v_hash is null or v_hash <> crypt(p_senha, v_hash) then
    return jsonb_build_object('sucesso', false, 'erro', 'senha_incorreta');
  end if;

  update public.funcionarios
  set foto_pendente_url = p_foto_url
  where id = p_funcionario_id;

  return jsonb_build_object('sucesso', true);
end;
$$;

revoke all on function public.enviar_foto_pendente_kiosk(uuid, text, text) from public;
grant execute on function public.enviar_foto_pendente_kiosk(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. FUNÇÃO RPC: registar_ponto_kiosk
--     Chamada pelo ecrã de quiosque (chave anon). Valida a senha, aplica a
--     regra de tolerância de 20 minutos e insere o registo. Se o colaborador
--     tentar registar fora da tolerância, bloqueia e cria notificação.
-- ---------------------------------------------------------------------------
create or replace function public.registar_ponto_kiosk(
  p_funcionario_id uuid,
  p_senha text,
  p_tipo ponto_tipo
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_funcionario   public.funcionarios%rowtype;
  v_agora         timestamptz := now();
  v_agora_lisboa  timestamp;
  v_data_local    date;
  v_hora_prevista time;
  v_tolerancia    int;
  v_limite        timestamp;
  v_status        registo_status;
begin
  if p_tipo not in ('entrada', 'saida') then
    return jsonb_build_object('sucesso', false, 'erro', 'tipo_invalido');
  end if;

  select * into v_funcionario from public.funcionarios where id = p_funcionario_id and ativo = true;
  if not found then
    return jsonb_build_object('sucesso', false, 'erro', 'funcionario_nao_encontrado');
  end if;

  if v_funcionario.senha_hash <> crypt(p_senha, v_funcionario.senha_hash) then
    return jsonb_build_object('sucesso', false, 'erro', 'senha_incorreta');
  end if;

  select tolerancia_minutos into v_tolerancia from public.configuracoes_empresa where id = 1;
  v_tolerancia := coalesce(v_tolerancia, 20);

  v_agora_lisboa := v_agora at time zone 'Europe/Lisbon';
  v_data_local := v_agora_lisboa::date;

  if exists (
    select 1 from public.registos_ponto
    where funcionario_id = p_funcionario_id and data = v_data_local and tipo = p_tipo
  ) then
    return jsonb_build_object('sucesso', false, 'erro', 'ja_registado');
  end if;

  if exists (
    select 1 from public.registos_ponto
    where funcionario_id = p_funcionario_id and data = v_data_local and tipo in ('falta', 'folga')
  ) then
    return jsonb_build_object('sucesso', false, 'erro', 'dia_marcado_falta_folga');
  end if;

  v_hora_prevista := case when p_tipo = 'entrada'
    then v_funcionario.hora_entrada_padrao
    else v_funcionario.hora_saida_padrao
  end;

  v_limite := v_data_local + v_hora_prevista + make_interval(mins => v_tolerancia);

  if v_agora_lisboa > v_limite then
    insert into public.notificacoes (tipo, funcionario_id, titulo, mensagem, metadata)
    values (
      'atraso_bloqueado',
      p_funcionario_id,
      'Registo de ponto bloqueado por atraso',
      v_funcionario.nome_completo || ' tentou registar "' || p_tipo || '" às ' ||
        to_char(v_agora_lisboa, 'HH24:MI') || ', fora da tolerância de ' || v_tolerancia || ' minutos.',
      jsonb_build_object('tipo_registo', p_tipo, 'hora_tentativa', v_agora_lisboa, 'hora_prevista', v_hora_prevista)
    );

    return jsonb_build_object(
      'sucesso', false,
      'erro', 'fora_da_tolerancia',
      'mensagem', 'Já passou o limite de tolerância (' || v_tolerancia || ' minutos). Apenas o Administrador pode forçar este registo.'
    );
  end if;

  v_status := case when v_agora_lisboa::time > v_hora_prevista then 'atraso' else 'normal' end;

  insert into public.registos_ponto (funcionario_id, data, tipo, hora_registo, status)
  values (p_funcionario_id, v_data_local, p_tipo, v_agora, v_status);

  return jsonb_build_object(
    'sucesso', true,
    'status', v_status,
    'hora', to_char(v_agora_lisboa, 'HH24:MI'),
    'nome', v_funcionario.nome_completo
  );
end;
$$;

revoke all on function public.registar_ponto_kiosk(uuid, text, ponto_tipo) from public;
grant execute on function public.registar_ponto_kiosk(uuid, text, ponto_tipo) to anon, authenticated;
grant execute on function public.verificar_senha_funcionario(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 11. FUNÇÃO AUXILIAR: is_admin() — usada dentro das políticas de RLS
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where id = auth.uid() and ativo = true
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 12. FUNÇÃO RPC: forcar_ponto_admin (individual ou em massa)
--     p_usar_horario_padrao = true  -> usa o horário de contrato de cada funcionário
--     p_usar_horario_padrao = false -> usa p_hora_customizada para todos os selecionados
-- ---------------------------------------------------------------------------
create or replace function public.forcar_ponto_admin(
  p_funcionario_ids uuid[],
  p_tipo ponto_tipo,
  p_data date,
  p_usar_horario_padrao boolean default true,
  p_hora_customizada time default null,
  p_observacao text default null
)
returns setof public.registos_ponto
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_funcionario   public.funcionarios%rowtype;
  v_hora_final    time;
  v_timestamp     timestamptz;
  v_status        registo_status;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem forçar registos de ponto.';
  end if;

  for v_funcionario in
    select * from public.funcionarios where id = any(p_funcionario_ids) and ativo = true
  loop
    -- Remove registos incompatíveis com o novo tipo (ex.: mudar de "folga" para
    -- "entrada", ou de "falta" para "folga") para não colidir com o trigger
    -- trg_validar_registo_ponto, que impede entrada/saida coexistirem com falta/folga.
    if p_tipo in ('entrada', 'saida') then
      delete from public.registos_ponto
      where funcionario_id = v_funcionario.id and data = p_data and tipo in ('falta', 'folga');
    else
      delete from public.registos_ponto
      where funcionario_id = v_funcionario.id and data = p_data
        and tipo in ('entrada', 'saida', 'falta', 'folga') and tipo <> p_tipo;
    end if;

    if p_tipo in ('falta', 'folga') then
      v_timestamp := null;
      v_status := null;
    else
      if p_usar_horario_padrao then
        v_hora_final := case when p_tipo = 'entrada'
          then v_funcionario.hora_entrada_padrao
          else v_funcionario.hora_saida_padrao
        end;
      else
        v_hora_final := coalesce(p_hora_customizada, case when p_tipo = 'entrada'
          then v_funcionario.hora_entrada_padrao
          else v_funcionario.hora_saida_padrao
        end);
      end if;

      v_timestamp := (p_data::text || ' ' || v_hora_final::text)::timestamp at time zone 'Europe/Lisbon';
      v_status := 'forcado';
    end if;

    insert into public.registos_ponto (funcionario_id, data, tipo, hora_registo, status, forcado_por, observacao)
    values (v_funcionario.id, p_data, p_tipo, v_timestamp, v_status, auth.uid(), p_observacao)
    on conflict (funcionario_id, data, tipo)
    do update set
      hora_registo = excluded.hora_registo,
      status = excluded.status,
      forcado_por = excluded.forcado_por,
      observacao = excluded.observacao
    returning * into v_funcionario;
  end loop;

  return query
    select * from public.registos_ponto
    where funcionario_id = any(p_funcionario_ids) and data = p_data and tipo = p_tipo;
end;
$$;

revoke all on function public.forcar_ponto_admin(uuid[], ponto_tipo, date, boolean, time, text) from public;
grant execute on function public.forcar_ponto_admin(uuid[], ponto_tipo, date, boolean, time, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12-B. FUNÇÃO RPC: limpar_ponto_admin ("Voltar ao normal")
--     Remove todos os registos (entrada/saida/falta/folga) de um dia para os
--     colaboradores indicados, repondo o estado para "Sem registo" — como se
--     nenhuma ação tivesse sido feita nesse dia.
-- ---------------------------------------------------------------------------
create or replace function public.limpar_ponto_admin(
  p_funcionario_ids uuid[],
  p_data date
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem limpar registos de ponto.';
  end if;

  delete from public.registos_ponto
  where funcionario_id = any(p_funcionario_ids) and data = p_data;
end;
$$;

revoke all on function public.limpar_ponto_admin(uuid[], date) from public;
grant execute on function public.limpar_ponto_admin(uuid[], date) to authenticated;

-- ---------------------------------------------------------------------------
-- 13. FUNÇÃO RPC: aprovar_foto_funcionario / rejeitar_foto_funcionario
-- ---------------------------------------------------------------------------
create or replace function public.aprovar_foto_funcionario(p_funcionario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar fotos.';
  end if;

  update public.funcionarios
  set foto_url = foto_pendente_url,
      foto_pendente_url = null,
      foto_status = 'aprovada'
  where id = p_funcionario_id;

  update public.notificacoes
  set lida = true
  where funcionario_id = p_funcionario_id and tipo = 'foto_pendente' and lida = false;
end;
$$;

create or replace function public.rejeitar_foto_funcionario(p_funcionario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem rejeitar fotos.';
  end if;

  update public.funcionarios
  set foto_pendente_url = null,
      foto_status = 'aprovada'
  where id = p_funcionario_id;

  update public.notificacoes
  set lida = true
  where funcionario_id = p_funcionario_id and tipo = 'foto_pendente' and lida = false;
end;
$$;

grant execute on function public.aprovar_foto_funcionario(uuid) to authenticated;
grant execute on function public.rejeitar_foto_funcionario(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 14. FUNÇÃO RPC: definir_senha_funcionario (Admin define/redefine a senha)
-- ---------------------------------------------------------------------------
create or replace function public.definir_senha_funcionario(p_funcionario_id uuid, p_nova_senha text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem definir senhas.';
  end if;

  if p_nova_senha !~ '^[0-9]{6}$' then
    raise exception 'A senha do funcionário tem de ter exatamente 6 dígitos numéricos.';
  end if;

  update public.funcionarios
  set senha_hash = crypt(p_nova_senha, gen_salt('bf'))
  where id = p_funcionario_id;
end;
$$;

grant execute on function public.definir_senha_funcionario(uuid, text) to authenticated;

-- Função de conveniência para criar um funcionário já com senha (evita expor crypt() ao cliente)
create or replace function public.criar_funcionario(
  p_nome_completo text,
  p_senha text,
  p_numero_funcionario text default null,
  p_email text default null,
  p_hora_entrada time default '08:00',
  p_hora_saida time default '19:00',
  p_dias_trabalho int[] default '{1,2,3,4,5,6}',
  p_foto_url text default null
)
returns public.funcionarios
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_novo public.funcionarios%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem criar funcionários.';
  end if;

  if p_senha !~ '^[0-9]{6}$' then
    raise exception 'A senha do funcionário tem de ter exatamente 6 dígitos numéricos.';
  end if;

  insert into public.funcionarios (
    nome_completo, senha_hash, numero_funcionario, email,
    hora_entrada_padrao, hora_saida_padrao, dias_trabalho, foto_url
  ) values (
    p_nome_completo, crypt(p_senha, gen_salt('bf')), p_numero_funcionario, p_email,
    p_hora_entrada, p_hora_saida, p_dias_trabalho, p_foto_url
  )
  returning * into v_novo;

  return v_novo;
end;
$$;

grant execute on function public.criar_funcionario(text, text, text, text, time, time, int[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 15. FUNÇÃO: deteção diária de faltas não justificadas (para pg_cron)
-- ---------------------------------------------------------------------------
create or replace function public.detetar_faltas_dia(p_data date default (now() at time zone 'Europe/Lisbon')::date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_funcionario public.funcionarios%rowtype;
  v_dow int;
begin
  v_dow := extract(isodow from p_data)::int;

  for v_funcionario in
    select * from public.funcionarios
    where ativo = true and v_dow = any(dias_trabalho)
  loop
    if not exists (
      select 1 from public.registos_ponto
      where funcionario_id = v_funcionario.id and data = p_data
        and tipo in ('entrada', 'falta', 'folga')
    ) then
      insert into public.registos_ponto (funcionario_id, data, tipo, hora_registo, status)
      values (v_funcionario.id, p_data, 'falta', null, null)
      on conflict (funcionario_id, data, tipo) do nothing;

      insert into public.notificacoes (tipo, funcionario_id, titulo, mensagem, metadata)
      values (
        'falta_nao_justificada',
        v_funcionario.id,
        'Falta não justificada',
        v_funcionario.nome_completo || ' não registou entrada em ' || to_char(p_data, 'DD/MM/YYYY') || '.',
        jsonb_build_object('data', p_data)
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.detetar_faltas_dia(date) to authenticated;

-- Agendamento diário às 23:55 (Europe/Lisbon = UTC+0/+1 consoante DST).
-- pg_cron corre em UTC; 22:55 UTC cobre 23:55 no horário de inverno (WET) —
-- ajuste manualmente após a mudança de hora de verão (WEST, UTC+1) para 21:55 UTC, se necessário.
select cron.schedule(
  'detetar-faltas-diarias',
  '55 22 * * *',
  $$select public.detetar_faltas_dia((now() at time zone 'Europe/Lisbon')::date);$$
)
where not exists (select 1 from cron.job where jobname = 'detetar-faltas-diarias');

-- ---------------------------------------------------------------------------
-- 16. VIEWS
-- ---------------------------------------------------------------------------

-- View pública e segura para o ecrã de quiosque (não expõe senha_hash nem dados sensíveis)
create or replace view public.vw_funcionarios_kiosk
with (security_invoker = false) as
select id, nome_completo, foto_url
from public.funcionarios
where ativo = true
order by nome_completo;

-- View detalhada de registos, já convertida para hora de Lisboa, para consulta no Admin
-- IMPORTANTE: esta view corre com os privilégios do seu dono (não do utilizador
-- que a consulta), pelo que ignora por completo as políticas de RLS das
-- tabelas de base. Sem o "where public.is_admin()" abaixo, qualquer pessoa
-- com a anon key conseguiria pedir GET /rest/v1/vw_registos_detalhados e ver
-- todos os registos de ponto de todos os colaboradores. is_admin() continua
-- a refletir corretamente o utilizador autenticado que fez o pedido (usa
-- auth.uid() da sessão, não o dono da view), por isso este filtro é seguro.
create or replace view public.vw_registos_detalhados as
select
  r.id,
  r.funcionario_id,
  f.nome_completo,
  f.numero_funcionario,
  r.data,
  r.tipo,
  r.hora_registo at time zone 'Europe/Lisbon' as hora_registo_local,
  to_char(r.hora_registo at time zone 'Europe/Lisbon', 'HH24:MI') as hora_registo_formatada,
  r.status,
  r.forcado_por,
  a.nome as forcado_por_nome,
  r.observacao,
  r.criado_em,
  f.foto_url
from public.registos_ponto r
join public.funcionarios f on f.id = r.funcionario_id
left join public.admins a on a.id = r.forcado_por
where public.is_admin();

revoke all on public.vw_registos_detalhados from anon, public;
grant select on public.vw_registos_detalhados to authenticated;

-- ---------------------------------------------------------------------------
-- 17. FUNÇÃO RPC: obter_relatorio_ponto (usada pelo popup de relatórios)
--     Devolve uma linha por colaborador/dia dentro do período, já pronta
--     para tabela/exportação Excel. Aceita uma lista de colaboradores (para
--     o seletor por nome/foto com multi-seleção no painel); null = todos.
-- ---------------------------------------------------------------------------
drop function if exists public.obter_relatorio_ponto(date, date, uuid);

create or replace function public.obter_relatorio_ponto(
  p_data_inicio date,
  p_data_fim date,
  p_funcionario_ids uuid[] default null
)
returns table (
  funcionario_id      uuid,
  nome_completo       text,
  numero_funcionario  text,
  data                date,
  hora_entrada        text,
  hora_saida          text,
  situacao            text,
  status_registo      text,
  total_horas         numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id as funcionario_id,
    f.nome_completo,
    f.numero_funcionario,
    d.data,
    to_char(e.hora_registo at time zone 'Europe/Lisbon', 'HH24:MI') as hora_entrada,
    to_char(s.hora_registo at time zone 'Europe/Lisbon', 'HH24:MI') as hora_saida,
    case
      when fal.id is not null then 'Falta'
      when fol.id is not null then 'Folga'
      when e.id is not null and s.id is not null then 'Trabalhado'
      when e.id is not null and s.id is null then 'Incompleto'
      else 'Sem registo'
    end as situacao,
    coalesce(e.status::text, s.status::text) as status_registo,
    case
      when e.hora_registo is not null and s.hora_registo is not null
        then round((extract(epoch from (s.hora_registo - e.hora_registo)) / 3600.0)::numeric, 2)
      else 0
    end as total_horas
  from public.funcionarios f
  cross join lateral generate_series(p_data_inicio, p_data_fim, interval '1 day') as d(data)
  left join public.registos_ponto e
    on e.funcionario_id = f.id and e.data = d.data and e.tipo = 'entrada'
  left join public.registos_ponto s
    on s.funcionario_id = f.id and s.data = d.data and s.tipo = 'saida'
  left join public.registos_ponto fal
    on fal.funcionario_id = f.id and fal.data = d.data and fal.tipo = 'falta'
  left join public.registos_ponto fol
    on fol.funcionario_id = f.id and fol.data = d.data and fol.tipo = 'folga'
  where public.is_admin()
    and (p_funcionario_ids is null or f.id = any(p_funcionario_ids))
    and (
      extract(isodow from d.data)::int = any(f.dias_trabalho)
      or e.id is not null or s.id is not null or fal.id is not null or fol.id is not null
    )
  order by f.nome_completo, d.data;
$$;

grant execute on function public.obter_relatorio_ponto(date, date, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 18. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
alter table public.configuracoes_empresa enable row level security;
alter table public.admins              enable row level security;
alter table public.funcionarios        enable row level security;
alter table public.registos_ponto      enable row level security;
alter table public.notificacoes        enable row level security;

-- configuracoes_empresa: leitura pública (necessário no quiosque), escrita só por admins
drop policy if exists "config_leitura_publica" on public.configuracoes_empresa;
create policy "config_leitura_publica" on public.configuracoes_empresa
  for select using (true);

drop policy if exists "config_escrita_admin" on public.configuracoes_empresa;
create policy "config_escrita_admin" on public.configuracoes_empresa
  for update using (public.is_admin());

-- admins: só o próprio admin (ou outros admins) pode ver a lista
drop policy if exists "admins_select_admin" on public.admins;
create policy "admins_select_admin" on public.admins
  for select using (public.is_admin());

-- Permite editar nome/foto/estado diretamente pelo cliente (como em funcionarios).
-- nome_utilizador e a senha NÃO se alteram por aqui — implicam mudar o email
-- técnico/senha em auth.users, o que só a Service Role Key pode fazer
-- (ver app/api/admin/administradores/[id]/senha, que usa essa chave).
drop policy if exists "admins_update_admin" on public.admins;
create policy "admins_update_admin" on public.admins
  for update using (public.is_admin());

-- funcionarios: sem acesso direto para anon; admins têm acesso total.
-- O quiosque usa a view vw_funcionarios_kiosk e as funções RPC (security definer).
drop policy if exists "funcionarios_select_admin" on public.funcionarios;
create policy "funcionarios_select_admin" on public.funcionarios
  for select using (public.is_admin());

drop policy if exists "funcionarios_insert_admin" on public.funcionarios;
create policy "funcionarios_insert_admin" on public.funcionarios
  for insert with check (public.is_admin());

drop policy if exists "funcionarios_update_admin" on public.funcionarios;
create policy "funcionarios_update_admin" on public.funcionarios
  for update using (public.is_admin());

drop policy if exists "funcionarios_delete_admin" on public.funcionarios;
create policy "funcionarios_delete_admin" on public.funcionarios
  for delete using (public.is_admin());

-- Permite que o próprio ecrã de quiosque atualize apenas a foto_pendente_url
-- via RPC dedicado no futuro; por agora, todas as escritas de ponto/foto passam
-- pelas funções SECURITY DEFINER acima, pelo que nenhuma política para anon é necessária aqui.

-- registos_ponto: sem acesso direto para anon (tudo via RPC); admins têm acesso total
drop policy if exists "registos_select_admin" on public.registos_ponto;
create policy "registos_select_admin" on public.registos_ponto
  for select using (public.is_admin());

drop policy if exists "registos_insert_admin" on public.registos_ponto;
create policy "registos_insert_admin" on public.registos_ponto
  for insert with check (public.is_admin());

drop policy if exists "registos_update_admin" on public.registos_ponto;
create policy "registos_update_admin" on public.registos_ponto
  for update using (public.is_admin());

drop policy if exists "registos_delete_admin" on public.registos_ponto;
create policy "registos_delete_admin" on public.registos_ponto
  for delete using (public.is_admin());

-- notificacoes: apenas admins
drop policy if exists "notificacoes_select_admin" on public.notificacoes;
create policy "notificacoes_select_admin" on public.notificacoes
  for select using (public.is_admin());

drop policy if exists "notificacoes_update_admin" on public.notificacoes;
create policy "notificacoes_update_admin" on public.notificacoes
  for update using (public.is_admin());

drop policy if exists "notificacoes_delete_admin" on public.notificacoes;
create policy "notificacoes_delete_admin" on public.notificacoes
  for delete using (public.is_admin());

-- Permite que a view do quiosque seja lida por anon (a view já filtra as colunas sensíveis)
grant select on public.vw_funcionarios_kiosk to anon, authenticated;
grant select on public.configuracoes_empresa to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 19. STORAGE: bucket de fotos dos colaboradores
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-funcionarios', 'fotos-funcionarios', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Leitura pública das fotos (necessário para a grelha do quiosque, ecrã não autenticado)
drop policy if exists "fotos_select_publico" on storage.objects;
create policy "fotos_select_publico" on storage.objects
  for select using (bucket_id = 'fotos-funcionarios');

-- Qualquer pessoa (quiosque, sem login) pode enviar para a pasta pendente/
-- Ex.: pendente/<funcionario_id>/foto.jpg
drop policy if exists "fotos_insert_pendente_publico" on storage.objects;
create policy "fotos_insert_pendente_publico" on storage.objects
  for insert with check (
    bucket_id = 'fotos-funcionarios'
    and (storage.foldername(name))[1] = 'pendente'
  );

-- Admins podem inserir/atualizar/remover em qualquer pasta (ex.: aprovada/)
drop policy if exists "fotos_insert_admin" on storage.objects;
create policy "fotos_insert_admin" on storage.objects
  for insert with check (bucket_id = 'fotos-funcionarios' and public.is_admin());

drop policy if exists "fotos_update_admin" on storage.objects;
create policy "fotos_update_admin" on storage.objects
  for update using (bucket_id = 'fotos-funcionarios' and public.is_admin());

drop policy if exists "fotos_delete_admin" on storage.objects;
create policy "fotos_delete_admin" on storage.objects
  for delete using (bucket_id = 'fotos-funcionarios' and public.is_admin());

-- =====================================================================================
-- FIM DO SCRIPT
-- Depois de executar:
--  1. Vá a Authentication > Users e crie o(s) utilizador(es) Admin (email + password).
--  2. Insira cada um na tabela public.admins (ver instrução comentada na secção 4).
--  3. Confirme em Database > Extensions que pgcrypto e pg_cron estão ativas.
--  4. Ajuste public.configuracoes_empresa se necessário (nome, morada, horários, tolerância).
-- =====================================================================================
