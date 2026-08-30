# Estado del proyecto — Plataforma CF Damm (multi-equipo)

_Última actualización: 30/08/2026_

Documento de **traspaso**. Si abres un chat nuevo (p. ej. en la app de escritorio
de Claude Code), léelo entero junto con `docs/ESPECIFICACION.md`, `docs/BASE_DE_DATOS.md`
y `docs/DESPLIEGUE.md` para ponerte al día.

---

## 0. Cómo CONTINUAR en un chat nuevo (leer primero)

- **Repo:** https://github.com/axasts/Plataforma-Damm
- **Rama por defecto (y de despliegue):** `claude/project-planning-nnsso1`
- **Web en producción:** https://plataforma-damm.vercel.app
- Abre la carpeta del proyecto con la app de escritorio de Claude Code y di:
  _"Lee `docs/ESTADO.md`, `docs/ESPECIFICACION.md`, `docs/BASE_DE_DATOS.md` y
  `docs/DESPLIEGUE.md` para ponerte al día y seguimos."_

---

## 1. Qué es y stack

Web interna del **CF Damm** para el día a día de los entrenadores: encuestas de
**Wellness** y **RPE**, asistencia, lesiones, panel de estado del equipo y —en los
equipos que lo usan— **clasificación por puntos**.

> **Multi-equipo (desde 08/2026):** una misma base de datos aloja **varios equipos**
> (Cadet A / S16, Sub 15…). Cada equipo decide con el flag `usa_puntos` si tiene o no
> sistema de puntos. Un **único web** sirve a todos: el equipo del usuario se
> determina al hacer login (por su perfil). Ver §2-bis.

- **Frontend:** React + Vite + TypeScript + Tailwind (interfaz en castellano).
- **Backend:** Supabase (Auth + Postgres + RLS). Toda la lógica de datos vive ahí.
- **Gráficas:** Recharts.
- **Diseño:** tema **oscuro premium**. Tipografía **Archivo** (titulares) +
  **Hanken Grotesk** (texto), ambas incrustadas en `src/assets/fonts/`. Escudo
  oficial en `src/assets/escudo-damm.png` (login y favicon). Un solo rojo Damm
  como acento; oro solo como filete. Sin cajas amontonadas: rejillas con filetes.

---

## 2. Modelo de uso (importante — cambió respecto al inicio)

**El calendario es el centro de la gestión.** Ya no hay páginas sueltas de
"Registrar puntos" ni de "Asistencia": todo se hace **entrando en la sesión** de
un día desde el calendario.

- **Menú de entrenador:** Panel · Calendario · Ranking · Lesiones · Sanciones
  (catálogo) · Alertas · Plantilla.
- **Calendario** = rejilla mensual navegable. Clic en un día:
  - si hay 1 evento → abre su **sesión** (`/sesion/:id`);
  - si no hay ninguno → botones para **añadir entrenamiento o partido** ese día.
- **Sesión** (`src/pages/coach/Sesion.tsx`): según sea entrenamiento o partido:
  - **Entrenamiento:** Disponibilidad (OK / lesión / no vino) · **+ Ejercicio**
    (puntos positivos a varios jugadores) · **+ Sanción** (del catálogo, negativos).
  - **Partido:** Convocatoria (convocado / no convocado) · **+ Sanción** (+ ejercicio).
  - Todo queda ligado al evento (`puntos.evento_id`).
- **Lesionados:** aparecen **premarcados** como lesionados en las sesiones y NO
  hay que remarcarlos.
- **Panel** (`CoachHome.tsx`): primero medias de **Wellness/RPE** del equipo
  (gráficas filtrables) y **buscador por valor** (ej: fatiga ≥ 8 → qué jugadores);
  luego **alertas**, **carga por demarcación** (con filtro de métrica) y
  **encuestas pendientes**; y **media semanal para lesionados** (solo puntos de
  ejercicios; las sanciones NO cuentan en el cálculo).
- **Jugador:** solo ve **Inicio** (encuestas pendientes), **Ranking** y
  **Mis datos** (evolución de wellness/RPE **+ desglose de sus puntos** con el
  motivo). Las **posiciones NO las ven los jugadores** (solo entrenadores).
- **Login:** el "Primer acceso" está oculto; solo aparece con el enlace
  `…/?alta` (el que se reparte a los jugadores). Con la URL normal solo se ve
  "Entrar".

---

## 2-bis. Multi-equipo (S16 + S15) — cómo funciona

- **Modelo:** una sola BD Supabase (la misma cuenta/proyecto de siempre) con **una
  fila por equipo** en la tabla `equipo`. Cada fila tiene sus dos códigos de acceso
  y un flag **`usa_puntos`** (true = ranking/sanciones/penalizaciones; false = sin
  puntos). Cadet A → `usa_puntos = true`; Sub 15 → `usa_puntos = false`.
- **Aislamiento:** cada tabla raíz (`perfiles`, `eventos`, `motivos_puntos`,
  `reglas_alerta`) tiene `equipo_id`; las RLS y las funciones filtran por el equipo
  del usuario (`my_team()`), así que **un entrenador solo ve su equipo**.
- **Frontend:** `lib/auth.tsx` carga el equipo del usuario (vía `get_mi_equipo()`)
  y expone `equipo` y **`usaPuntos`**. Cuando `usaPuntos = false` se ocultan Ranking,
  Sanciones, la sección de puntos de la Sesión, "Media semanal", los bloques de
  puntos de _Mis datos_ y _JugadorDetalle_, y las rutas `/clasificacion` y `/catalogo`.
- **Un solo web/Vercel:** no hace falta un despliegue por equipo. El login decide.
- **Alta:** el código identifica equipo **y** rol, así que la lista de "Primer
  acceso" ya sale filtrada al equipo correcto.

---

## 3. Credenciales y códigos

- **Supabase URL y publishable key:** en `src/config.ts` (públicas por diseño;
  la seguridad la dan las reglas RLS). Se usa `||` para caer al valor por defecto
  aunque una variable de entorno esté vacía en Vercel.
- **Códigos de acceso (uno por equipo, deben ser únicos):**
  - **Cadet A / S16:** Jugadores `DAMM2026` · Entrenadores `STAFF2026`.
  - **Sub 15:** Jugadores `DAMMS15` · Entrenadores `STAFFS15`.
- Viven en la tabla `equipo` (`team_code` / `staff_code`) y se cambian ahí.

---

## 4. Puesta en marcha de la base de datos (Supabase)

Ver `docs/BASE_DE_DATOS.md` para el detalle. Resumen:

1. **`supabase/schema.sql`** → crea tablas, RLS, funciones y datos iniciales
   (plantilla + entrenadores + catálogo de sanciones). _Nota: este script es la
   versión de **un solo equipo**; en la BD real ya está superado por la migración
   multi-equipo._
2. **Migración a multi-equipo (BD existente, aditiva, no borra datos):**
   **`supabase/migracion_multiequipo.sql`**. Añade `equipo_id` y `usa_puntos`,
   reescribe funciones y RLS para filtrar por equipo. El Cadet A queda igual (con
   puntos). Ejecutar **una vez**.
3. **Crear el equipo Sub 15:** **`supabase/seed_sub15.sql`** (entrenadores,
   jugadores, códigos, reglas de alerta; `usa_puntos = false`). Ejecutar **una vez**.
4. **Authentication → Sign In / Providers → Email:** activar Email y **desactivar
   "Confirm email"**. ⚠️ Obligatorio para poder hacer login.
5. (Opcional demo) `supabase/demo_seed.sql` y `supabase/demo_users.sql`.
6. Para **empezar de cero** manteniendo plantilla/posiciones/códigos/catálogo:
   **`supabase/limpiar_datos.sql`**.

> ⚠️ Antes de correr la migración en la BD real (que tiene los usuarios del S16),
> haz un backup/export del proyecto Supabase. La migración va en `begin/commit`.

---

## 5. Arrancar en local

```bash
cd Plataforma-Damm
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build (lo mismo que ejecuta Vercel)
```

⚠️ Si cambias `tailwind.config.js` (colores/fuentes), **reinicia** el dev server:
el HMR no recarga bien los tokens nuevos (da un 500 tipo `border-… no existe`).

---

## 6. Despliegue

Ver `docs/DESPLIEGUE.md`. Resumen: Vercel despliega automáticamente al hacer
**push a `claude/project-planning-nnsso1`**. Producción: https://plataforma-damm.vercel.app.
Enlace de alta para jugadores: https://plataforma-damm.vercel.app/?alta

---

## 7. Estructura del código

```
supabase/schema.sql                 → BD versión 1 equipo (referencia; superado por la migración)
supabase/migracion_multiequipo.sql  → convierte la BD a multi-equipo (aditiva, no borra)
supabase/seed_sub15.sql             → crea el equipo Sub 15 (sin puntos)
supabase/migracion_puntos_evento.sql→ añade puntos.evento_id (BD antigua)
supabase/limpiar_datos.sql          → vacía datos de actividad (empezar de cero)
supabase/demo_seed.sql              → datos de ejemplo (demo)
supabase/demo_users.sql             → usuarios demo jugador/admin ya confirmados
src/config.ts                       → credenciales Supabase + NOMBRE_CLUB (ya NO fija el equipo)
src/lib/auth.tsx                    → AuthProvider: carga perfil + equipo; expone equipo y usaPuntos
src/lib/types.ts                    → tipos (Perfil.equipo_id, Equipo)
src/index.css / tailwind.config.js  → sistema de diseño (tokens, fuentes, clases)
src/components/ui.tsx               → UI compartida (Escudo, Modal, PageHeader, Badge, iconos…)
src/components/StatsCharts.tsx      → gráficas por jugador + medias de equipo (filtrables)
src/pages/Login.tsx                 → login / alta con código (alta solo con ?alta; sin equipo fijo)
src/pages/player/                   → home (pendientes), wellness, rpe, mis datos
src/pages/coach/                    → CoachHome (panel), Calendario, Sesion, Catalogo,
                                      Lesiones, ReglasAlerta, Plantilla, CoachLayout
src/pages/shared/                   → Clasificacion, JugadorDetalle
```

Nota: **ya no existen** `Puntos.tsx` ni `Asistencia.tsx` (integrados en `Sesion.tsx`).
La puntuación se oculta en todo el frontend según `useAuth().usaPuntos` (el flag del equipo).

---

## 8. ✅ Hecho

- Rediseño completo (dark premium) aplicado a todas las pantallas.
- Gestión de puntos/asistencia/convocatoria desde el calendario (sesiones).
- Panel con medias de equipo, buscador por valor, carga por demarcación filtrable
  y media semanal para lesionados.
- Mis datos del jugador con desglose de puntos. Borrar jugadores. Lesionados
  premarcados. Login con alta oculta (`?alta`).
- Desplegado en Vercel y funcionando.
- **Multi-equipo:** frontend adaptado (equipo + `usaPuntos` desde la BD; puntos
  ocultables). Scripts `migracion_multiequipo.sql` y `seed_sub15.sql` preparados.

## 9. ⏳ Pendiente / próximos pasos

1. **Ejecutar la migración multi-equipo** (`migracion_multiequipo.sql`) en la BD
   real, con backup previo, y luego **`seed_sub15.sql`** para crear el Sub 15.
2. Desplegar el código nuevo (mismo Vercel) y probar el alta de un jugador del
   Sub 15 con `DAMMS15` (debe ver la app **sin puntos**).
3. **Activar Email + desactivar "Confirm email"** en Supabase (si no está).
4. Poner las **posiciones** del Sub 15 desde **Plantilla** (el seed las deja vacías).
5. (Opcional) Actualizar `schema.sql` para que la instalación desde cero ya sea
   multi-equipo (hoy sigue siendo de un solo equipo).
