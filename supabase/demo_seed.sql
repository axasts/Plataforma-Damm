-- ============================================================================
--  DADES DEMO · Plataforma Cadet A · CF Damm
-- ----------------------------------------------------------------------------
--  Omple la base de dades amb dades d'exemple realistes (entrenaments, partits,
--  wellness, RPE, punts, una lesió, no convocats i un "Entrenador Demo") perquè
--  l'app es vegi VIVA quan l'ensenyis als altres entrenadors.
--
--  COM FER-HO SERVIR:
--    Supabase → SQL Editor → New query → enganxa TOT aquest fitxer → RUN.
--
--  REQUISIT: abans has d'haver executat `schema.sql` (crea taules + plantilla).
--
--  ÉS REPETIBLE: buida només les dades d'activitat i les torna a generar. NO
--  toca la plantilla, els codis, el catàleg de sancions ni les regles d'avís.
--  Per treure la demo i deixar-ho tot net, torna a executar `schema.sql`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Neteja de dades d'activitat (manté plantilla, codis, catàleg i regles).
--    Es fa dins d'una transacció perquè, si res falla, no quedi a mitges.
-- ----------------------------------------------------------------------------
begin;

truncate table wellness, rpe, puntos, desconvocados, asistencia, lesiones, eventos
  restart identity cascade;

-- ----------------------------------------------------------------------------
-- 2. Entrenador Demo: un login compartit per ensenyar l'app als entrenadors.
--    Idempotent: només el crea si encara no existeix.
-- ----------------------------------------------------------------------------
insert into perfiles (nombre, rol)
select 'Entrenador Demo', 'entrenador'
where not exists (select 1 from perfiles where nombre = 'Entrenador Demo');

-- ----------------------------------------------------------------------------
-- 3. Esdeveniments: 3 setmanes d'entrenaments passats (dt=2, dc=3, dv=5)
--    + 2 partits recents.
-- ----------------------------------------------------------------------------
insert into eventos (tipo, fecha, titulo)
select 'entrenamiento', g::date, 'Entrenamiento'
from generate_series(current_date - interval '21 days', current_date, interval '1 day') g
where extract(dow from g) in (2, 3, 5)
on conflict do nothing;

insert into eventos (tipo, fecha, hora, rival, titulo) values
  ('partido', (current_date - 16)::date, time '11:30', 'Sant Just',  'Partido'),
  ('partido', (current_date -  2)::date, time '12:00', 'Granollers', 'Partido');

-- ----------------------------------------------------------------------------
-- 4. Wellness: la majoria de jugadors responen en cada esdeveniment passat.
--    Valors 0–10; la majoria "a temps".
-- ----------------------------------------------------------------------------
insert into wellness (profile_id, evento_id, sueno, fatiga, dolor_muscular, estres, animo, a_tiempo)
select p.id, e.id,
  (4 + floor(random() * 7))::int,   -- sueno    4..10
  (4 + floor(random() * 7))::int,   -- fatiga   4..10
  (floor(random() * 11))::int,      -- dolor    0..10
  (4 + floor(random() * 7))::int,   -- estres   4..10
  (4 + floor(random() * 7))::int,   -- animo    4..10
  random() > 0.2                    -- a_tiempo (~80% a temps)
from perfiles p
cross join eventos e
where p.rol = 'jugador'
  and e.fecha < current_date
  and random() > 0.15               -- ~85% dels jugadors responen cada event
on conflict (profile_id, evento_id) do nothing;

-- ----------------------------------------------------------------------------
-- 5. RPE: la majoria de jugadors responen després de cada esdeveniment passat.
-- ----------------------------------------------------------------------------
insert into rpe (profile_id, evento_id, rpe_muscular, rpe_respiratorio, a_tiempo)
select p.id, e.id,
  (3 + floor(random() * 7))::int,   -- muscular      3..9
  (3 + floor(random() * 7))::int,   -- respiratorio  3..9
  random() > 0.2
from perfiles p
cross join eventos e
where p.rol = 'jugador'
  and e.fecha < current_date
  and random() > 0.2                -- ~80% responen
on conflict (profile_id, evento_id) do nothing;

-- ----------------------------------------------------------------------------
-- 6. Garantir alguna ALERTA recent: un parell de RPE alts els últims dies
--    (dispara les regles "rpe_muscular >= 9" i "rpe_respiratorio >= 9").
-- ----------------------------------------------------------------------------
update rpe set rpe_muscular = 9, rpe_respiratorio = 9
where id in (
  select r.id
  from rpe r
  join eventos e on e.id = r.evento_id
  where e.fecha >= current_date - 3
  order by random()
  limit 2
);

-- ----------------------------------------------------------------------------
-- 7. Punts: sancions esparses del catàleg + punts positius d'exercicis.
-- ----------------------------------------------------------------------------
-- 7a. Sancions ocasionals (agafa motius actius del catàleg a l'atzar).
insert into puntos (profile_id, puntos, motivo, motivo_id, fecha)
select p.id, m.puntos, m.nombre, m.id, (current_date - (floor(random() * 20))::int)::date
from perfiles p
cross join motivos_puntos m
where p.rol = 'jugador' and m.activo and random() < 0.05;

-- 7b. Punts positius d'exercicis (uns quants per jugador) perquè la
--     classificació tingui sumatoris i no quedi tot en negatiu.
insert into puntos (profile_id, puntos, motivo, fecha)
select p.id, (5 + floor(random() * 20))::int, 'Ejercicio puntuable',
       (current_date - (floor(random() * 14))::int)::date
from perfiles p
cross join generate_series(1, 3) g
where p.rol = 'jugador';

-- ----------------------------------------------------------------------------
-- 8. Una lesió ACTIVA (demo): un jugador lesionat ara mateix.
--    Mentre dura, l'app el marca com a lesionat i no li demana RPE.
-- ----------------------------------------------------------------------------
insert into lesiones (profile_id, fecha_inicio, fecha_fin, descripcion)
select id, (current_date - 3)::date, (current_date + 10)::date, 'Esguince de tobillo (demo)'
from perfiles where rol = 'jugador' order by random() limit 1;

-- ----------------------------------------------------------------------------
-- 9. No convocats a l'últim partit (demo): 2 jugadors → exclosos d'enquestes.
-- ----------------------------------------------------------------------------
insert into desconvocados (evento_id, profile_id)
select e.id, p.id
from (select id from eventos where tipo = 'partido' order by fecha desc limit 1) e
cross join (select id from perfiles where rol = 'jugador' order by random() limit 2) p
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 10. Assistència: un parell d'excepcions a l'últim entrenament (demo),
--     perquè la pantalla d'assistència no surti buida. La resta queda "ok"
--     per defecte (l'app només desa les excepcions).
-- ----------------------------------------------------------------------------
with ultimo as (
  select id from eventos where tipo = 'entrenamiento' order by fecha desc limit 1
),
jugadores as (
  select id, row_number() over () as rn
  from (select id from perfiles where rol = 'jugador' order by random() limit 2) s
)
insert into asistencia (evento_id, profile_id, estado)
select u.id, j.id, case when j.rn = 1 then 'no_vino' else 'lesionado' end
from ultimo u
cross join jugadores j
on conflict (evento_id, profile_id) do nothing;

commit;

-- ============================================================================
--  FI · L'app ja hauria de mostrar classificació, gràfiques, pendents,
--  assistència, una lesió activa i alertes de RPE.
-- ============================================================================
