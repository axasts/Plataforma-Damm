-- ============================================================================
--  MIGRACIÓN · varias clasificaciones (reset de puntos con histórico)
-- ----------------------------------------------------------------------------
--  Permite "resetear" la clasificación de puntos de vez en cuando SIN borrar
--  nada: el entrenador abre una NUEVA clasificación a partir de una fecha y
--  las anteriores quedan guardadas como histórico (consultables en Ranking).
--
--  Cómo funciona:
--    · Tabla `clasificaciones` (por equipo): nombre + fecha_inicio.
--    · Cada clasificación abarca desde su fecha_inicio hasta el día antes de la
--      siguiente. La última (la de fecha_inicio más reciente) es la ACTIVA.
--    · Un punto pertenece a la clasificación según su `fecha` (fecha del
--      entreno/partido). Así, una penalización que llega tarde de un evento
--      anterior al reset cuenta en la clasificación vieja, no en la nueva.
--    · Los puntos NO se tocan ni se borran: solo cambia cómo se agrupan.
--
--  Esta migración crea, para cada equipo con puntos, una "Clasificación
--  inicial" que abarca todo lo existente, así que tras ejecutarla el ranking se
--  ve exactamente igual que antes.
--
--  Ejecutar UNA vez en Supabase → SQL Editor → RUN. Es re-ejecutable.
-- ============================================================================

begin;

-- 1) Tabla de clasificaciones ------------------------------------------------
create table if not exists clasificaciones (
  id           uuid primary key default gen_random_uuid(),
  equipo_id    uuid not null references equipo(id) on delete cascade,
  nombre       text not null,
  fecha_inicio date not null,
  created_at   timestamptz not null default now(),
  unique (equipo_id, fecha_inicio)
);

alter table clasificaciones enable row level security;

-- Lectura para todo el equipo; las escrituras solo vía funciones (abajo).
drop policy if exists clasif_read on clasificaciones;
create policy clasif_read on clasificaciones for select
  using (auth.uid() is not null and equipo_id = my_team());

-- Clasificación inicial para los equipos que ya existen (cubre todo lo anterior).
insert into clasificaciones (equipo_id, nombre, fecha_inicio)
select e.id, 'Clasificación inicial', date '2000-01-01'
from equipo e
where not exists (select 1 from clasificaciones c where c.equipo_id = e.id);

-- 2) Listado de clasificaciones del equipo (con su fecha de fin) ---------------
create or replace function get_clasificaciones()
returns table (id uuid, nombre text, fecha_inicio date, fecha_fin date, activa boolean)
language sql security definer set search_path = public stable as $$
  select c.id, c.nombre, c.fecha_inicio,
         (lead(c.fecha_inicio) over (order by c.fecha_inicio) - 1) as fecha_fin,
         lead(c.fecha_inicio) over (order by c.fecha_inicio) is null as activa
  from clasificaciones c
  where c.equipo_id = my_team()
  order by c.fecha_inicio desc;
$$;

-- 3) Ranking ------------------------------------------------------------------
--   get_clasificacion()                    → clasificación ACTIVA (como antes)
--   get_clasificacion(p_clasificacion=id)  → una clasificación concreta
--   get_clasificacion(p_historico=true)    → total histórico (todos los puntos)
drop function if exists get_clasificacion();
drop function if exists get_clasificacion(uuid, boolean);
create or replace function get_clasificacion(
  p_clasificacion uuid default null,
  p_historico boolean default false
)
returns table (id uuid, nombre text, sumados int, restados int, total int)
language plpgsql security definer set search_path = public stable as $$
declare
  v_desde date := date '0001-01-01';
  v_hasta date := date '9999-12-31';
begin
  if not p_historico then
    select r.fecha_inicio, coalesce(r.fecha_fin, date '9999-12-31')
      into v_desde, v_hasta
    from get_clasificaciones() r
    where (p_clasificacion is null and r.activa) or r.id = p_clasificacion
    limit 1;
    -- Sin clasificaciones definidas → todo (comportamiento antiguo).
    v_desde := coalesce(v_desde, date '0001-01-01');
    v_hasta := coalesce(v_hasta, date '9999-12-31');
  end if;

  return query
    select p.id, p.nombre,
      coalesce(sum(case when pt.puntos > 0 then pt.puntos else 0 end),0)::int,
      coalesce(sum(case when pt.puntos < 0 then pt.puntos else 0 end),0)::int,
      coalesce(sum(pt.puntos),0)::int
    from perfiles p
    left join puntos pt on pt.profile_id = p.id
                       and pt.fecha between v_desde and v_hasta
    where p.rol = 'jugador' and not p.demo and p.equipo_id = my_team()
    group by p.id, p.nombre
    order by 5 desc, p.nombre;
end;
$$;

-- 4) Abrir una NUEVA clasificación (reset). Solo entrenadores. -----------------
create or replace function nueva_clasificacion(p_nombre text, p_fecha date default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_equipo uuid := my_team();
  v_fecha  date := coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date);
  v_ultima date;
  v_id     uuid;
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  if v_equipo is null then raise exception 'Sin equipo'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Pon un nombre a la clasificación'; end if;

  select max(fecha_inicio) into v_ultima from clasificaciones where equipo_id = v_equipo;
  if v_ultima is not null and v_fecha <= v_ultima then
    raise exception 'La fecha debe ser posterior al inicio de la clasificación actual (%)', to_char(v_ultima, 'DD/MM/YYYY');
  end if;
  if v_fecha > (now() at time zone 'Europe/Madrid')::date then
    raise exception 'La fecha no puede ser futura';
  end if;

  -- Si el equipo no tenía ninguna, guardamos lo anterior como "inicial".
  if v_ultima is null then
    insert into clasificaciones (equipo_id, nombre, fecha_inicio)
    values (v_equipo, 'Clasificación inicial', date '2000-01-01');
  end if;

  insert into clasificaciones (equipo_id, nombre, fecha_inicio)
  values (v_equipo, trim(p_nombre), v_fecha)
  returning id into v_id;
  return v_id;
end;
$$;

-- 5) Deshacer: borrar la clasificación ACTIVA (sus puntos vuelven a la anterior).
--    No borra ningún punto. No se puede borrar la única que queda.
create or replace function eliminar_clasificacion(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_equipo uuid := my_team();
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  if not exists (select 1 from get_clasificaciones() r where r.id = p_id and r.activa) then
    raise exception 'Solo se puede deshacer la clasificación actual';
  end if;
  if (select count(*) from clasificaciones where equipo_id = v_equipo) <= 1 then
    raise exception 'No se puede eliminar la única clasificación';
  end if;
  delete from clasificaciones where id = p_id and equipo_id = v_equipo;
end;
$$;

-- 6) Renombrar una clasificación. -------------------------------------------
create or replace function renombrar_clasificacion(p_id uuid, p_nombre text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Pon un nombre a la clasificación'; end if;
  update clasificaciones set nombre = trim(p_nombre)
   where id = p_id and equipo_id = my_team();
end;
$$;

grant execute on function get_clasificaciones()                to authenticated;
grant execute on function get_clasificacion(uuid, boolean)     to authenticated;
grant execute on function nueva_clasificacion(text, date)      to authenticated;
grant execute on function eliminar_clasificacion(uuid)         to authenticated;
grant execute on function renombrar_clasificacion(uuid, text)  to authenticated;

commit;

-- Que PostgREST (la API de Supabase) vea las funciones nuevas al momento.
notify pgrst, 'reload schema';
