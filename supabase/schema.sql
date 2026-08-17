-- ============================================================================
--  PLATAFORMA CADET A · CF DAMM  —  Esquema complet de Supabase
-- ----------------------------------------------------------------------------
--  Com fer-ho servir:
--    1. Obre el teu projecte a Supabase → SQL Editor → New query.
--    2. Enganxa TOT aquest fitxer i prem RUN.
--    3. Llest: taules, seguretat (RLS), funcions i dades inicials creades.
--
--  És idempotent en la mesura del possible (drop + create). Es pot re-executar,
--  però ATENCIÓ: torna a crear les taules i esborra les dades existents.
-- ============================================================================

-- ---------- NETEJA (per poder re-executar en desenvolupament) ----------------
drop table if exists asistencia      cascade;
drop table if exists lesiones        cascade;
drop table if exists rpe             cascade;
drop table if exists wellness        cascade;
drop table if exists desconvocados   cascade;
drop table if exists puntos          cascade;
drop table if exists motivos_puntos  cascade;
drop table if exists reglas_alerta   cascade;
drop table if exists eventos         cascade;
drop table if exists perfiles        cascade;
drop table if exists equipo          cascade;

-- ============================================================================
--  TAULES
-- ============================================================================

-- Equip (fila única) amb els codis d'accés.
create table equipo (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  team_code   text not null,   -- codi d'alta per a jugadors
  staff_code  text not null,   -- codi d'alta per a entrenadors
  created_at  timestamptz default now()
);

-- Perfils (jugadors + entrenadors). Es precarreguen amb user_id NULL.
create table perfiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,
  nombre      text not null,
  rol         text not null check (rol in ('jugador','entrenador')),
  posicion    text,            -- només visible per entrenadors
  email       text,
  created_at  timestamptz default now()
);

-- Esdeveniments: entrenaments (auto dt/dc/dv) i partits (amb hora).
create table eventos (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('entrenamiento','partido')),
  fecha       date not null,
  hora        time,            -- hora del partit / convocatòria
  titulo      text,
  rival       text,
  created_at  timestamptz default now()
);
-- Un sol entrenament per dia (idempotència de la generació automàtica).
create unique index uq_entreno_fecha on eventos(fecha) where tipo = 'entrenamiento';

-- Jugadors NO convocats a un partit → se'ls exclou de wellness i RPE.
create table desconvocados (
  evento_id   uuid references eventos(id)  on delete cascade,
  profile_id  uuid references perfiles(id) on delete cascade,
  primary key (evento_id, profile_id)
);

-- Catàleg de motius de punts (sancions i premis). Editable.
create table motivos_puntos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  puntos      int  not null,          -- amb signe (negatiu = sanció)
  categoria   text not null default 'otro' check (categoria in ('entrenamiento','partido','otro')),
  activo      boolean not null default true,
  created_at  timestamptz default now()
);

-- Moviments de punts.
create table puntos (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references perfiles(id) on delete cascade,
  puntos         int  not null,       -- amb signe
  motivo         text,                -- descripció (del catàleg o manual)
  motivo_id      uuid references motivos_puntos(id) on delete set null,
  evento_id      uuid references eventos(id) on delete set null,  -- sessió on es va registrar
  fecha          date not null default current_date,
  registrado_por uuid references perfiles(id) on delete set null,
  created_at     timestamptz default now()
);
create index if not exists idx_puntos_evento on puntos(evento_id);

-- Respostes Wellness (una per jugador i esdeveniment).
create table wellness (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references perfiles(id) on delete cascade,
  evento_id       uuid not null references eventos(id)  on delete cascade,
  sueno           int not null check (sueno between 0 and 10),
  fatiga          int not null check (fatiga between 0 and 10),
  dolor_muscular  int not null check (dolor_muscular between 0 and 10),
  estres          int not null check (estres between 0 and 10),
  animo           int not null check (animo between 0 and 10),
  zona_molestias  text,
  comentario      text,
  a_tiempo        boolean not null default true,
  created_at      timestamptz default now(),
  unique (profile_id, evento_id)
);

-- Respostes RPE (una per jugador i esdeveniment).
create table rpe (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references perfiles(id) on delete cascade,
  evento_id         uuid not null references eventos(id)  on delete cascade,
  rpe_muscular      int not null check (rpe_muscular between 0 and 10),
  rpe_respiratorio  int not null check (rpe_respiratorio between 0 and 10),
  a_tiempo          boolean not null default true,
  created_at        timestamptz default now(),
  unique (profile_id, evento_id)
);

-- Assistència: només es guarden les EXCEPCIONS (per defecte tothom 'ok').
create table asistencia (
  evento_id   uuid references eventos(id)  on delete cascade,
  profile_id  uuid references perfiles(id) on delete cascade,
  estado      text not null check (estado in ('ok','lesionado','no_vino')),
  primary key (evento_id, profile_id)
);

-- Lesions (període). Actiu si current_date ∈ [inicio, fin].
create table lesiones (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references perfiles(id) on delete cascade,
  fecha_inicio  date not null,
  fecha_fin     date not null,
  descripcion   text,
  created_at    timestamptz default now()
);

-- Regles d'avís configurables (pics de RPE / wellness).
create table reglas_alerta (
  id          uuid primary key default gen_random_uuid(),
  metrica     text not null,   -- rpe_muscular | rpe_respiratorio | sueno | fatiga | dolor_muscular | estres | animo
  operador    text not null check (operador in ('>=','<=')),
  valor       int  not null,
  activa      boolean not null default true,
  created_at  timestamptz default now()
);

-- ============================================================================
--  FUNCIONS AUXILIARS (SECURITY DEFINER)
-- ============================================================================

-- És l'usuari actual un entrenador?
create or replace function is_coach() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from perfiles where user_id = auth.uid() and rol = 'entrenador'
  );
$$;

-- Id del perfil de l'usuari actual.
create or replace function my_profile_id() returns uuid
language sql security definer set search_path = public stable as $$
  select id from perfiles where user_id = auth.uid();
$$;

-- Llista de perfils no reclamats per a un codi donat (per a l'alta).
create or replace function list_unclaimed_profiles(p_code text)
returns table (id uuid, nombre text, rol text)
language plpgsql security definer set search_path = public stable as $$
declare v_team text; v_staff text; v_rol text;
begin
  select team_code, staff_code into v_team, v_staff from equipo limit 1;
  if p_code = v_staff then v_rol := 'entrenador';
  elsif p_code = v_team then v_rol := 'jugador';
  else return; -- codi incorrecte → llista buida
  end if;
  return query
    select p.id, p.nombre, p.rol
    from perfiles p
    where p.rol = v_rol and p.user_id is null
    order by p.nombre;
end;
$$;

-- Reclamar un perfil durant l'alta (valida el codi i vincula l'usuari).
create or replace function claim_profile(p_profile_id uuid, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_team text; v_staff text; v_rol text; v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión antes de reclamar un perfil';
  end if;
  if exists (select 1 from perfiles where user_id = auth.uid()) then
    raise exception 'Este usuario ya tiene un perfil asignado';
  end if;
  select rol, user_id into v_rol, v_user from perfiles where id = p_profile_id;
  if v_rol is null then raise exception 'Perfil no encontrado'; end if;
  if v_user is not null then raise exception 'Ese jugador ya ha sido reclamado'; end if;

  select team_code, staff_code into v_team, v_staff from equipo limit 1;
  if v_rol = 'entrenador' and p_code <> v_staff then
    raise exception 'Código de entrenador incorrecto';
  elsif v_rol = 'jugador' and p_code <> v_team then
    raise exception 'Código de equipo incorrecto';
  end if;

  update perfiles
     set user_id = auth.uid(),
         email   = (select email from auth.users where id = auth.uid())
   where id = p_profile_id;
end;
$$;

-- Classificació pública (amaga posició/email).
create or replace function get_clasificacion()
returns table (id uuid, nombre text, sumados int, restados int, total int)
language sql security definer set search_path = public stable as $$
  select p.id, p.nombre,
    coalesce(sum(case when pt.puntos > 0 then pt.puntos else 0 end),0)::int,
    coalesce(sum(case when pt.puntos < 0 then pt.puntos else 0 end),0)::int,
    coalesce(sum(pt.puntos),0)::int
  from perfiles p
  left join puntos pt on pt.profile_id = p.id
  where p.rol = 'jugador'
  group by p.id, p.nombre
  order by 5 desc, p.nombre;
$$;

-- Jugadors (nom públic, sense posició).
create or replace function get_jugadores_publicos()
returns table (id uuid, nombre text)
language sql security definer set search_path = public stable as $$
  select id, nombre from perfiles where rol = 'jugador' order by nombre;
$$;

-- Desglossament de punts d'un jugador (públic).
create or replace function get_desglose_jugador(p_id uuid)
returns table (fecha date, puntos int, motivo text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select fecha, puntos, motivo, created_at
  from puntos where profile_id = p_id
  order by fecha desc, created_at desc;
$$;

-- Enquestes pendents d'un jugador (per a la campaneta i els formularis).
create or replace function get_pendientes(p_profile uuid)
returns table (evento_id uuid, tipo_encuesta text, fecha date, titulo text, tipo_evento text)
language plpgsql security definer set search_path = public stable as $$
begin
  if p_profile <> my_profile_id() and not is_coach() then
    raise exception 'No autorizado';
  end if;
  return query
    -- Wellness pendents
    select e.id, 'wellness'::text, e.fecha, e.titulo, e.tipo
    from eventos e
    where e.fecha <= current_date
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p_profile)
      and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p_profile)
    union all
    -- RPE pendents (exclou desconvocats i lesionats en aquella data)
    select e.id, 'rpe'::text, e.fecha, e.titulo, e.tipo
    from eventos e
    where e.fecha <= current_date
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p_profile)
      and not exists (select 1 from lesiones l where l.profile_id = p_profile and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p_profile)
    order by fecha desc;
end;
$$;

-- Resum de pendents per a tot l'equip (només entrenadors).
create or replace function get_resumen_pendientes()
returns table (profile_id uuid, nombre text, wellness_pend int, rpe_pend int)
language plpgsql security definer set search_path = public stable as $$
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  return query
    select p.id, p.nombre,
      (select count(*) from eventos e
        where e.fecha <= current_date
          and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
          and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p.id))::int,
      (select count(*) from eventos e
        where e.fecha <= current_date
          and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
          and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
          and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p.id))::int
    from perfiles p
    where p.rol = 'jugador'
    order by p.nombre;
end;
$$;

-- Generar entrenaments (dt=2, dc=3, dv=5) entre dues dates (només entrenadors).
create or replace function generar_entrenamientos(desde date, hasta date)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  with ins as (
    insert into eventos (tipo, fecha, titulo)
    select 'entrenamiento', g::date, 'Entrenamiento'
    from generate_series(desde, hasta, interval '1 day') g
    where extract(dow from g) in (2,3,5)
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table equipo         enable row level security;
alter table perfiles       enable row level security;
alter table eventos        enable row level security;
alter table desconvocados  enable row level security;
alter table motivos_puntos enable row level security;
alter table puntos         enable row level security;
alter table wellness       enable row level security;
alter table rpe            enable row level security;
alter table asistencia     enable row level security;
alter table lesiones       enable row level security;
alter table reglas_alerta  enable row level security;

-- equipo: només entrenadors (els codis no els pot llegir ningú més).
create policy equipo_coach on equipo for all
  using (is_coach()) with check (is_coach());

-- perfiles: pròpia fila o entrenador (llegir); entrenador (escriure).
create policy perfiles_select on perfiles for select
  using (user_id = auth.uid() or is_coach());
create policy perfiles_coach on perfiles for all
  using (is_coach()) with check (is_coach());

-- eventos: lectura per a qualsevol usuari; escriptura entrenadors.
create policy eventos_read on eventos for select using (auth.uid() is not null);
create policy eventos_coach on eventos for all using (is_coach()) with check (is_coach());

-- desconvocados
create policy desconv_read on desconvocados for select using (auth.uid() is not null);
create policy desconv_coach on desconvocados for all using (is_coach()) with check (is_coach());

-- motivos_puntos
create policy motivos_read on motivos_puntos for select using (auth.uid() is not null);
create policy motivos_coach on motivos_puntos for all using (is_coach()) with check (is_coach());

-- puntos: lectura pública (classificació); escriptura entrenadors.
create policy puntos_read on puntos for select using (auth.uid() is not null);
create policy puntos_coach on puntos for all using (is_coach()) with check (is_coach());

-- reglas_alerta
create policy reglas_read on reglas_alerta for select using (auth.uid() is not null);
create policy reglas_coach on reglas_alerta for all using (is_coach()) with check (is_coach());

-- wellness: pròpies o entrenador (llegir); pròpies (inserir/editar); entrenador tot.
create policy wellness_select on wellness for select
  using (profile_id = my_profile_id() or is_coach());
create policy wellness_insert on wellness for insert
  with check (profile_id = my_profile_id());
create policy wellness_update on wellness for update
  using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());
create policy wellness_coach on wellness for all
  using (is_coach()) with check (is_coach());

-- rpe
create policy rpe_select on rpe for select
  using (profile_id = my_profile_id() or is_coach());
create policy rpe_insert on rpe for insert
  with check (profile_id = my_profile_id());
create policy rpe_update on rpe for update
  using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());
create policy rpe_coach on rpe for all
  using (is_coach()) with check (is_coach());

-- asistencia: pròpia o entrenador (llegir); entrenador (escriure).
create policy asist_select on asistencia for select
  using (profile_id = my_profile_id() or is_coach());
create policy asist_coach on asistencia for all
  using (is_coach()) with check (is_coach());

-- lesiones
create policy lesiones_select on lesiones for select
  using (profile_id = my_profile_id() or is_coach());
create policy lesiones_coach on lesiones for all
  using (is_coach()) with check (is_coach());

-- ============================================================================
--  PERMISOS (GRANTS)
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- Funcions accessibles sense sessió (durant l'alta):
grant execute on function list_unclaimed_profiles(text) to anon, authenticated;
-- Resta de funcions: només usuaris autenticats.
grant execute on function is_coach()                       to authenticated;
grant execute on function my_profile_id()                  to authenticated;
grant execute on function claim_profile(uuid, text)        to authenticated;
grant execute on function get_clasificacion()              to authenticated;
grant execute on function get_jugadores_publicos()         to authenticated;
grant execute on function get_desglose_jugador(uuid)       to authenticated;
grant execute on function get_pendientes(uuid)             to authenticated;
grant execute on function get_resumen_pendientes()         to authenticated;
grant execute on function generar_entrenamientos(date,date) to authenticated;

-- ============================================================================
--  DADES INICIALS
-- ============================================================================

-- Equip + codis d'accés.
insert into equipo (nombre, team_code, staff_code)
values ('Cadet A · CF Damm', 'DAMM2026', 'STAFF2026');

-- Entrenadors.
insert into perfiles (nombre, rol) values
  ('Ruben', 'entrenador'),
  ('Xavi',  'entrenador'),
  ('Alex',  'entrenador');

-- Plantilla (jugadors) amb posició (només visible per entrenadors).
insert into perfiles (nombre, rol, posicion) values
  ('Guty',              'jugador', 'Delantero'),
  ('Anyhony Mosquera',  'jugador', 'Delantero'),
  ('Luis Baena',        'jugador', 'Extremo izquierdo'),
  ('Santino',           'jugador', 'Extremo izquierdo'),
  ('Eloi Eslava',       'jugador', 'Extremo izquierdo'),
  ('Marc Marrahi',      'jugador', 'Extremo derecho'),
  ('Piero',             'jugador', 'Extremo derecho'),
  ('Roberston Allister','jugador', 'Interior (perfil 10)'),
  ('Jordi Sala',        'jugador', 'Interior (perfil 10)'),
  ('Nico Rovira',       'jugador', 'Interior (perfil 8)'),
  ('Nil Garcia',        'jugador', 'Interior (perfil 8)'),
  ('Tammer',            'jugador', 'Pivote'),
  ('Kaius',             'jugador', 'Pivote'),
  ('Gerard Cabero',     'jugador', 'Pivote'),
  ('Alexis Martinez',   'jugador', 'Lateral izquierdo'),
  ('Gerard Milla',      'jugador', 'Lateral izquierdo'),
  ('Aitor Rodriguez',   'jugador', 'Lateral derecho'),
  ('Hugo Moreno',       'jugador', 'Lateral derecho'),
  ('Marc Boixadera',    'jugador', 'Central izquierdo'),
  ('Solei',             'jugador', 'Central izquierdo'),
  ('Victor Paredes',    'jugador', 'Central derecho'),
  ('Nil Esteve',        'jugador', 'Central derecho'),
  ('Antoni Capdevila',  'jugador', 'Portero'),
  ('Marc Jorquera',     'jugador', 'Portero');

-- Catàleg de sancions (del reglament intern).
insert into motivos_puntos (nombre, puntos, categoria) values
  -- Entrenaments
  ('Llegar tarde',                                  -2, 'entrenamiento'),
  ('Llegar +5 min tarde',                           -4, 'entrenamiento'),
  ('No avisar 2h antes de faltar',                  -5, 'entrenamiento'),
  ('Chutar a portería entre ejercicios',            -1, 'entrenamiento'),
  ('"Xepar" a un compañero/entrenador',            -10, 'entrenamiento'),
  ('Romper material del club (irresponsable)',      -5, 'entrenamiento'),
  ('No traer equipación para entrenar',             -2, 'entrenamiento'),
  ('No recoger material (encargado)',               -2, 'entrenamiento'),
  ('Balón colado por encima de la red',             -3, 'entrenamiento'),
  ('Protestar (reiteración)',                       -1, 'entrenamiento'),
  ('Protestar (3ª vez, fuera del ejercicio)',       -3, 'entrenamiento'),
  ('No traer merienda de cumpleaños',              -10, 'entrenamiento'),
  -- Partits
  ('Llegar tarde (partido)',                        -2, 'partido'),
  ('Llegar +5 min tarde (partido)',                 -4, 'partido'),
  ('No venir uniformado al partido',                -2, 'partido'),
  ('Amarilla por protestar',                        -3, 'partido'),
  ('Amarilla por encararse con un rival',           -5, 'partido'),
  ('Roja (protestar / pelearse)',                  -10, 'partido'),
  ('No ducharse después del partido',               -5, 'partido'),
  ('Error en jugada de estrategia (posicional)',    -3, 'partido'),
  ('Lesionado/desconvocado que no viene',           -5, 'partido');

-- Regles d'avís per defecte.
insert into reglas_alerta (metrica, operador, valor) values
  ('rpe_muscular',     '>=', 9),
  ('rpe_respiratorio', '>=', 9),
  ('sueno',            '<=', 2),
  ('animo',            '<=', 2);

-- ============================================================================
--  FI
-- ============================================================================
