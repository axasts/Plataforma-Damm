# Base de datos — Supabase

Guía de los scripts SQL y del arranque de la BD. Todos se ejecutan en
**Supabase → SQL Editor → New query → pegar → RUN**.

---

## Scripts (carpeta `supabase/`)

| Script | Para qué | Cuándo |
|--------|----------|--------|
| `schema.sql` | Crea **todo**: tablas, RLS, funciones y datos iniciales (plantilla + entrenadores + catálogo de sanciones + reglas de alerta). **Reejecutarlo borra y recrea las tablas.** | En una BD nueva, o para resetear a fábrica. |
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

## Códigos de acceso

- **Jugadores:** `DAMM2026`
- **Entrenadores:** `STAFF2026`

Viven en la tabla `equipo` (columnas `team_code` / `staff_code`) y se pueden
cambiar ahí.

---

## Seguridad (RLS) — recordatorio

La seguridad real la dan las reglas **Row Level Security** de Supabase, no el
navegador (el frontend es público). Resumen:

- La **clasificación** es de lectura para cualquier usuario autenticado.
- Un **jugador** solo lee/escribe sus propias encuestas; solo los **entrenadores**
  crean/editan eventos, puntos, catálogo, asistencia, lesiones y reglas.
- **Las posiciones** solo son relevantes para entrenadores; la app no las muestra
  a los jugadores.
- La `publishable key` de `src/config.ts` es **pública por diseño**.

---

## Tablas principales

`equipo`, `perfiles` (nombre, rol, posición, user_id, email), `eventos`
(entrenamientos auto ma/mi/vi y partidos), `desconvocados`, `motivos_puntos`
(catálogo), `puntos` (con `evento_id`, `motivo`, `motivo_id`), `wellness`,
`rpe`, `asistencia`, `lesiones`, `reglas_alerta`.
