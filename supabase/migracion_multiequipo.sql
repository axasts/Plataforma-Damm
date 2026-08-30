-- ============================================================================
--  MIGRACIÓ A MULTI-EQUIP  ·  Plataforma CF Damm
-- ----------------------------------------------------------------------------
--  Converteix la base de dades (que ara només té el Cadet A / S16) en
--  MULTI-EQUIP: una mateixa BD pot allotjar diversos equips (S16, S15…),
--  cadascun amb els seus jugadors, entrenadors, codis d'accés i el seu flag
--  `usa_puntos` (true = ranking/sancions/penalitzacions; false = sense punts).
--
--  ⚠️  ÉS ADDITIVA I NO DESTRUCTIVA. No esborra cap dada existent:
--      · Afegeix columnes `equipo_id` i les omple amb l'equip que ja tens.
--      · Reescriu funcions i polítiques de seguretat perquè cada entrenador
--        només vegi el SEU equip.
--      · NO toca els usuaris (logins) del S16.
--
--  Com fer-ho servir:
--    1. Supabase → SQL Editor → New query.
--    2. Enganxa TOT aquest fitxer i prem RUN. Es pot re-executar sense perill.
--    3. Després executa `seed_sub15.sql` (amb els noms/codis del S15).
--
--  L'equip existent (el Cadet A) queda amb usa_puntos = true, exactament igual
--  que ara. El nou (S15) es crea al seed amb usa_puntos = false.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) La taula `equipo` guanya el flag de punts. L'equip que ja tens → true.
-- ---------------------------------------------------------------------------
alter table equipo add column if not exists usa_puntos boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2) Afegim `equipo_id` a les taules "arrel" i l'omplim amb l'equip actual.
--    (En aquest moment només hi ha un equip, així que el backfill és segur.)
-- ---------------------------------------------------------------------------
alter table perfiles       add column if not exists equipo_id uuid references equipo(id) on delete cascade;
alter table eventos        add column if not exists equipo_id uuid references equipo(id) on delete cascade;
alter table motivos_puntos add column if not exists equipo_id uuid references equipo(id) on delete cascade;
alter table reglas_alerta  add column if not exists equipo_id uuid references equipo(id) on delete cascade;

-- Backfill: tot el que ja existeix pertany a l'únic equip actual.
update perfiles       set equipo_id = (select id from equipo order by created_at limit 1) where equipo_id is null;
update eventos        set equipo_id = (select id from equipo order by created_at limit 1) where equipo_id is null;
update motivos_puntos set equipo_id = (select id from equipo order by created_at limit 1) where equipo_id is null;
update reglas_alerta  set equipo_id = (select id from equipo order by created_at limit 1) where equipo_id is null;

-- Ara ja no pot ser NULL.
alter table perfiles       alter column equipo_id set not null;
alter table eventos        alter column equipo_id set not null;
alter table motivos_puntos alter column equipo_id set not null;
alter table reglas_alerta  alter column equipo_id set not null;

create index if not exists idx_perfiles_equipo on perfiles(equipo_id);
create index if not exists idx_eventos_equipo  on eventos(equipo_id);

-- ---------------------------------------------------------------------------
-- 3) L'entrenament únic per dia passa a ser únic per dia I EQUIP
--    (si no, dos equips no podrien entrenar el mateix dia).
-- ---------------------------------------------------------------------------
drop index if exists uq_entreno_fecha;
create unique index if not exists uq_entreno_fecha
  on eventos(equipo_id, fecha) where tipo = 'entrenamiento';

-- ---------------------------------------------------------------------------
-- 4) Funcions auxiliars d'equip.
-- ---------------------------------------------------------------------------

-- Equip (equipo_id) de l'usuari actual.
create or replace function my_team() returns uuid
language sql security definer set search_path = public stable as $$
  select equipo_id from perfiles where user_id = auth.uid();
$$;

-- Un perfil pertany al meu equip? (per a les polítiques de les taules filles).
create or replace function same_team(p_profile uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from perfiles p where p.id = p_profile and p.equipo_id = my_team()
  );
$$;

-- Dades públiques del meu equip (nom + flag de punts, SENSE els codis).
create or replace function get_mi_equipo()
returns table (id uuid, nombre text, usa_puntos boolean)
language sql security definer set search_path = public stable as $$
  select e.id, e.nombre, e.usa_puntos from equipo e where e.id = my_team();
$$;

-- En inserir events / motius / regles sense equipo_id, l'assignem al de l'usuari.
-- Així el frontend no ha de conèixer l'equip: la BD el posa sola.
create or replace function set_equipo_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.equipo_id is null then new.equipo_id := my_team(); end if;
  return new;
end;
$$;

drop trigger if exists trg_set_equipo_eventos on eventos;
drop trigger if exists trg_set_equipo_motivos on motivos_puntos;
drop trigger if exists trg_set_equipo_reglas  on reglas_alerta;
create trigger trg_set_equipo_eventos before insert on eventos
  for each row execute function set_equipo_id();
create trigger trg_set_equipo_motivos before insert on motivos_puntos
  for each row execute function set_equipo_id();
create trigger trg_set_equipo_reglas before insert on reglas_alerta
  for each row execute function set_equipo_id();

-- ---------------------------------------------------------------------------
-- 5) Funcions existents, ara filtrades per equip.
-- ---------------------------------------------------------------------------

-- Alta: llista de perfils no reclamats per a un codi. El codi identifica
-- l'equip I el rol (cada equip té team_code i staff_code).
create or replace function list_unclaimed_profiles(p_code text)
returns table (id uuid, nombre text, rol text)
language plpgsql security definer set search_path = public stable as $$
declare v_equipo uuid; v_rol text;
begin
  select e.id,
         case when p_code = e.staff_code then 'entrenador'
              when p_code = e.team_code  then 'jugador' end
    into v_equipo, v_rol
  from equipo e
  where e.team_code = p_code or e.staff_code = p_code
  limit 1;
  if v_equipo is null or v_rol is null then return; end if;
  return query
    select p.id, p.nombre, p.rol
    from perfiles p
    where p.equipo_id = v_equipo and p.rol = v_rol and p.user_id is null
    order by p.nombre;
end;
$$;

-- Reclamar un perfil durant l'alta (valida el codi contra l'equip del perfil).
create or replace function claim_profile(p_profile_id uuid, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rol text; v_user uuid; v_equipo uuid; v_team text; v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión antes de reclamar un perfil';
  end if;
  if exists (select 1 from perfiles where user_id = auth.uid()) then
    raise exception 'Este usuario ya tiene un perfil asignado';
  end if;
  select rol, user_id, equipo_id into v_rol, v_user, v_equipo
    from perfiles where id = p_profile_id;
  if v_rol is null then raise exception 'Perfil no encontrado'; end if;
  if v_user is not null then raise exception 'Ese jugador ya ha sido reclamado'; end if;

  select team_code, staff_code into v_team, v_staff from equipo where id = v_equipo;
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

-- Classificació (només del meu equip).
create or replace function get_clasificacion()
returns table (id uuid, nombre text, sumados int, restados int, total int)
language sql security definer set search_path = public stable as $$
  select p.id, p.nombre,
    coalesce(sum(case when pt.puntos > 0 then pt.puntos else 0 end),0)::int,
    coalesce(sum(case when pt.puntos < 0 then pt.puntos else 0 end),0)::int,
    coalesce(sum(pt.puntos),0)::int
  from perfiles p
  left join puntos pt on pt.profile_id = p.id
  where p.rol = 'jugador' and not p.demo and p.equipo_id = my_team()
  group by p.id, p.nombre
  order by 5 desc, p.nombre;
$$;

-- Jugadors públics (del meu equip).
create or replace function get_jugadores_publicos()
returns table (id uuid, nombre text)
language sql security definer set search_path = public stable as $$
  select id, nombre from perfiles
  where rol = 'jugador' and not demo and equipo_id = my_team()
  order by nombre;
$$;

-- Desglossament de punts d'un jugador (només si és del meu equip).
create or replace function get_desglose_jugador(p_id uuid)
returns table (fecha date, puntos int, motivo text, created_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if not same_team(p_id) then return; end if;
  return query
    select pt.fecha, pt.puntos, pt.motivo, pt.created_at
    from puntos pt where pt.profile_id = p_id
    order by pt.fecha desc, pt.created_at desc;
end;
$$;

-- Enquestes pendents d'un jugador (events del seu equip).
create or replace function get_pendientes(p_profile uuid)
returns table (evento_id uuid, tipo_encuesta text, fecha date, titulo text, tipo_evento text)
language plpgsql security definer set search_path = public stable as $$
declare
  hoy       date := (now() at time zone 'Europe/Madrid')::date;
  v_equipo  uuid := (select equipo_id from perfiles where id = p_profile);
begin
  if p_profile <> my_profile_id() and not (is_coach() and same_team(p_profile)) then
    raise exception 'No autorizado';
  end if;
  return query
    select e.id, 'wellness'::text, e.fecha, e.titulo, e.tipo
    from eventos e
    where e.equipo_id = v_equipo and e.fecha = hoy
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p_profile)
      and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p_profile and x.tipo = 'wellness')
      and not exists (select 1 from lesiones l where l.profile_id = p_profile and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p_profile and a.estado in ('lesionado','no_vino'))
      and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p_profile)
    union all
    select e.id, 'rpe'::text, e.fecha, e.titulo, e.tipo
    from eventos e
    where e.equipo_id = v_equipo and e.fecha between hoy - 1 and hoy
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p_profile)
      and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p_profile and x.tipo = 'rpe')
      and not exists (select 1 from lesiones l where l.profile_id = p_profile and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p_profile and a.estado in ('lesionado','no_vino'))
      and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p_profile)
    order by fecha desc;
end;
$$;

-- Resum de pendents de tot l'equip (només entrenadors, del seu equip).
create or replace function get_resumen_pendientes()
returns table (profile_id uuid, nombre text, wellness_pend int, rpe_pend int)
language plpgsql security definer set search_path = public stable as $$
declare hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  return query
    select p.id, p.nombre,
      (select count(*) from eventos e
        where e.equipo_id = my_team() and e.fecha = hoy
          and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
          and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p.id and x.tipo = 'wellness')
          and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
          and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p.id and a.estado in ('lesionado','no_vino'))
          and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p.id))::int,
      (select count(*) from eventos e
        where e.equipo_id = my_team() and e.fecha between hoy - 1 and hoy
          and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
          and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p.id and x.tipo = 'rpe')
          and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
          and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p.id and a.estado in ('lesionado','no_vino'))
          and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p.id))::int
    from perfiles p
    where p.rol = 'jugador' and not p.demo and p.equipo_id = my_team()
    order by p.nombre;
end;
$$;

-- Generar entrenaments (dt/dc/dv) per al MEU equip.
create or replace function generar_entrenamientos(desde date, hasta date)
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  with ins as (
    insert into eventos (tipo, fecha, titulo, equipo_id)
    select 'entrenamiento', g::date, 'Entrenamiento', my_team()
    from generate_series(desde, hasta, interval '1 day') g
    where extract(dow from g) in (2,3,5)
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Penalitzacions automàtiques: només per a equips amb usa_puntos = true.
-- ---------------------------------------------------------------------------

-- TARDE → -1 (només si l'equip del jugador usa punts).
create or replace function penalizar_tarde() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tipo   text := tg_argv[0];
  v_cod    text := case when v_tipo = 'wellness' then 'well' else 'rpe' end;
  v_nombre text := case when v_tipo = 'wellness' then 'Wellness' else 'RPE' end;
  v_usa    boolean;
begin
  -- Si llega una respuesta, retira una posible penalización de "sin responder".
  delete from puntos
   where profile_id = new.profile_id and evento_id = new.evento_id
     and codigo = v_cod || '_falta';

  select e.usa_puntos into v_usa
    from equipo e join perfiles p on p.equipo_id = e.id
   where p.id = new.profile_id;

  if coalesce(v_usa, false) and new.a_tiempo = false then
    insert into puntos (profile_id, puntos, motivo, evento_id, fecha, codigo)
    select new.profile_id, -1, v_nombre || ' respondido tarde',
           new.evento_id, e.fecha, v_cod || '_tarde'
    from eventos e where e.id = new.evento_id
    on conflict (profile_id, evento_id, codigo) where codigo is not null
    do nothing;
  end if;
  return new;
end;
$$;

-- FALTA → -2 (barrido), només per al meu equip i si usa punts.
create or replace function aplicar_penalizaciones()
returns int
language plpgsql security definer set search_path = public as $$
declare
  hoy          date := (now() at time zone 'Europe/Madrid')::date;
  fecha_inicio constant date := date '2026-08-24';
  n int := 0;
begin
  -- Si el meu equip no usa punts, no fem res.
  if coalesce((select usa_puntos from equipo where id = my_team()), false) = false then
    return 0;
  end if;

  -- Autocorrección (només del meu equip).
  delete from puntos pt
  using eventos e
  where pt.evento_id = e.id
    and e.equipo_id = my_team()
    and pt.codigo in ('well_falta','rpe_falta')
    and (
         (pt.codigo = 'well_falta' and exists (select 1 from wellness w where w.evento_id = pt.evento_id and w.profile_id = pt.profile_id))
      or (pt.codigo = 'rpe_falta'  and exists (select 1 from rpe r      where r.evento_id = pt.evento_id and r.profile_id = pt.profile_id))
      or exists (select 1 from desconvocados d where d.evento_id = pt.evento_id and d.profile_id = pt.profile_id)
      or exists (select 1 from exenciones x where x.evento_id = pt.evento_id and x.profile_id = pt.profile_id
                   and x.tipo = case when pt.codigo = 'well_falta' then 'wellness' else 'rpe' end)
      or exists (select 1 from lesiones l where l.profile_id = pt.profile_id and e.fecha between l.fecha_inicio and l.fecha_fin)
      or exists (select 1 from asistencia a where a.evento_id = pt.evento_id and a.profile_id = pt.profile_id and a.estado in ('lesionado','no_vino'))
    );

  -- WELLNESS sin responder.
  with faltas as (
    insert into puntos (profile_id, puntos, motivo, evento_id, fecha, codigo)
    select p.id, -2, 'Wellness sin responder', e.id, e.fecha, 'well_falta'
    from eventos e
    cross join perfiles p
    where p.rol = 'jugador' and not p.demo and p.equipo_id = my_team()
      and e.equipo_id = my_team()
      and e.fecha >= fecha_inicio
      and e.fecha < hoy
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
      and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p.id and x.tipo = 'wellness')
      and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p.id and a.estado in ('lesionado','no_vino'))
      and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p.id)
    on conflict (profile_id, evento_id, codigo) where codigo is not null do nothing
    returning 1
  )
  select n + count(*) into n from faltas;

  -- RPE sin responder.
  with faltas as (
    insert into puntos (profile_id, puntos, motivo, evento_id, fecha, codigo)
    select p.id, -2, 'RPE sin responder', e.id, e.fecha, 'rpe_falta'
    from eventos e
    cross join perfiles p
    where p.rol = 'jugador' and not p.demo and p.equipo_id = my_team()
      and e.equipo_id = my_team()
      and e.fecha >= fecha_inicio
      and e.fecha < hoy - 1
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
      and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p.id and x.tipo = 'rpe')
      and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p.id and a.estado in ('lesionado','no_vino'))
      and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p.id)
    on conflict (profile_id, evento_id, codigo) where codigo is not null do nothing
    returning 1
  )
  select n + count(*) into n from faltas;

  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) POLÍTIQUES RLS  ·  cada entrenador només veu el SEU equip.
-- ---------------------------------------------------------------------------

-- equipo: només l'entrenador del propi equip (els codis no els veu ningú més).
drop policy if exists equipo_coach on equipo;
create policy equipo_coach on equipo for all
  using (is_coach() and id = my_team()) with check (is_coach() and id = my_team());

-- perfiles
drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles for select
  using (user_id = auth.uid() or (is_coach() and equipo_id = my_team()));
drop policy if exists perfiles_coach on perfiles;
create policy perfiles_coach on perfiles for all
  using (is_coach() and equipo_id = my_team())
  with check (is_coach() and equipo_id = my_team());

-- eventos
drop policy if exists eventos_read on eventos;
create policy eventos_read on eventos for select
  using (auth.uid() is not null and equipo_id = my_team());
drop policy if exists eventos_coach on eventos;
create policy eventos_coach on eventos for all
  using (is_coach() and equipo_id = my_team())
  with check (is_coach() and equipo_id = my_team());

-- desconvocados
drop policy if exists desconv_read on desconvocados;
create policy desconv_read on desconvocados for select using (same_team(profile_id));
drop policy if exists desconv_coach on desconvocados;
create policy desconv_coach on desconvocados for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- exenciones
drop policy if exists exenciones_read on exenciones;
create policy exenciones_read on exenciones for select using (same_team(profile_id));
drop policy if exists exenciones_coach on exenciones;
create policy exenciones_coach on exenciones for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- minutos_jugados
drop policy if exists minutos_select on minutos_jugados;
create policy minutos_select on minutos_jugados for select
  using (profile_id = my_profile_id() or (is_coach() and same_team(profile_id)));
drop policy if exists minutos_coach on minutos_jugados;
create policy minutos_coach on minutos_jugados for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- motivos_puntos
drop policy if exists motivos_read on motivos_puntos;
create policy motivos_read on motivos_puntos for select
  using (auth.uid() is not null and equipo_id = my_team());
drop policy if exists motivos_coach on motivos_puntos;
create policy motivos_coach on motivos_puntos for all
  using (is_coach() and equipo_id = my_team())
  with check (is_coach() and equipo_id = my_team());

-- puntos
drop policy if exists puntos_read on puntos;
create policy puntos_read on puntos for select using (same_team(profile_id));
drop policy if exists puntos_coach on puntos;
create policy puntos_coach on puntos for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- reglas_alerta
drop policy if exists reglas_read on reglas_alerta;
create policy reglas_read on reglas_alerta for select
  using (auth.uid() is not null and equipo_id = my_team());
drop policy if exists reglas_coach on reglas_alerta;
create policy reglas_coach on reglas_alerta for all
  using (is_coach() and equipo_id = my_team())
  with check (is_coach() and equipo_id = my_team());

-- wellness
drop policy if exists wellness_select on wellness;
create policy wellness_select on wellness for select
  using (profile_id = my_profile_id() or (is_coach() and same_team(profile_id)));
drop policy if exists wellness_coach on wellness;
create policy wellness_coach on wellness for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- rpe
drop policy if exists rpe_select on rpe;
create policy rpe_select on rpe for select
  using (profile_id = my_profile_id() or (is_coach() and same_team(profile_id)));
drop policy if exists rpe_coach on rpe;
create policy rpe_coach on rpe for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- asistencia
drop policy if exists asist_select on asistencia;
create policy asist_select on asistencia for select
  using (profile_id = my_profile_id() or (is_coach() and same_team(profile_id)));
drop policy if exists asist_coach on asistencia;
create policy asist_coach on asistencia for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- lesiones
drop policy if exists lesiones_select on lesiones;
create policy lesiones_select on lesiones for select
  using (profile_id = my_profile_id() or (is_coach() and same_team(profile_id)));
drop policy if exists lesiones_coach on lesiones;
create policy lesiones_coach on lesiones for all
  using (is_coach() and same_team(profile_id))
  with check (is_coach() and same_team(profile_id));

-- ---------------------------------------------------------------------------
-- 8) Permisos d'execució de les noves funcions.
-- ---------------------------------------------------------------------------
grant execute on function my_team()            to authenticated;
grant execute on function same_team(uuid)      to authenticated;
grant execute on function get_mi_equipo()      to authenticated;

commit;

-- ============================================================================
--  FI. Ara executa `seed_sub15.sql` per crear l'equip Sub 15.
-- ============================================================================
