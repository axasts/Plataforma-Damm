# Plataforma Cadet A · CF Damm

Web interna del equipo **Cadet A del CF Damm**: clasificación por puntos,
encuestas de **Wellness** y **RPE**, asistencia, lesiones y panel de entrenador.

- **Frontend:** React + Vite + TypeScript + Tailwind (en castellano).
- **Backend:** Supabase (Auth + Postgres + RLS).
- **Hosting:** GitHub Pages (gratis).

La especificación funcional completa está en [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md).

---

## 1. Configurar Supabase (una vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región Europa).
2. **SQL Editor → New query** → pega **todo** el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   Esto crea las tablas, la seguridad (RLS), las funciones y los datos
   iniciales (plantilla, entrenadores y catálogo de sanciones).
3. **Authentication → Sign In / Providers → Email:** actívalo y **desactiva
   "Confirm email"** (para que el alta sea directa con correo + contraseña).

### Credenciales

Las claves públicas ya están en [`src/config.ts`](src/config.ts) (la
`publishable key` es pública por diseño; la seguridad la dan las reglas RLS).
Si cambias de proyecto, edita ese fichero o define las variables de entorno
`VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`.

### Códigos de acceso

- **Equipo (jugadores):** `DAMM2026`
- **Entrenadores:** `STAFF2026`

Se pueden cambiar en la tabla `equipo` (o desde Supabase). Los entrenadores
también los ven en la pantalla **Plantilla**.

---

## 2. Desarrollo local

```bash
npm install
npm run dev
```

## 3. Desplegar en GitHub Pages

1. En el repositorio: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
2. Haz merge/push a la rama `main`. El workflow
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y
   publica automáticamente.
3. La web quedará en `https://axasts.github.io/Plataforma-Damm/`.

---

## Cómo se usa

- **Primer acceso** (jugador o entrenador): pantalla de login → *Primer
  acceso* → introduce el código → elige tu nombre → crea correo + contraseña.
- **Jugadores:** ven la clasificación pública, rellenan sus encuestas
  (campana de pendientes) y consultan solo sus estadísticas.
- **Entrenadores** (Ruben, Xavi, Alex): panel con alertas de picos, pendientes
  del equipo y carga por posición, además de puntos, calendario, asistencia,
  lesiones, catálogo de sanciones, alertas y plantilla.
