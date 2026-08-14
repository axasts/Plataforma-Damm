// Configuració de connexió a Supabase.
//
// La "publishable key" és PÚBLICA per disseny (va al navegador). La seguretat
// real la garanteixen les regles RLS de la base de dades, no aquesta clau.
// Es poden sobreescriure amb variables d'entorn de Vite si mai es vol.

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://wjmueahoakqooyxkhfnl.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ??
  'sb_publishable_8C1s4MRZrHAI06AO9WdASg_UcloREQM'

// Textos i constants de l'equip.
export const NOMBRE_EQUIPO = 'Cadet A · CF Damm'
