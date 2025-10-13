import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  Loader2 
} from "lucide-react"
import "./DashboardStats.css"

const DashboardStats = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({ total: 0, perDay: 0, perMonth: 0, overdue: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [statusData, setStatusData] = useState([])
  const navigate = useNavigate()

  // Adapte les données au style souhaité
  const monthlyDisplay = useMemo(() => {
    // Convertir 'YYYY-MM' -> libellé court (Jan, Fév, ...)
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
    return (monthlyData || []).map((d) => {
      const [y, m] = String(d.name || '').split('-').map(Number)
      const label = m ? monthNames[m-1] || d.name : d.name
      return { ...d, label }
    })
  }, [monthlyData])

  // Utiliser exactement les statuts renvoyés par l'API (Non échu, Échu, Impayé, Rejeté, Payé)
  const statusTotal = useMemo(() => (statusData || []).reduce((sum, s) => sum + (s.value || 0), 0), [statusData])

  useEffect(() => {
    let isMounted = true
    let intervalId
    const fetchStats = async () => {
      try {
        setLoading(true)
        const baseUrl = process.env.REACT_APP_API_URL || ''
        const token = localStorage.getItem('token')
        const res = await fetch(`${baseUrl}/api/traites/stats`, {
          headers: token ? { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } : { 'Accept': 'application/json' }
        })
        if (!res.ok) throw new Error("Erreur lors du chargement des statistiques")
        const contentType = res.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await res.json() : { total: 0, perDay: 0, perMonth: 0, overdue: 0 }
        if (!isMounted) return
        setStats({
          total: data.total ?? 0,
          perDay: data.perDay ?? 0,
          perMonth: data.perMonth ?? 0,
          overdue: data.overdue ?? 0,
        })

        // monthly
        const resMonthly = await fetch(`${baseUrl}/api/traites/monthly`, {
          headers: token ? { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } : { 'Accept': 'application/json' }
        })
        if (resMonthly.ok) {
          const monthly = await resMonthly.json()
          if (isMounted) setMonthlyData(Array.isArray(monthly) ? monthly : [])
        }

        // status
        const resStatus = await fetch(`${baseUrl}/api/traites/status`, {
          headers: token ? { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } : { 'Accept': 'application/json' }
        })
        if (resStatus.ok) {
          const status = await resStatus.json()
          if (isMounted) setStatusData(Array.isArray(status) ? status : [])
        }
      } catch (e) {
        if (!isMounted) return
        setError(e.message || "Erreur inconnue")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchStats()
    intervalId = setInterval(fetchStats, 300000) // refresh every 5 mins
    return () => { isMounted = false; if (intervalId) clearInterval(intervalId) }
  }, [])

  const cardsData = [
    {
      icon: FileText,
      title: "Traites totales",
      value: stats.total,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      onClick: () => navigate('/dashboard?tab=traites')
    },
    {
      icon: TrendingUp,
      title: "Traites/jour",
      value: stats.perDay,
      color: "#FFBB7F",
      bgColor: "#FEF2F2",
      onClick: () => {
        const today = new Date().toISOString().slice(0,10)
        navigate(`/dashboard?tab=traites&from=${today}&to=${today}`)
      }
    },
    {
      icon: Calendar,
      title: "Traites/mois",
      value: stats.perMonth,
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
      onClick: () => {
        const d = new Date()
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth()+1).padStart(2,'0')
        const first = `${yyyy}-${mm}-01`
        const last = new Date(yyyy, d.getMonth()+1, 0)
        const lastStr = `${yyyy}-${mm}-${String(last.getDate()).padStart(2,'0')}`
        navigate(`/dashboard?tab=traites&from=${first}&to=${lastStr}`)
      }
    },
    {
      icon: CheckCircle,
      title: "Traites échues",
      value: stats.overdue,
      color: "#2AAD4D",
      bgColor: "#ECFDF5",
      onClick: () => {
        const statut = encodeURIComponent('Échu')
        navigate(`/dashboard?tab=traites&statut=${statut}`)
      }
    }
  ]

  return (
    <div className="dashboard-stats">
      <h2 className="stats-title">Statistiques</h2>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="stats-grid">
        {cardsData.map((card, index) => (
          <div key={index} className="stat-card" onClick={card.onClick} style={{ cursor: 'pointer' }}>
            <div 
              className="card-icon-container"
              style={{ backgroundColor: card.bgColor }}
            >
              <card.icon size={20} color={card.color} />
            </div>
            
            <div className="card-content">
              <p className="card-title">{card.title}</p>
              <p className="card-value">
                {loading ? (
                  <Loader2 size={16} className="loading-spinner" />
                ) : (
                  card.value.toLocaleString()
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="stats-grid" style={{ marginTop: '1rem' }}>
        <div className="stat-card chart-card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem' }}>
            <h3 style={{ margin: 0, color: '#1a365d' }}>Évolution des Traites</h3>
          </div>
          <div style={{ padding: '0 1rem 1rem', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <Loader2 size={20} className="loading-spinner" />
            ) : (monthlyDisplay && monthlyDisplay.length > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyDisplay}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="traites" stroke="#e11d48" strokeWidth={3} name="Nombre de traites" dot={{ r: 4, stroke: '#e11d48', fill: '#e11d48' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#6b7280' }}>Aucune donnée à afficher</div>
            )}
          </div>
        </div>

        <div className="stat-card chart-card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem' }}>
            <h3 style={{ margin: 0, color: '#1a365d' }}>Répartition par Statut</h3>
          </div>
          <div style={{ padding: '0 1rem 1rem', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <Loader2 size={20} className="loading-spinner" />
            ) : (statusTotal > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || '#3b82f6'} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const statut = encodeURIComponent(String(entry.name || '').trim())
                          navigate(`/dashboard?tab=traites&statut=${statut}`)
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#6b7280' }}>Aucune donnée à afficher</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardStats