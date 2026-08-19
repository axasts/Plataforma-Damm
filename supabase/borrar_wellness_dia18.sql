-- ============================================================================
--  BORRAR WELLNESS del 18/08/2026
-- ----------------------------------------------------------------------------
--  Motivo: los jugadores todavia no tenian la aplicacion ese dia, por lo que
--  no podian rellenar el wellness. Se elimina cualquier respuesta de wellness
--  asociada a eventos con fecha 2026-08-18.
--
--  NO toca: eventos, rpe, puntos, asistencia, perfiles ni configuracion.
--
--  Ejecutar en Supabase -> SQL Editor -> RUN.
-- ============================================================================

-- 1) (Opcional) Comprobar que se va a borrar antes de ejecutar el DELETE:
-- select w.*
--   from wellness w
--   join eventos e on e.id = w.evento_id
--  where e.fecha = date '2026-08-18';

-- 2) Borrado:
delete from wellness w
 using eventos e
 where e.id = w.evento_id
   and e.fecha = date '2026-08-18';
