import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import TraiteForm from "./TraiteForm"
import "./Traites.css"

const TraiteFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [initialValue, setInitialValue] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const baseUrl = process.env.REACT_APP_API_URL || ''

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!id) return
      try {
        const token = localStorage.getItem('auth_token')
        const headers = { 'Accept': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${baseUrl}/api/traites/${id}`, { headers })
        if (!res.ok) throw new Error('Erreur de chargement')
        const data = await res.json()
        if (mounted) setInitialValue(data)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, baseUrl])

  if (loading) return <div style={{ padding: 16 }}>Chargement...</div>

  return (
    <div className="dashboard-stats">
      <button className="icon-button" onClick={() => navigate('/dashboard?tab=traites')} aria-label="Retour" style={{ marginBottom: 8 ,color:"red"}}>
        <ArrowLeft size={18} />
      </button>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <span className="crumb" onClick={() => navigate('/dashboard?tab=traites')}>Gestion Traites</span>
        <span> › </span>
        <span className="crumb" onClick={() => navigate('/dashboard?tab=traites')}>Grille de saisie</span>
        <span> › </span>
        <span className="crumb-current">{id ? 'Modifier' : 'Nouvelle traite'}</span>
      </nav>

      <h2 className="stats-title">{id ? 'Modifier une traite' : 'Nouvelle traite'}</h2>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <TraiteForm
          initialValue={initialValue}
          submitLabel={id ? 'Modifier' : 'Créer'}
          onCancel={() => navigate('/dashboard?tab=traites')}
          onSaved={() => navigate('/dashboard?tab=traites')}
        />
      </div>
    </div>
  )
}

export default TraiteFormPage


