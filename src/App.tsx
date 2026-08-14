import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import PlayerLayout from './pages/player/PlayerLayout'
import PlayerHome from './pages/player/PlayerHome'
import WellnessForm from './pages/player/WellnessForm'
import RpeForm from './pages/player/RpeForm'
import MisEstadisticas from './pages/player/MisEstadisticas'
import Clasificacion from './pages/shared/Clasificacion'
import JugadorDetalle from './pages/shared/JugadorDetalle'
import CoachLayout from './pages/coach/CoachLayout'
import CoachHome from './pages/coach/CoachHome'
import Puntos from './pages/coach/Puntos'
import Catalogo from './pages/coach/Catalogo'
import Calendario from './pages/coach/Calendario'
import Asistencia from './pages/coach/Asistencia'
import Lesiones from './pages/coach/Lesiones'
import ReglasAlerta from './pages/coach/ReglasAlerta'
import Plantilla from './pages/coach/Plantilla'

export default function App() {
  const { loading, session, perfil } = useAuth()

  if (loading) return <Spinner label="Cargando…" />

  if (!session || !perfil) return <Login />

  if (perfil.rol === 'entrenador') {
    return (
      <Routes>
        <Route element={<CoachLayout />}>
          <Route path="/" element={<CoachHome />} />
          <Route path="/puntos" element={<Puntos />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/asistencia" element={<Asistencia />} />
          <Route path="/lesiones" element={<Lesiones />} />
          <Route path="/alertas" element={<ReglasAlerta />} />
          <Route path="/plantilla" element={<Plantilla />} />
          <Route path="/clasificacion" element={<Clasificacion />} />
          <Route path="/jugador/:id" element={<JugadorDetalle />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    )
  }

  // Jugador
  return (
    <Routes>
      <Route element={<PlayerLayout />}>
        <Route path="/" element={<PlayerHome />} />
        <Route path="/wellness/:eventoId" element={<WellnessForm />} />
        <Route path="/rpe/:eventoId" element={<RpeForm />} />
        <Route path="/estadisticas" element={<MisEstadisticas />} />
        <Route path="/clasificacion" element={<Clasificacion />} />
        <Route path="/jugador/:id" element={<JugadorDetalle />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
