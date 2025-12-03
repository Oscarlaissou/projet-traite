import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom" // Add useNavigate import

const NotificationsBanner = () => {
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000', [])
  const [pendingClientsCount, setPendingClientsCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate() // Add useNavigate hook

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const fetchPendingClientsCount = async () => {
    setLoading(true); setError("")
    try {
      // Fetch pending clients count
      const res = await fetch(`${baseUrl}/api/pending-clients`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const count = Array.isArray(data?.data) ? data.data.length : 0
        setPendingClientsCount(count)
        console.log('NotificationsBanner - pending clients count:', count)
      } else {
        throw new Error('Erreur chargement clients en attente')
      }
    } catch (e) {
      console.error('NotificationsBanner - error:', e)
      setError(e.message || 'Erreur inconnue')
      setPendingClientsCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingClientsCount()
    const id = setInterval(fetchPendingClientsCount, 5000) // refresh chaque 5s
    return () => clearInterval(id)
  }, [])

  // If no pending clients or loading/error, don't show anything
  if (loading || error || pendingClientsCount === 0) return null

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
    marginTop:80 ,
    position: 'relative',
    marginBottom: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    pointerEvents: 'auto',
    cursor: 'pointer' // Add cursor pointer
    
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

  const handleDismiss = (e) => {
    // Prevent navigation when closing
    e.stopPropagation()
    // Dismiss all pending client notifications by setting count to 0
    setPendingClientsCount(0)
  }

  const handleNavigate = () => {
    // Navigate to pending clients view
    navigate('/dashboard?tab=credit&view=PendingClients')
  }

  return (
    <div style={containerStyle}>
      <div>
        <div style={cardStyle} onClick={handleNavigate}>
          <button aria-label="Fermer" onClick={handleDismiss} style={closeBtnStyle}>×</button>
          <div style={{ fontWeight: 700, color: '#9a3412' }}>Clients en attente</div>
          <div style={{ color: '#b45309', marginTop: 2 }}>
            Vous avez {pendingClientsCount} client{pendingClientsCount > 1 ? 's' : ''} en attente d'approbation
          </div>
          <div style={{ color: '#b45309', marginTop: 4 }}>
            Cliquez ici pour les consulter
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsBanner