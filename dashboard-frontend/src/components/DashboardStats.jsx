import React, { useEffect, useState } from "react"
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

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        setLoading(true)
        const baseUrl = process.env.REACT_APP_API_URL || ''
        const token = localStorage.getItem('auth_token')
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
      } catch (e) {
        if (!isMounted) return
        setError(e.message || "Erreur inconnue")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchStats()
    return () => { isMounted = false }
  }, [])

  const cardsData = [
    {
      icon: FileText,
      title: "Traites totales",
      value: stats.total,
      color: "#3B82F6",
      bgColor: "#EFF6FF"
    },
    {
      icon: TrendingUp,
      title: "Traites/jour",
      value: stats.perDay,
      color: "#FFBB7F",
      bgColor: "#FEF2F2"
    },
    {
      icon: Calendar,
      title: "Traites/mois",
      value: stats.perMonth,
      color: "#8B5CF6",
      bgColor: "#F5F3FF"
    },
    {
      icon: CheckCircle,
      title: "Traites échues",
      value: stats.overdue,
      color: "#2AAD4D",
      bgColor: "#ECFDF5"
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
          <div key={index} className="stat-card">
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
    </div>
  )
}

export default DashboardStats