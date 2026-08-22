export type Rol = 'jugador' | 'entrenador'

export interface Perfil {
  id: string
  user_id: string | null
  nombre: string
  rol: Rol
  posicion: string | null
  email: string | null
  demo: boolean
}

export interface Evento {
  id: string
  tipo: 'entrenamiento' | 'partido'
  fecha: string
  hora: string | null
  titulo: string | null
  rival: string | null
}

export interface Motivo {
  id: string
  nombre: string
  puntos: number
  categoria: 'entrenamiento' | 'partido' | 'otro'
  activo: boolean
}

export interface MovimientoPunto {
  id: string
  profile_id: string
  puntos: number
  motivo: string | null
  motivo_id: string | null
  fecha: string
  registrado_por: string | null
  created_at: string
}

export interface FilaClasificacion {
  id: string
  nombre: string
  sumados: number
  restados: number
  total: number
}

export interface Wellness {
  id: string
  profile_id: string
  evento_id: string
  sueno: number
  fatiga: number
  dolor_muscular: number
  estres: number
  animo: number
  zona_molestias: string | null
  comentario: string | null
  a_tiempo: boolean
  created_at: string
}

export interface Rpe {
  id: string
  profile_id: string
  evento_id: string
  rpe_muscular: number
  rpe_respiratorio: number
  a_tiempo: boolean
  created_at: string
}

export interface Lesion {
  id: string
  profile_id: string
  fecha_inicio: string
  fecha_fin: string
  descripcion: string | null
}

export interface ReglaAlerta {
  id: string
  metrica: string
  operador: '>=' | '<='
  valor: number
  activa: boolean
}

export interface Pendiente {
  evento_id: string
  tipo_encuesta: 'wellness' | 'rpe'
  fecha: string
  titulo: string | null
  tipo_evento: 'entrenamiento' | 'partido'
}
