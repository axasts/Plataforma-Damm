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
muestra:

    https://plataforma-damm.vercel.app/?alta

Flujo del jugador: entrar por ese enlace → **Primer acceso** → código `DAMM2026`
→ elegir su nombre → correo + contraseña → dentro. Después ya entra por la URL
normal con **Entrar**.

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
