# Base de datos — Supabase

Guía de los scripts SQL y del arranque de la BD. Todos se ejecutan en
**Supabase → SQL Editor → New query → pegar → RUN**.

---

## Scripts (carpeta `supabase/`)

| Script | Para qué | Cuándo |
|--------|----------|--------|
| `schema.sql` | Crea **todo** (versión de **1 equipo**): tablas, RLS, funciones y datos iniciales. **Reejecutarlo borra y recrea las tablas.** ⚠️ En la BD real ya está superado por la migración multi-equipo; no lo ejecutes ahí. | Solo en una BD nueva de un único equipo. |
| `migracion_multiequipo.sql` | Convierte la BD a **multi-equipo**: añade `equipo.usa_puntos` y `equipo_id` a las tablas raíz, reescribe funciones y RLS para filtrar por equipo (`my_team()`). **Aditiva: no borra datos.** El equipo existente queda con `usa_puntos = true`. | Una vez, sobre la BD actual (que tiene el Cadet A). |
| `seed_sub15.sql` | Crea el equipo **Sub 15** (`usa_puntos = false`): entrenadores, jugadores, códigos y reglas de alerta. **No** crea catálogo de sanciones (no usa puntos). | Una vez, después de la migración multi-equipo. |
| `migracion_dias_entreno.sql` | **Horario de entrenos por equipo:** añade `equipo.horario_entreno` (jsonb: día→hora) y hace que "Generar entrenos" use los días/horas de cada equipo. Cadet A queda igual (dt/dc/dv). Sub 15 → dt/dj/dv. Aditiva. | Una vez. Ejecutar **antes** de generar los entrenos del Sub 15. |
| `fix_codigos_sub15.sql` | Corrige los códigos de acceso del Sub 15 a `DAMMS15`/`STAFFS15`. Re-ejecutable. | Solo si el Sub 15 quedó con códigos equivocados. |
| `migracion_puntos_evento.sql` | Añade la columna `puntos.evento_id` (liga cada punto a su sesión). No borra datos. | Solo si tienes una BD antigua creada **antes** de este cambio y no quieres re-ejecutar `schema.sql`. |
| `migracion_plazos_encuestas.sql` | Redefine `get_pendientes` y `get_resumen_pendientes`: una encuesta deja de estar pendiente cuando ya no se puede responder (cerrada). No borra datos. | Si tienes una BD anterior a los plazos de cierre y no re-ejecutas `schema.sql`. |
| `migracion_penalizaciones.sql` | Penalizaciones automáticas por encuestas: −1 al responder tarde, −2 si no se responde. Añade `puntos.codigo`, un trigger y `aplicar_penalizaciones()`. No borra datos. | Si tienes una BD anterior a las penalizaciones y no re-ejecutas `schema.sql`. |
| `limpiar_datos.sql` | Vacía **datos de actividad** (eventos, wellness, rpe, puntos, asistencia, desconvocados, lesiones). **Mantiene** plantilla, posiciones, códigos, catálogo y reglas. | Para **empezar de cero** con el equipo real. Repetible. |
| `demo_seed.sql` | Rellena datos de ejemplo (entrenos, partidos, wellness, rpe, puntos, una lesión…). | Solo para enseñar la app. |
| `demo_users.sql` | Crea 2 logins ya confirmados: `jugador.demo@damm.local` y `admin.demo@damm.local` (contraseña `DemoDamm2026`). | Solo para probar sin registrarse. Requiere Email activado. |

---

## Arranque en una BD nueva

1. Ejecutar **`schema.sql`**.
2. **Authentication → Sign In / Providers → Email:** activar **Email** y
   **desactivar "Confirm email"**. ⚠️ Sin esto no funciona ningún login.
3. (Opcional) `demo_seed.sql` y/o `demo_users.sql` para probar.

## Empezar el uso real (con datos limpios)

1. Ejecutar **`limpiar_datos.sql`** (mantiene plantilla, posiciones, códigos y
   catálogo de sanciones).
2. Revisar nombres/posiciones en **Plantilla**.
3. Repartir a los jugadores el enlace de alta: `…/?alta`.

---

## Códigos de acceso (uno por equipo, únicos)

En multi-equipo el código identifica **equipo y rol**, así que **no puede repetirse
entre equipos** (si no, no se sabe a qué equipo se da de alta un jugador).

- **Cadet A / S16:** Jugadores `DAMM2026` · Entrenadores `STAFF2026`
- **Sub 15:** Jugadores `DAMMS15` · Entrenadores `STAFFS15`

Viven en la tabla `equipo` (columnas `team_code` / `staff_code`) y se cambian ahí.

---

## Seguridad (RLS) — recordatorio

La seguridad real la dan las reglas **Row Level Security** de Supabase, no el
navegador (el frontend es público). Resumen:

- **Aislamiento por equipo:** cada entrenador/jugador solo ve datos de **su equipo**
  (`my_team()`); las funciones y políticas filtran por `equipo_id`.
- Un **jugador** solo lee/escribe sus propias encuestas; solo los **entrenadores**
  crean/editan eventos, puntos, catálogo, asistencia, lesiones y reglas (de su equipo).
- **Las posiciones** solo son relevantes para entrenadores; la app no las muestra
  a los jugadores.
- La `publishable key` de `src/config.ts` es **pública por diseño**.

---

## Tablas principales

`equipo` (nombre, `team_code`/`staff_code`, **`usa_puntos`**, **`horario_entreno`**
jsonb día→hora), `perfiles`
(**`equipo_id`**, nombre, rol, posición, user_id, email), `eventos`
(**`equipo_id`**, entrenamientos auto ma/mi/vi y partidos), `desconvocados`,
`motivos_puntos` (**`equipo_id`**, catálogo), `puntos` (con `evento_id`, `motivo`,
`motivo_id`), `wellness`, `rpe`, `asistencia`, `lesiones`, `reglas_alerta`
(**`equipo_id`**).

Funciones clave multi-equipo: `my_team()`, `same_team(uuid)`, `get_mi_equipo()`
y el trigger `set_equipo_id()` (rellena `equipo_id` al insertar eventos/motivos/reglas).
