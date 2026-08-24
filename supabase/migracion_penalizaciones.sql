-- ============================================================================
--  MIGRACIÓN · penalizaciones automáticas por encuestas
-- ----------------------------------------------------------------------------
--  Reglas (por encuesta, wellness y RPE por separado):
--    · Responder TARDE (a_tiempo = false) ....... -1 punto.
--    · NO responder (encuesta ya cerrada) ....... -2 puntos.
--
--  Se aplican SOLO de aquí en adelante: encuestas de eventos con fecha >=
--  FECHA_INICIO (por defecto 2026-08-24). No se toca nada anterior.
--
--  Cómo funciona:
--    · TARDE  → un trigger inserta el -1 en cuanto el jugador envía tarde.
--    · FALTA  → la función aplicar_penalizaciones() revisa las encuestas ya
--               cerradas sin responder e inserta el -2. La app la llama sola
--               al abrir el panel de entrenador; también puede ejecutarse a mano
--               o con pg_cron (ver el final del archivo).
--
--  Todo es idempotente (índice único por `codigo`): ejecutar la función mil
--  veces NO duplica penalizaciones. Además se autocorrige: si el jugador acaba
--  respondiendo, o el entrenador lo excusa / marca lesionado / no convocado,
--  la penalización de "sin responder" se retira sola.
--
--  Ejecutar UNA vez en Supabase → SQL Editor → RUN.
--  (Si en el futuro reejecutas schema.sql completo, ya no hace falta.)
-- ============================================================================

-- 1) Marca interna para identificar las penalizaciones automáticas y no duplicarlas.
--    Códigos: well_tarde | well_falta | rpe_tarde | rpe_falta
alter table puntos add column if not exists codigo text;

create unique index if not exists uq_puntos_codigo
  on puntos(profile_id, evento_id, codigo) where codigo is not null;

-- 2) TARDE → -1 (trigger al insertar una respuesta).
create or replace function penalizar_tarde() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tipo   text := tg_argv[0];                                   -- 'wellness' | 'rpe'
  v_cod    text := case when v_tipo = 'wellness' then 'well' else 'rpe' end;
  v_nombre text := case when v_tipo = 'wellness' then 'Wellness' else 'RPE' end;
begin
  -- Si llega una respuesta, retira cualquier penalización de "sin responder"
  -- que hubiera para esa encuesta (defensa por si respondió tras un cierre).
  delete from puntos
   where profile_id = new.profile_id and evento_id = new.evento_id
     and codigo = v_cod || '_falta';

  -- Respuesta tardía → -1 (idempotente por el índice único).
  if new.a_tiempo = false then
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

drop trigger if exists trg_wellness_tarde on wellness;
drop trigger if exists trg_rpe_tarde on rpe;
create trigger trg_wellness_tarde after insert on wellness
  for each row execute function penalizar_tarde('wellness');
create trigger trg_rpe_tarde after insert on rpe
  for each row execute function penalizar_tarde('rpe');

-- 3) FALTA → -2 (barrido de encuestas cerradas sin responder) + autocorrección.
create or replace function aplicar_penalizaciones()
returns int
language plpgsql security definer set search_path = public as $$
declare
  hoy          date := (now() at time zone 'Europe/Madrid')::date;
  fecha_inicio constant date := date '2026-08-24';  -- solo de aquí en adelante
  n int := 0;
begin
  -- 3a) Autocorrección: retira "sin responder" que ya no proceda
  --     (respondió, o quedó excusado / lesionado / no convocado ese evento).
  delete from puntos pt
  using eventos e
  where pt.evento_id = e.id
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

  -- 3b) WELLNESS sin responder (cerrado: terminó su día → e.fecha < hoy).
  with faltas as (
    insert into puntos (profile_id, puntos, motivo, evento_id, fecha, codigo)
    select p.id, -2, 'Wellness sin responder', e.id, e.fecha, 'well_falta'
    from eventos e
    cross join perfiles p
    where p.rol = 'jugador' and not p.demo
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

  -- 3c) RPE sin responder (cerrado: pasó el día siguiente → e.fecha < hoy - 1).
  with faltas as (
    insert into puntos (profile_id, puntos, motivo, evento_id, fecha, codigo)
    select p.id, -2, 'RPE sin responder', e.id, e.fecha, 'rpe_falta'
    from eventos e
    cross join perfiles p
    where p.rol = 'jugador' and not p.demo
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

grant execute on function aplicar_penalizaciones() to authenticated;

-- 4) (OPCIONAL) Ejecutarla sola cada noche con pg_cron, además de al abrir el
--    panel. Requiere activar la extensión pg_cron (Dashboard → Database →
--    Extensions). Deja el bloque comentado si no la usas.
--
--    create extension if not exists pg_cron;
--    select cron.schedule('penalizaciones-diarias', '0 3 * * *',
--                         $$ select aplicar_penalizaciones(); $$);
