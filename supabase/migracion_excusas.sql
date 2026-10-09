-- ============================================================================
--  MIGRACIÓN · excusar una encuesta retira SIEMPRE sus penalizaciones
-- ----------------------------------------------------------------------------
--  Antes, al excusar un Wellness/RPE:
--    · el −2 de "sin responder" solo se retiraba al abrir el Panel, y
--    · el −1 de "respondido tarde" NO se retiraba nunca.
--
--  Ahora:
--    · Al excusar (aunque sea a posteriori) se borran AL MOMENTO el −1 y el −2
--      de esa encuesta para ese jugador.
--    · Si el jugador responde tarde una encuesta que ya estaba excusada, no se
--      le resta nada.
--    · Si se quita la excusa, vuelve la penalización que toque (el −1 al
--      momento si respondió tarde; el −2 en el siguiente barrido).
--    · Limpieza única: se retiran ya las penalizaciones de encuestas que hoy
--      están excusadas.
--
--  No toca ningún otro punto. Ejecutar UNA vez en Supabase → SQL Editor → RUN.
--  Es re-ejecutable.
-- ============================================================================

begin;

-- 1) TARDE → −1, salvo que la encuesta esté excusada. --------------------------
create or replace function penalizar_tarde() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tipo   text := tg_argv[0];                                   -- 'wellness' | 'rpe'
  v_cod    text := case when v_tipo = 'wellness' then 'well' else 'rpe' end;
  v_nombre text := case when v_tipo = 'wellness' then 'Wellness' else 'RPE' end;
  v_usa    boolean;
begin
  -- Si llega una respuesta, retira una posible penalización de "sin responder".
  delete from puntos
   where profile_id = new.profile_id and evento_id = new.evento_id
     and codigo = v_cod || '_falta';

  -- Encuesta excusada → nunca se penaliza.
  if exists (select 1 from exenciones x
              where x.evento_id = new.evento_id and x.profile_id = new.profile_id
                and x.tipo = v_tipo) then
    return new;
  end if;

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

-- 2) Al EXCUSAR → borrar el −1 y el −2 de esa encuesta. ------------------------
create or replace function exencion_retira_penalizaciones() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cod text := case when new.tipo = 'wellness' then 'well' else 'rpe' end;
begin
  delete from puntos
   where profile_id = new.profile_id and evento_id = new.evento_id
     and codigo in (v_cod || '_tarde', v_cod || '_falta');
  return new;
end;
$$;

drop trigger if exists trg_exencion_retira on exenciones;
create trigger trg_exencion_retira after insert on exenciones
  for each row execute function exencion_retira_penalizaciones();

-- 3) Al QUITAR la excusa → si respondió tarde, vuelve el −1. -------------------
--    (El −2 de "sin responder" lo vuelve a poner aplicar_penalizaciones.)
create or replace function exencion_quitada() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cod    text := case when old.tipo = 'wellness' then 'well' else 'rpe' end;
  v_nombre text := case when old.tipo = 'wellness' then 'Wellness' else 'RPE' end;
  v_tarde  boolean;
  v_usa    boolean;
begin
  if old.tipo = 'wellness' then
    select exists (select 1 from wellness w where w.evento_id = old.evento_id
                     and w.profile_id = old.profile_id and w.a_tiempo = false) into v_tarde;
  else
    select exists (select 1 from rpe r where r.evento_id = old.evento_id
                     and r.profile_id = old.profile_id and r.a_tiempo = false) into v_tarde;
  end if;

  select e.usa_puntos into v_usa
    from equipo e join perfiles p on p.equipo_id = e.id
   where p.id = old.profile_id;

  if v_tarde and coalesce(v_usa, false) then
    insert into puntos (profile_id, puntos, motivo, evento_id, fecha, codigo)
    select old.profile_id, -1, v_nombre || ' respondido tarde',
           old.evento_id, e.fecha, v_cod || '_tarde'
    from eventos e where e.id = old.evento_id
    on conflict (profile_id, evento_id, codigo) where codigo is not null
    do nothing;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_exencion_quitada on exenciones;
create trigger trg_exencion_quitada after delete on exenciones
  for each row execute function exencion_quitada();

-- 4) Limpieza única: encuestas ya excusadas que aún tienen penalización. -------
delete from puntos pt
 using exenciones x
 where x.evento_id = pt.evento_id and x.profile_id = pt.profile_id
   and pt.codigo in (
     case when x.tipo = 'wellness' then 'well_tarde' else 'rpe_tarde' end,
     case when x.tipo = 'wellness' then 'well_falta' else 'rpe_falta' end
   );

commit;
