# Estado del proyecto

_Última actualización: 14/08/2026_

Resumen rápido de dónde estamos y qué queda, para retomar la revisión.

---

## ✅ Hecho

- Especificación funcional acordada (`docs/ESPECIFICACION.md`).
- Frontend completo (React + Vite + TypeScript + Tailwind, castellano, estética
  rojo/oro del CF Damm). Compila correctamente.
- Esquema de Supabase (`supabase/schema.sql`) **ejecutado con éxito**: tablas,
  seguridad RLS, funciones y datos iniciales (plantilla + entrenadores +
  catálogo de sanciones).
- Todo subido a la rama `claude/project-planning-nnsso1`.

## ⏳ Pendiente (para mañana)

1. **Supabase → Authentication → Providers → Email:** activar Email y
   **desactivar "Confirm email"**. Sin esto, el primer acceso falla.
2. **Probar el alta y login** con los códigos:
   - Jugadores: `DAMM2026`
   - Entrenadores: `STAFF2026`
3. Decidir cómo verla:
   - Local: `npm install && npm run dev`
   - Publicada: Settings → Pages → Source *GitHub Actions* + merge a `main`
     (queda en `https://axasts.github.io/Plataforma-Damm/`).
4. **Revisión pantalla por pantalla** y ajustes:
   - Confirmar grafías de nombres (Anyhony, Roberston Allister, Marrahi…).
   - Ajustar colores exactos del club si hace falta.
   - Repasar textos y flujos.

## 💡 Ideas / mejoras posibles (no urgentes)

- Notificaciones por email de encuestas pendientes (de momento solo campana
  in-app; el correo queda guardado para poder añadirlo sin rehacer nada).
- Botón "aplicar media semanal al lesionado" (regla especial del reglamento).
- Generación automática de entrenamientos en segundo plano (ahora se genera
  con un botón en Calendario).

---

## Cómo está montado (recordatorio técnico)

- **Frontend:** `src/` — páginas de jugador (`src/pages/player`), entrenador
  (`src/pages/coach`) y compartidas (`src/pages/shared`).
- **Backend:** Supabase. Credenciales públicas en `src/config.ts`.
- **Seguridad:** reglas RLS en `supabase/schema.sql` (el frontend es público;
  la seguridad la impone la base de datos).
- **Deploy:** `.github/workflows/deploy.yml` → GitHub Pages al hacer push a `main`.
