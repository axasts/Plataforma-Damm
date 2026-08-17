# Estado del proyecto — Plataforma Cadet A · CF Damm

_Última actualización: 15/08/2026_

Documento de **traspaso**. Si abres un chat nuevo (p.ej. en la app de escritorio
de Claude Code), léelo entero junto con `docs/ESPECIFICACION.md` para ponerte al
día del proyecto.

---

## 0. Cómo CONTINUAR en un chat nuevo (leer primero)

- **Repo:** https://github.com/axasts/Plataforma-Damm
- **Rama con todo el código:** `claude/project-planning-nnsso1` (es la rama por
  defecto; al clonar/descargar ya viene esta).
- Abre la carpeta del proyecto con la **app de escritorio de Claude Code** y dile:
  _"Lee `docs/ESTADO.md` y `docs/ESPECIFICACION.md` para ponerte al día y
  seguimos."_

## 1. Cómo DESCARGAR todo desde GitHub

**Opción A — ZIP (sin terminal):**
1. Ve a https://github.com/axasts/Plataforma-Damm
2. Botón verde **Code → Download ZIP**.
3. Descomprime dentro de `Escritorio/hacker`.
→ Tendrás `Escritorio/hacker/Plataforma-Damm` con todo.

**Opción B — git clone (terminal, permite recibir cambios con `git pull`):**
```bash
cd ~/Desktop/hacker
git clone https://github.com/axasts/Plataforma-Damm.git
```

## 2. Qué es y stack

Web interna del **Cadet A del CF Damm**: clasificación por puntos, encuestas de
**Wellness** y **RPE**, asistencia, lesiones y panel de entrenador.

- **Frontend:** React + Vite + TypeScript + Tailwind (castellano, estética
  rojo/oro del club).
- **Backend:** Supabase (Auth + Postgres + RLS).
- La especificación funcional completa está en `docs/ESPECIFICACION.md`.

## 3. Credenciales y códigos

- **Supabase URL y publishable key:** ya están en `src/config.ts` (la
  publishable key es pública por diseño; la seguridad la dan las reglas RLS).
- **Códigos de acceso:**
  - Jugadores: `DAMM2026`
  - Entrenadores: `STAFF2026`

## 4. Arrancar en local

```bash
cd Plataforma-Damm
npm install
npm run dev
```
Abrir **http://localhost:5173**

## 5. Puesta a punto de la base de datos (Supabase → SQL Editor)

1. Ejecutar **`supabase/schema.sql`** → crea tablas, seguridad (RLS), funciones y
   datos iniciales (plantilla + entrenadores + catálogo de sanciones).
2. Ejecutar **`supabase/demo_seed.sql`** → rellena con datos de ejemplo (puntos,
   wellness, RPE, alertas, una lesión y un "Entrenador Demo") para poder enseñar
   la app. Se puede re-ejecutar; para dejar limpio, volver a correr `schema.sql`.
3. **Authentication → Sign In / Providers → Email:** activar Email y **desactivar
   "Confirm email"**. ⚠️ **Obligatorio**, sin esto no se puede hacer login.

Para entrar: pantalla de login → **Primer acceso** → código `STAFF2026` → elegir
**Entrenador Demo** → correo + contraseña → ves el panel completo.

## 6. ✅ Hecho

- Especificación funcional acordada.
- App completa y compilando (jugador + entrenador).
- Esquema Supabase (`schema.sql`) ejecutado con éxito en el proyecto.
- Script de datos demo (`demo_seed.sql`).
- Plantilla: 24 jugadores (con Antoni Capdevila; sin Sergi Cacho). Nombres y
  posiciones editables por los entrenadores desde la pantalla **Plantilla**.
- Corrección de portero (Antoni Capdevila) y baja de Sergi Cacho aplicadas al
  código y a `schema.sql`.

## 7. ⏳ Pendiente

1. **Activar Email + desactivar "Confirm email"** en Supabase (bloquea el login).
2. Ejecutar `schema.sql` (roster correcto) + `demo_seed.sql` (datos) en Supabase.
3. **Revisión pantalla por pantalla** y ajustes (textos, grafías de nombres,
   colores exactos del club si hace falta).
4. (Opcional) Publicar online con Vercel/GitHub Pages para que otros entrenadores
   entren desde el móvil. De momento se enseña en local.

## 8. Estructura del código (recordatorio)

```
supabase/schema.sql        → base de datos + seguridad + datos iniciales
supabase/demo_seed.sql     → datos de ejemplo para la demo
src/config.ts              → credenciales Supabase (públicas)
src/lib/                   → supabase client, auth, tipos, utilidades
src/components/            → UI reutilizable + gráficas (StatsCharts)
src/pages/Login.tsx        → login / alta con código
src/pages/player/          → pantallas de jugador (home, wellness, rpe, stats)
src/pages/coach/           → pantallas de entrenador (panel, puntos, catálogo,
                             calendario, asistencia, lesiones, alertas, plantilla)
src/pages/shared/          → clasificación y ficha de jugador
.github/workflows/deploy.yml → deploy a GitHub Pages (solo manual ahora)
```

## 9. Workflow de trabajo

- El código vive en GitHub, rama `claude/project-planning-nnsso1`.
- Cuando se hacen cambios y se aprueban, se hace push; en local se recogen con
  `git pull`.
