# Plataforma Cadet A · CF Damm

Web interna del equipo **Cadet A del CF Damm**: clasificación por puntos,
encuestas de **Wellness** y **RPE**, asistencia, lesiones y panel de entrenador.
Todo se gestiona **desde el calendario** (sesiones de entrenamiento y partido).

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

1. Ejecutar [`supabase/schema.sql`](supabase/schema.sql) en Supabase (crea todo).
2. Supabase → Authentication → Providers → **Email activado** y **"Confirm email"
   desactivado** (obligatorio para los logins).
3. Para empezar el uso real con datos limpios: [`supabase/limpiar_datos.sql`](supabase/limpiar_datos.sql).

Códigos: jugadores `DAMM2026` · entrenadores `STAFF2026`.

## Cómo se usa

- **Jugadores:** entran por el enlace de alta `…/?alta` la primera vez (código
  `DAMM2026` → elegir nombre → correo + contraseña). Después ven **Inicio**
  (encuestas pendientes), **Ranking** y **Mis datos** (evolución + desglose de
  sus puntos). No ven las posiciones.
- **Entrenadores:** **Panel** (medias de equipo, buscador por valor, alertas,
  carga por demarcación, media semanal de lesionados), **Calendario** (crea
  sesiones y gestiona disponibilidad, ejercicios y sanciones desde cada día),
  **Ranking**, **Lesiones**, **Sanciones** (catálogo), **Alertas** y **Plantilla**.

El despliegue es automático al hacer push a `claude/project-planning-nnsso1`.
