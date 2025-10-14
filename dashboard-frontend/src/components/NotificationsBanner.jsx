import React, { useEffect, useMemo, useState } from "react"

const NotificationsBanner = () => {
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000', [])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const getDismissed = () => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]') } catch { return [] }
  }
  const setDismissed = (ids) => {
    localStorage.setItem('dismissed_notifs', JSON.stringify(ids))
    window.dispatchEvent(new Event('dismissed_notifs_changed'))
  }

  const fetchToday = async () => {
    setLoading(true); setError("")
    try {
      const params = new URLSearchParams()
      params.append('per_page', '200')
      params.append('upcoming_days', '1') // Jour J uniquement (Non échu + échéance aujourd'hui)
      const res = await fetch(`${baseUrl}/api/traites?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur chargement notifications')
      const data = await res.json()
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      const dismissed = new Set(getDismissed())
      const filtered = rows.filter(it => !dismissed.has(it.id))
      setItems(filtered)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchToday()
  }, [])

  if (loading || error || items.length === 0) return null

  const handleDismiss = (id) => {
    const dismissed = getDismissed()
    if (!dismissed.includes(id)) {
      dismissed.push(id)
      setDismissed(dismissed)
    }
    setItems(prev => prev.filter(it => it.id !== id))
  }

  const containerStyle = {
    position: 'fixed',
    top: 12,
    right: 12,
    zIndex: 1000,
    width: 'clamp(260px, 28vw, 380px)',
    pointerEvents: 'none' // allow clicks to pass except on cards
  }

  const cardStyle = {
    border: '1px solid #f59e0b',
    background: '#fff7ed',
    borderRadius: 8,
    padding: 12,
    marginTop:60 ,
    position: 'relative',
    marginBottom: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    pointerEvents: 'auto'
  }

  const closeBtnStyle = {
    position: 'absolute',
    top: 6,
    right: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#9a3412',
    fontWeight: 700,
    fontSize: 16
  }

  return (
    <div style={containerStyle}>
      <div>
        {items.map(it => (
          <div key={it.id} style={cardStyle}>
            <button aria-label="Fermer" onClick={() => handleDismiss(it.id)} style={closeBtnStyle}>×</button>
            <div style={{ fontWeight: 700, color: '#9a3412' }}>Échéance aujourd'hui</div>
            <div style={{ color: '#b45309', marginTop: 2 }}>{it.numero} • {it.nom_raison_sociale}</div>
            <div style={{ color: '#b45309', marginTop: 4 }}>{new Date(it.echeance).toLocaleDateString('fr-FR')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationsBanner


