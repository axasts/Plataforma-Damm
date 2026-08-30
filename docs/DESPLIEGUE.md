# Despliegue — Vercel

## Resumen

- **Producción:** https://plataforma-damm.vercel.app
- **Rama que despliega:** `claude/project-planning-nnsso1` (la rama por defecto).
- **Automático:** cada **push** a esa rama dispara un nuevo build y despliegue en
  Vercel. No hay que hacer nada más.
- **Build de Vercel:** `npm run build` → `tsc -b && vite build`.

## Cómo publicar cambios

```bash
git add -A
git commit -m "..."
git push origin claude/project-planning-nnsso1
```

En 1–2 minutos Vercel actualiza producción. Si acabas de desplegar y ves la web
en blanco o vieja, haz **Ctrl+F5** (recargar sin caché).

Antes de subir, conviene validar el build en local (es lo que hará Vercel):

```bash
npm run build
```

## Enlace de alta para jugadores

El "Primer acceso" está oculto en el login normal. Se reparte este enlace, que lo
muestra (**el mismo para todos los equipos**):

    https://plataforma-damm.vercel.app/?alta

Flujo: entrar por ese enlace → **Primer acceso** → **código de su equipo** → elegir
su nombre (la lista ya sale filtrada al equipo del código) → correo + contraseña →
dentro. Después ya entra por la URL normal con **Entrar**.

Códigos por equipo:

| Equipo | Jugadores | Staff |
|--------|-----------|-------|
| Cadet A / S16 | `DAMM2026` | `STAFF2026` |
| Sub 15 | `DAMMS15` | `STAFFS15` |

> Un **único web/Vercel** sirve a los dos equipos: el equipo del usuario se
> determina al hacer login. El Sub 15 verá la app **sin puntos ni sanciones**.

## Usuario demo (vista de jugador)

Acceso de prueba para ver la app **como un jugador** sin ensuciar nada:

    correo:       vista.demo@damm.local
    contraseña:   DemoDamm2026

- Se entra por el **login normal** ("Entrar"), no por el enlace de alta.
- Es un perfil marcado como `demo` en la tabla `perfiles`, así que **es
  invisible para los entrenadores**: no aparece en plantilla, pendientes,
  clasificación ni estadísticas.
- Puede abrir los formularios de wellness/RPE para verlos, pero **no guarda
  nada** (solo previsualización).
- Se crea/recrea ejecutando el bloque SQL del usuario demo en Supabase → SQL
  Editor (es repetible).

## Requisitos para que funcionen los logins

- **Email activado** en Supabase (Authentication → Providers → Email) y
  **"Confirm email" desactivado**. Es la misma BD que en local.

## Notas / problemas conocidos

- **Pantalla en blanco con `supabaseUrl is required`:** pasa si la URL/clave de
  Supabase quedan vacías. `src/config.ts` usa `||` (no `??`) para caer al valor
  por defecto aunque una variable de entorno en Vercel esté vacía. Si vuelve a
  pasar, revisa las Environment Variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`
  del proyecto en Vercel.
- **Deployment Protection:** si la web pide "Log in to Vercel", desactívalo en
  Vercel → Settings → Deployment Protection (debe estar en público para que los
  jugadores entren desde el móvil).
- La URL con hash (`plataforma-damm-xxxx-...vercel.app`) es una *preview*
  protegida; usa siempre la de producción `plataforma-damm.vercel.app`.
