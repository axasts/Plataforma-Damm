-- ============================================================================
--  DADES DEMO · Plataforma Cadet A Damm
-- ----------------------------------------------------------------------------
--  Omple la base de dades amb dades d'exemple realistes (eventos, puntos,
--  wellness, RPE, una lesió i un entrenador demo) perquè la app es vegi VIVA
--  a l'hora d'ensenyar-la als altres entrenadors.
--
--  Com fer-ho servir:
--    SQL Editor → New query → enganxa aquest fitxer → RUN.
--
--  És repetible: buida les dades d'activitat i les torna a generar. NO toca
--  la plantilla ni els codis. Per treure la demo i deixar-ho net, torna a
--  executar `schema.sql`.
-- ============================================================================

-- 1. Neteja de dades d'activitat (manté plantilla, codis i catàleg).
truncate table wellness, rpe, puntos, desconvocados, asistencia, lesiones, eventos
  restart identity cascade;

-- 2. Entrenador demo (per compartir un login amb tots els entrenadors).
insert into perfiles (nombre, rol)
select 'Entrenador Demo', 'entrenador'
where not exists (select 1 from perfiles where nombre = 'Entrenador Demo');

-- 3. Eventos: 3 setmanes d'entrenaments passats (dt/dc/dv) + 2 partits.
insert into eventos (tipo, fecha, titulo)
select 'entrenamiento', d::date, 'Entrenamiento'
from generate_series(current_date - interval '21 days', current_date, interval '1 day') d
where extract(dow from d) in (2, 3, 5)
on conflict do nothing;

insert into eventos (tipo, fecha, hora, rival, titulo) values
  (current_date - 16, '11:30', 'Sant Just', 'Partido'),
  (current_date - 2,  '12:00', 'Granollers', 'Partido');

-- 4. Wellness per a la majoria de jugadors en cada event passat.
insert into wellness (profile_id, evento_id, sueno, fatiga, dolor_muscular, estres, animo, a_tiempo)
select p.id, e.id,
  (4 + floor(random() * 7))::int,
  (4 + floor(random() * 7))::int,
  (floor(random() * 11))::int,
  (4 + floor(random() * 7))::int,
  (4 + floor(random() * 7))::int,
  random() > 0.2
from perfiles p
cross join eventos e
where p.rol = 'jugador' and e.fecha < current_date and random() > 0.15
on conflict (profile_id, evento_id) do nothing;

-- 5. RPE per a la majoria de jugadors en cada event passat.
insert into rpe (profile_id, evento_id, rpe_muscular, rpe_respiratorio, a_tiempo)
select p.id, e.id,
  (3 + floor(random() * 7))::int,
  (3 + floor(random() * 7))::int,
  random() > 0.2
from perfiles p
cross join eventos e
where p.rol = 'jugador' and e.fecha < current_date and random() > 0.2
on conflict (profile_id, evento_id) do nothing;

-- 6. Garantir alguna alerta recent (RPE alt els últims dies).
update rpe set rpe_muscular = 9, rpe_respiratorio = 9
where id in (
  select r.id from rpe r
  join eventos e on e.id = r.evento_id
  where e.fecha >= current_date - 3
  order by random() limit 2
);

-- 7. Puntos: sancions esparses del catàleg...
insert into puntos (profile_id, puntos, motivo, motivo_id, fecha)
select p.id, m.puntos, m.nombre, m.id, current_date - (floor(random() * 20))::int
from perfiles p
cross join motivos_puntos m
where p.rol = 'jugador' and m.activo and random() < 0.05;

-- ...i punts positius d'exercicis (uns quants per jugador).
insert into puntos (profile_id, puntos, motivo, fecha)
select p.id, (5 + floor(random() * 20))::int, 'Ejercicio puntuable', current_date - (floor(random() * 14))::int
from perfiles p
cross join generate_series(1, 3) g
where p.rol = 'jugador';

-- 8. Una lesió activa (demo).
insert into lesiones (profile_id, fecha_inicio, fecha_fin, descripcion)
select id, current_date - 3, current_date + 10, 'Esguince de tobillo (demo)'
from perfiles where rol = 'jugador' order by random() limit 1;

-- 9. Un parell de no convocats al últim partit (demo).
insert into desconvocados (evento_id, profile_id)
select e.id, p.id
from (select id from eventos where tipo = 'partido' order by fecha desc limit 1) e
cross join (select id from perfiles where rol = 'jugador' order by random() limit 2) p
on conflict do nothing;

-- ============================================================================
--  FI · La app ja hauria de mostrar classificació, gràfiques i alertes.
-- ============================================================================
