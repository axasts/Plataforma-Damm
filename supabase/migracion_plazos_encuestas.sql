-- ============================================================================
--  MIGRACIÓN · plazos de las encuestas (wellness / RPE)
-- ----------------------------------------------------------------------------
--  Redefine get_pendientes y get_resumen_pendientes para que una encuesta deje
--  de aparecer como pendiente cuando ya NO se puede responder (se ha cerrado):
--
--    · Wellness → se puede responder solo el mismo día del evento
--                 (a tiempo hasta las 18:00 en entrenamiento, o hasta 1h30 antes
--                 de la hora en partido; tarde hasta las 23:59; luego cerrado).
--    · RPE      → se puede responder el mismo día y el siguiente
--                 (a tiempo hasta las 23:59 del día; tarde hasta el final del
--                 día siguiente; luego cerrado).
--
--  El "a tiempo / tarde / cerrado" exacto lo calcula el cliente (src/lib/utils.ts);
--  aquí solo controlamos qué sigue estando ABIERTO para responder.
--  Se usa la fecha local (Europe/Madrid) para no cerrar a medianoche UTC.
--
--  Ejecutar UNA vez en Supabase → SQL Editor → RUN.
--  (Si en el futuro reejecutas schema.sql completo, ya no hace falta.)
-- ============================================================================

create or replace function get_pendientes(p_profile uuid)
returns table (evento_id uuid, tipo_encuesta text, fecha date, titulo text, tipo_evento text)
language plpgsql security definer set search_path = public stable as $$
declare hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if p_profile <> my_profile_id() and not is_coach() then
    raise exception 'No autorizado';
  end if;
  return query
    -- Wellness pendents: només el mateix dia (es tanca en acabar el dia).
    select e.id, 'wellness'::text, e.fecha, e.titulo, e.tipo
    from eventos e
    where e.fecha = hoy
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p_profile)
      and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p_profile and x.tipo = 'wellness')
      and not exists (select 1 from lesiones l where l.profile_id = p_profile and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p_profile and a.estado in ('lesionado','no_vino'))
      and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p_profile)
    union all
    -- RPE pendents: el mateix dia i el següent (es tanca en acabar el dia següent).
    select e.id, 'rpe'::text, e.fecha, e.titulo, e.tipo
    from eventos e
    where e.fecha between hoy - 1 and hoy
      and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p_profile)
      and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p_profile and x.tipo = 'rpe')
      and not exists (select 1 from lesiones l where l.profile_id = p_profile and e.fecha between l.fecha_inicio and l.fecha_fin)
      and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p_profile and a.estado in ('lesionado','no_vino'))
      and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p_profile)
    order by fecha desc;
end;
$$;

create or replace function get_resumen_pendientes()
returns table (profile_id uuid, nombre text, wellness_pend int, rpe_pend int)
language plpgsql security definer set search_path = public stable as $$
declare hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  return query
    select p.id, p.nombre,
      (select count(*) from eventos e
        where e.fecha = hoy
          and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
          and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p.id and x.tipo = 'wellness')
          and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
          and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p.id and a.estado in ('lesionado','no_vino'))
          and not exists (select 1 from wellness w where w.evento_id = e.id and w.profile_id = p.id))::int,
      (select count(*) from eventos e
        where e.fecha between hoy - 1 and hoy
          and not exists (select 1 from desconvocados d where d.evento_id = e.id and d.profile_id = p.id)
          and not exists (select 1 from exenciones x where x.evento_id = e.id and x.profile_id = p.id and x.tipo = 'rpe')
          and not exists (select 1 from lesiones l where l.profile_id = p.id and e.fecha between l.fecha_inicio and l.fecha_fin)
          and not exists (select 1 from asistencia a where a.evento_id = e.id and a.profile_id = p.id and a.estado in ('lesionado','no_vino'))
          and not exists (select 1 from rpe r where r.evento_id = e.id and r.profile_id = p.id))::int
    from perfiles p
    where p.rol = 'jugador' and not p.demo
    order by p.nombre;
end;
$$;
