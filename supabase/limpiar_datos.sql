-- ============================================================================
--  LIMPIAR DATOS · empezar de cero (sin tocar plantilla ni configuración)
-- ----------------------------------------------------------------------------
--  Borra TODOS los datos de actividad para arrancar en limpio:
--    · eventos (entrenamientos y partidos)
--    · wellness, rpe
--    · puntos (ejercicios y sanciones aplicadas)
--    · asistencia, desconvocados
--    · lesiones
--
--  MANTIENE (no se toca):
--    · perfiles  → nombres y posiciones de jugadores/entrenadores
--    · equipo    → códigos de acceso
--    · motivos_puntos → catálogo de sanciones
--    · reglas_alerta  → umbrales de aviso configurados
--
--  Ejecutar en Supabase → SQL Editor → RUN.  Es repetible.
-- ============================================================================

truncate table wellness, rpe, puntos, desconvocados, asistencia, lesiones, eventos
  restart identity cascade;
