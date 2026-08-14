import { useAuth } from '../../lib/auth'
import StatsCharts from '../../components/StatsCharts'

export default function MisEstadisticas() {
  const { perfil } = useAuth()
  if (!perfil) return null
  return (
    <div>
      <h1 className="mb-1 text-lg font-black text-damm-ink">Mis estadísticas 📊</h1>
      <p className="mb-5 text-sm text-gray-500">Solo tú puedes ver estos datos.</p>
      <StatsCharts profileId={perfil.id} />
    </div>
  )
}
