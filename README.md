# Plataforma CF Damm

Web interna de los equipos del **CF Damm**: encuestas de **Wellness** y **RPE**,
asistencia, lesiones, panel de entrenador y —en los equipos que lo usan—
clasificación por puntos. Todo se gestiona **desde el calendario** (sesiones de
entrenamiento y partido).

> **Multi-equipo:** una misma BD aloja varios equipos (Cadet A / S16 con puntos,
> Sub 15 sin puntos). Un único web sirve a todos; el equipo se decide al hacer
> login. El flag `usa_puntos` de cada equipo activa o no todo el sistema de puntos.

- **Frontend:** React + Vite + TypeScript + Tailwind (en castellano, tema oscuro).
- **Backend:** Supabase (Auth + Postgres + RLS).
- **Hosting:** Vercel — **producción:** https://plataforma-damm.vercel.app

## Documentación

- [`docs/ESTADO.md`](docs/ESTADO.md) — estado actual y cómo continuar (traspaso).
- [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md) — especificación funcional.
- [`docs/BASE_DE_DATOS.md`](docs/BASE_DE_DATOS.md) — scripts SQL y arranque de la BD.
- [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) — despliegue en Vercel y enlace de alta.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
```

> Si cambias `tailwind.config.js`, reinicia el dev server (el HMR no recarga bien
> los tokens de color/fuente).

## Puesta en marcha (resumen)

Sobre la **BD actual** (que ya tiene el Cadet A), en orden:

1. [`supabase/migracion_multiequipo.sql`](supabase/migracion_multiequipo.sql) — convierte la BD a multi-equipo (aditiva, no borra datos).
2. [`supabase/seed_sub15.sql`](supabase/seed_sub15.sql) — crea el equipo Sub 15 (sin puntos).
3. Supabase → Authentication → Providers → **Email activado** y **"Confirm email"
   desactivado** (obligatorio para los logins).

_(Para una BD nueva de un solo equipo existe [`supabase/schema.sql`](supabase/schema.sql);
no lo ejecutes sobre la BD real, borra las tablas.)_

Códigos: **Cadet A** jugadores `DAMM2026` · staff `STAFF2026` — **Sub 15**
jugadores `DAMMS15` · staff `STAFFS15`.

## Cómo se usa

- **Jugadores:** entran por el enlace de alta `…/?alta` la primera vez (código de
  su equipo → elegir nombre → correo + contraseña). Después ven **Inicio**
  (encuestas pendientes) y **Mis datos** (evolución), y **Ranking** + desglose de
  puntos **solo si su equipo usa puntos**. No ven las posiciones.
- **Entrenadores:** **Panel**, **Calendario** (sesiones: disponibilidad, y en
  equipos con puntos ejercicios/sanciones), **Lesiones**, **Alertas** y
  **Plantilla**; y **Ranking** + **Sanciones** (catálogo) **solo si el equipo usa
  puntos**.

El despliegue es automático al hacer push a `claude/project-planning-nnsso1`.
