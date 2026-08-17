# Estado del proyecto — Plataforma Cadet A · CF Damm

_Última actualización: 18/08/2026_

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

Web interna del **Cadet A del CF Damm** para el día a día de los entrenadores:
clasificación por puntos, encuestas de **Wellness** y **RPE**, asistencia,
lesiones y panel de estado del equipo.

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

## 3. Credenciales y códigos

- **Supabase URL y publishable key:** en `src/config.ts` (públicas por diseño;
  la seguridad la dan las reglas RLS). Se usa `||` para caer al valor por defecto
  aunque una variable de entorno esté vacía en Vercel.
- **Códigos de acceso:** Jugadores `DAMM2026` · Entrenadores `STAFF2026`.

---

## 4. Puesta en marcha de la base de datos (Supabase)

Ver `docs/BASE_DE_DATOS.md` para el detalle. Resumen:

1. **`supabase/schema.sql`** → crea tablas, RLS, funciones y datos iniciales
   (plantilla + entrenadores + catálogo de sanciones).
2. Si actualizas una BD que ya existía (sin re-ejecutar schema): **`supabase/migracion_puntos_evento.sql`**
   (añade `puntos.evento_id`).
3. **Authentication → Sign In / Providers → Email:** activar Email y **desactivar
   "Confirm email"**. ⚠️ Obligatorio para poder hacer login.
4. (Opcional demo) `supabase/demo_seed.sql` (datos de ejemplo) y
   `supabase/demo_users.sql` (logins jugador/admin ya confirmados).
5. Para **empezar de cero** manteniendo plantilla/posiciones/códigos/catálogo:
   **`supabase/limpiar_datos.sql`**.

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
supabase/schema.sql                 → base de datos + seguridad + datos iniciales
supabase/migracion_puntos_evento.sql→ añade puntos.evento_id (BD ya existente)
supabase/limpiar_datos.sql          → vacía datos de actividad (empezar de cero)
supabase/demo_seed.sql              → datos de ejemplo (demo)
supabase/demo_users.sql             → usuarios demo jugador/admin ya confirmados
src/config.ts                       → credenciales Supabase (públicas)
src/index.css / tailwind.config.js  → sistema de diseño (tokens, fuentes, clases)
src/components/ui.tsx               → UI compartida (Escudo, Modal, PageHeader, Badge, iconos…)
src/components/StatsCharts.tsx      → gráficas por jugador + medias de equipo (filtrables)
src/pages/Login.tsx                 → login / alta con código (alta solo con ?alta)
src/pages/player/                   → home (pendientes), wellness, rpe, mis datos
src/pages/coach/                    → CoachHome (panel), Calendario, Sesion, Catalogo,
                                      Lesiones, ReglasAlerta, Plantilla, CoachLayout
src/pages/shared/                   → Clasificacion, JugadorDetalle
```

Nota: **ya no existen** `Puntos.tsx` ni `Asistencia.tsx` (integrados en `Sesion.tsx`).

---

## 8. ✅ Hecho

- Rediseño completo (dark premium) aplicado a todas las pantallas.
- Gestión de puntos/asistencia/convocatoria desde el calendario (sesiones).
- Panel con medias de equipo, buscador por valor, carga por demarcación filtrable
  y media semanal para lesionados.
- Mis datos del jugador con desglose de puntos. Borrar jugadores. Lesionados
  premarcados. Login con alta oculta (`?alta`).
- Desplegado en Vercel y funcionando.

## 9. ⏳ Pendiente / próximos pasos

1. **Activar Email + desactivar "Confirm email"** en Supabase (si no está).
2. **Empezar limpio** con `limpiar_datos.sql` cuando arranque el uso real.
3. Revisar grafías de nombres y posiciones definitivas en **Plantilla**.
4. (Opcional) Desvincular perfiles usados por la demo (ej: poner `user_id = null`).
5. Afinar detalles a medida que el equipo lo use.
