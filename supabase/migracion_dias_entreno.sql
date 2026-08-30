-- ============================================================================
--  HORARIS D'ENTRENAMENT PER EQUIP  ·  Plataforma CF Damm
-- ----------------------------------------------------------------------------
--  Fins ara "Generar entrenos" creava entrenaments FIXOS a dimarts/dimecres/
--  divendres per a tothom. Ara cada equip té el seu horari a la BD.
--
--  Es guarda a `equipo.horario_entreno` (jsonb) com un mapa
--     { "<dia_setmana>": "<hora_inici>" }
--  on el dia és el codi de Postgres (0=diumenge … 6=dissabte) i l'hora pot ser
--  null (entrenament sense hora). Les CLAUS presents = dies que s'entrena.
--
--  Aditiva i no destructiva. Re-executable.
--
--    · Cadet A / S16 → dimarts(2), dimecres(3), divendres(5), sense hora (igual que ara).
--    · Sub 15        → dimarts(2) 18:30, dijous(4) 19:30, divendres(5) 18:30.
--
--  (0=Dg · 1=Dl · 2=Dt · 3=Dc · 4=Dj · 5=Dv · 6=Ds)
-- ============================================================================

begin;

-- 1) Nova columna. El valor per defecte (dt/dc/dv sense hora) fa que els equips
--    existents (Cadet A) segueixin EXACTAMENT igual que fins ara.
alter table equipo
  add column if not exists horario_entreno jsonb not null
  default '{"2": null, "3": null, "5": null}'::jsonb;

-- 2) Horari del Sub 15 (dt/dv 18:30, dj 19:30).
update equipo
   set horario_entreno = '{"2": "18:30", "4": "19:30", "5": "18:30"}'::jsonb
 where nombre = 'Sub 15 · CF Damm';

-- 3) La generació d'entrenaments passa a llegir l'horari del propi equip.
create or replace function generar_entrenamientos(desde date, hasta date)
returns int
language plpgsql security definer set search_path = public as $$
declare n int; v_horario jsonb;
begin
  if not is_coach() then raise exception 'No autorizado'; end if;
  select horario_entreno into v_horario from equipo where id = my_team();
  with ins as (
    insert into eventos (tipo, fecha, titulo, hora, equipo_id)
    select 'entrenamiento', g::date, 'Entrenamiento',
           (v_horario ->> (extract(dow from g)::int::text))::time,  -- hora d'inici o null
           my_team()
    from generate_series(desde, hasta, interval '1 day') g
    where v_horario ? (extract(dow from g)::int::text)              -- només els dies configurats
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

commit;

-- ============================================================================
--  Comprovació: horari de cada equip.
-- ============================================================================
select nombre, horario_entreno from equipo order by nombre;
