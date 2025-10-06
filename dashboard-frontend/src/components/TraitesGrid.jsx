import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Edit3, Trash2, Printer, Plus } from "lucide-react"
import "./Traites.css"

const Columns = [
  { key: 'numero', label: 'Numéro' },
  { key: 'nombre_traites', label: 'Nb traites' },
  { key: 'echeance', label: 'Échéance' },
  { key: 'date_emission', label: 'Émission' },
  { key: 'montant', label: 'Montant' },
  { key: 'nom_raison_sociale', label: 'Nom/Raison sociale' },
  { key: 'domiciliation_bancaire', label: 'Domiciliation' },
  { key: 'rib', label: 'RIB' },
  { key: 'motif', label: 'Motif' },
  { key: 'commentaires', label: 'Commentaires' },
  { key: 'statut', label: 'Statut' },
]

const TraitesGrid = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || '', [])

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const fetchItems = async () => {
    setLoading(true)
    setError("")
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`${baseUrl}/api/traites${q}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setItems(data.data || data || [])
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const handleNew = () => { navigate('/traites/new') }
  const handleEdit = (it) => { navigate(`/traites/${it.id}/edit`) }
  const handleDelete = async (it) => {
    if (!window.confirm('Supprimer cette traite ?')) return
    try {
      const token = localStorage.getItem('auth_token')
      const headers = { 'Accept': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/traites/${it.id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Suppression échouée')
      fetchItems()
    } catch (e) {
      alert(e.message || 'Erreur inconnue')
    }
  }

  const handleUpdateStatus = async (it, statut) => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}/api/traites/${it.id}/statut`, { method: 'PATCH', headers, body: JSON.stringify({ statut }) })
      if (!res.ok) throw new Error('Mise à jour du statut échouée')
      fetchItems()
    } catch (e) {
      alert(e.message || 'Erreur inconnue')
    }
  }

  const handlePrint = (it) => {
    // Placeholder impression
    window.print()
  }

  return (
    <div className="dashboard-stats">
      <h2 className="stats-title">Grille de saisie des traites</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Recherche..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" style={{ maxWidth: 260 }} />
        <button className="submit-button" onClick={fetchItems}>Rechercher</button>
        <button className="submit-button" onClick={handleNew}><Plus size={16} style={{ marginRight: 6 }} /> Nouvelle traite</button>
      </div>


      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="table-basic">
            <thead>
              <tr>
                {Columns.map(col => (
                  <th key={col.key} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{col.label}</th>
                ))}
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  {Columns.map(col => {
                    const val = it[col.key]
                    if (col.key === 'statut') {
                      const s = (val || 'Non échu').toLowerCase()
                      const cls = s.includes('non échu') || s.includes('non e') ? 'status-non-echu' :
                                  s.includes('échu') || s.includes('echu') ? 'status-echu' :
                                  s.includes('impay') ? 'status-impaye' :
                                  s.includes('rej') ? 'status-rejete' :
                                  s.includes('pay') ? 'status-paye' : ''
                      return (
                        <td key={col.key} style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                          <span className={`status-badge ${cls}`}>{val || 'Non échu'}</span>
                        </td>
                      )
                    }
                    return (
                      <td key={col.key} style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{val ?? ''}</td>
                    )
                  })}
                  <td>
                    <div className="actions-inline">
                      <button title="Modifier" className="icon-button primary" onClick={() => handleEdit(it)}><Edit3 size={16} /></button>
                      <button title="Supprimer" className="icon-button danger" onClick={() => handleDelete(it)}><Trash2 size={16} /></button>
                      <button title="Imprimer" className="icon-button print" onClick={() => handlePrint(it)}><Printer size={16} /></button>
                    <select className="search-input" value={it.statut || 'Non échu'} onChange={(e) => handleUpdateStatus(it, e.target.value)}>
                      <option>Non échu</option>
                      <option>Échu</option>
                      <option>Impayé</option>
                      <option>Rejeté</option>
                      <option>Payé</option>
                    </select>{' '}
                    
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TraitesGrid


