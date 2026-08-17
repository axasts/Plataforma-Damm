-- ============================================================================
--  MIGRACIÓN · vincular puntos a la sesión del calendario
-- ----------------------------------------------------------------------------
--  Añade la columna `evento_id` a la tabla `puntos` para que cada punto quede
--  ligado al entrenamiento o partido donde se registró (nueva gestión desde el
--  calendario). No borra datos: los puntos existentes quedan con evento_id NULL.
--
--  Ejecutar UNA vez en Supabase → SQL Editor → RUN.
--  (Si en el futuro reejecutas schema.sql completo, ya no hace falta.)
-- ============================================================================

alter table puntos
  add column if not exists evento_id uuid references eventos(id) on delete set null;

create index if not exists idx_puntos_evento on puntos(evento_id);
