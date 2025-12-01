import React, { useEffect, useState, useMemo } from "react"
import { useLocation } from "react-router-dom"
import Toast from "./Toast"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Edit3, Trash2, Printer } from "lucide-react"
import { formatMoney } from "../utils/format"
import Can from './Can'; // Import the Can component
import "./Traites.css"
import MonImage from "../images/image4.png"

const TraiteDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const location = useLocation()
  const [toast, setToast] = useState(() => (location.state && location.state.toast) ? location.state.toast : null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || '', [])
  const formatDateDDMMYYYY = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d)) return value
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

  

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Accept': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${baseUrl}/api/traites/${id}`, { headers })
        if (!res.ok) throw new Error('Erreur de chargement')
        let data = await res.json()
        // Auto-coerce statut if due reached
        try {
          const echeanceDate = data?.echeance ? new Date(data.echeance) : null
          const isNonEchu = String(data?.statut || '').toLowerCase().includes('non')
          if (echeanceDate && !isNaN(echeanceDate) && isNonEchu && echeanceDate <= new Date()) {
            const token2 = localStorage.getItem('token')
            const headers2 = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
            if (token2) headers2['Authorization'] = `Bearer ${token2}`
            fetch(`${baseUrl}/api/traites/${data.id}/statut`, { method: 'PATCH', headers: headers2, body: JSON.stringify({ statut: 'Échu' }) }).catch(() => {})
            data = { ...data, statut: 'Échu' }
          }
        } catch (_) {}
        if (mounted) setItem(data)
      } catch (e) {
        setError(e.message || 'Erreur inconnue')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [id, baseUrl])

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette traite ?')) return
    try {
      const token = localStorage.getItem('auth_token')
      const headers = { 'Accept': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/traites/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Suppression échouée')
      navigate('/dashboard')
    } catch (e) {
      alert(e.message || 'Erreur inconnue')
    }
  }

  const handlePrint = () => {
    if (!item) return
    const base = (process.env.REACT_APP_API_URL || '')
    const url = `${base}/print/traites/${item.id}/preview`
    window.open(url, '_blank')
  }

  const handleUpdateStatus = async (newStatut) => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/traites/${id}/statut`, { method: 'PATCH', headers, body: JSON.stringify({ statut: newStatut }) })
      if (!res.ok) throw new Error('Mise à jour du statut échouée')
      setItem((prev) => ({ ...prev, statut: newStatut }))
    } catch (e) {
      alert(e.message || 'Erreur inconnue')
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Chargement...</div>
  if (error) return <div style={{ padding: 16, color: 'crimson' }}>{error}</div>

  const statusValue = (item?.statut || 'Non échu').toLowerCase()
  const statusClass = statusValue.includes('non échu') || statusValue.includes('non e') ? 'status-non-echu' :
                      statusValue.includes('échu') || statusValue.includes('echu') ? 'status-echu' :
                      statusValue.includes('impay') ? 'status-impaye' :
                      statusValue.includes('rej') ? 'status-rejete' :
                      statusValue.includes('pay') ? 'status-paye' : ''

  return (
    <div className="dashboard-stats">
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button className="icon-button" onClick={() => navigate('/dashboard?tab=traites')} aria-label="Retour" style={{ color: 'red' }}>
          <ArrowLeft size={18} />
        </button>
        <span className="crumb" onClick={() => navigate('/dashboard?tab=traites')}>Gestion Traites</span>
        <span>›</span>
        <span className="crumb-current">Détail</span>
      </div>

      {toast && (
        <Toast title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 2.2fr', gap: 16, height: 'calc(100vh - 120px)' }}>
        <div style={{
          backgroundImage: `url(${MonImage})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // border: '1px solid #e5e7eb',
          borderRadius: 10,
          minHeight: 360
        }} />

        <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
          <div className="detail-header">
            <div className="detail-title">Détail de la traite</div>
            <div className="detail-status-actions">
              <span className={`status-badge ${statusClass}`}style={{fontSize: '20px'}}>{item?.statut || 'Non échu'}</span>
              {(() => {
                const current = String(item?.statut || '').toLowerCase()
                const isManual = ['impayé','impaye','rejeté','rejete','payé','paye'].some(k => current.includes(k))
                const manualValue = isManual ? (item?.statut || '') : ''
                return (
                  <select className="search-input" value={manualValue} onChange={(e) => e.target.value && handleUpdateStatus(e.target.value)}>
                    <option value="">Choisir un statut</option>
                    <option>Impayé</option>
                    <option>Rejeté</option>
                    <option>Payé</option>
                  </select>
                )
              })()}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-grid">
              <Detail label="Numéro" value={item?.numero} />
              <Detail label="Nb traites" value={item?.nombre_traites} />
              <Detail label="1ere Échéance" value={formatDateDDMMYYYY(item?.echeance)} />
              <Detail label="Émission" value={formatDateDDMMYYYY(item?.date_emission)} />
              <Detail label="Montant de crédit" value={formatMoney(item?.montant)} />
              <Detail label="Nom/Raison sociale" value={item?.nom_raison_sociale} />
              <Detail label="Domiciliation" value={item?.domiciliation_bancaire} />
              <Detail label="RIB" value={item?.rib} />
              <Detail label="Motif" value={item?.motif} />
              <Detail label="Commentaires" value={item?.commentaires} />
            </div>

            <div className="detail-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
              <Can permission="edit_traites">
                <button className="submit-button" onClick={() => navigate(`/traites/${id}/edit`)}><Edit3 size={16} style={{ marginRight: 6 }} /> Modifier</button>
              </Can>
              <button className="submit-button" onClick={handlePrint}><Printer size={16} style={{ marginRight: 6 }} /> Imprimer</button>
              <Can permission="delete_traites">
                <button className="submit-button" onClick={handleDelete}><Trash2 size={16} style={{ marginRight: 6 }} /> Supprimer</button>
              </Can>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Detail = ({ label, value }) => (
  <div className="detail-field">
    <div className="detail-label">{label}</div>
    <div className="detail-value">{value ?? ''}</div>
  </div>
)

export default TraiteDetailPage



