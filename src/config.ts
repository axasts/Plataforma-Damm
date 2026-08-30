// Configuració de connexió a Supabase.
//
// La "publishable key" és PÚBLICA per disseny (va al navegador). La seguretat
// real la garanteixen les regles RLS de la base de dades, no aquesta clau.
// Es poden sobreescriure amb variables d'entorn de Vite si mai es vol.

// Usamos || (no ??) para que una variable de entorno vacía en Vercel caiga
// igualmente al valor por defecto y no deje la URL/clave en blanco.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://wjmueahoakqooyxkhfnl.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ||
  'sb_publishable_8C1s4MRZrHAI06AO9WdASg_UcloREQM'

// ---------------------------------------------------------------------------
//  MULTI-EQUIP
//  Una mateixa base de dades allotja diversos equips (Cadet A / S16, Sub 15…).
//  Cada equip és una fila de la taula `equipo` amb el seu nom, els seus codis
//  d'accés i un flag `usa_puntos` (true = ranking/sancions/penalitzacions;
//  false = sense sistema de punts). L'equip d'un usuari es determina en fer
//  login (pel seu perfil), així que un mateix web serveix tots els equips.
//
//  Per això aquí NO hi ha cap equip fix: el nom i el flag de punts es llegeixen
//  de la BD via l'AuthProvider (veure lib/auth.tsx → useAuth().equipo).
// ---------------------------------------------------------------------------

// Nom del club, per a la pantalla de login (abans de saber de quin equip és
// l'usuari) i com a text de reserva.
export const NOMBRE_CLUB = 'CF Damm'
