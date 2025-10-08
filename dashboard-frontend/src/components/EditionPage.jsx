import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, CalendarClock, ArrowLeft } from "lucide-react"
import "./Traites.css"

const EditionPage = () => {
  const navigate = useNavigate()
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || '', [])
  const [mode, setMode] = useState("jour")
  const [dateJour, setDateJour] = useState(() => new Date().toISOString().slice(0,10))
  const [mois, setMois] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // Mass action removed per request
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const computeRange = () => {
    if (mode === 'jour') {
      return { from: dateJour, to: dateJour }
    }
    const [yyyy, mm] = mois.split('-')
    const first = `${yyyy}-${mm}-01`
    const lastDate = new Date(Number(yyyy), Number(mm), 0).getDate()
    const last = `${yyyy}-${mm}-${String(lastDate).padStart(2,'0')}`
    return { from: first, to: last }
  }

  const fetchItems = async () => {
    setLoading(true)
    setError("")
    try {
      const { from, to } = computeRange()
      const params = new URLSearchParams()
      params.append('from', from)
      params.append('to', to)
      params.append('page', String(page))
      params.append('per_page', String(perPage))
      const res = await fetch(`${baseUrl}/api/traites?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      const records = data.data || data || []
      const arrayRecords = Array.isArray(records) ? records : []
      setItems(arrayRecords)
      if (data && typeof data === 'object' && data.current_page) {
        setPagination({ current_page: data.current_page, last_page: data.last_page, total: data.total })
      } else {
        setPagination({ current_page: 1, last_page: 1, total: arrayRecords.length })
      }
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [mode, dateJour, mois, page, perPage])

  // Mass action removed

  const handleEdit = (it) => navigate(`/traites/${it.id}/edit`)

  return (
    <div className="dashboard-stats">
      <button className="icon-button" onClick={() => navigate('/dashboard?tab=traites')} aria-label="Retour" style={{ marginBottom: 8, color: 'red' }}>
        <ArrowLeft size={18} />
      </button>
      <h2 className="stats-title">Édition des traites</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
        <button onClick={() => setMode('jour')} className="stat-card" style={{ border: mode==='jour' ? '2px solid #1f2c49' : undefined }}>
          <div className="card-icon-container" style={{ background: '#eef2ff' }}>
            <Calendar size={18} color="#1f2c49" />
          </div>
          <div className="card-content">
            <div className="card-title">Mode</div>
            <div className="card-value">Par jour</div>
          </div>
        </button>
        <button onClick={() => setMode('mois')} className="stat-card" style={{ border: mode==='mois' ? '2px solid #1f2c49' : undefined }}>
          <div className="card-icon-container" style={{ background: '#ecfeff' }}>
            <CalendarClock size={18} color="#0369a1" />
          </div>
          <div className="card-content">
            <div className="card-title">Mode</div>
            <div className="card-value">Par mois</div>
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {mode === 'jour' ? (
          <>
            <span>Jour</span>
            <input type="date" className="search-input" value={dateJour} onChange={(e) => setDateJour(e.target.value)} />
          </>
        ) : (
          <>
            <span>Mois</span>
            <input type="month" className="search-input" value={mois} onChange={(e) => setMois(e.target.value)} />
          </>
        )}
        <button className="submit-button" onClick={fetchItems}>Rechercher</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="table-basic">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Échéance</th>
                <th>Montant</th>
                <th>Client</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const s = String(it?.statut || 'Non échu').toLowerCase()
                const cls = s.includes('non échu') || s.includes('non e') ? 'status-non-echu' :
                            s.includes('échu') || s.includes('echu') ? 'status-echu' :
                            s.includes('impay') ? 'status-impaye' :
                            s.includes('rej') ? 'status-rejete' :
                            s.includes('pay') ? 'status-paye' : ''
                return (
                  <tr key={it.id} onClick={() => handleEdit(it)} style={{ cursor: 'pointer' }}>
                    <td>{it.numero}</td>
                    <td>{it.echeance?.slice(0,10)}</td>
                    <td>{it.montant}</td>
                    <td>{it.nom_raison_sociale}</td>
                    <td><span className={`status-badge ${cls}`}>{it.statut || 'Non échu'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <tfoot>
            <tr>
              <td colSpan={5}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    Page {pagination.current_page || page} / {pagination.last_page || 1} • {pagination.total} résultats
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Afficher</span>
                    <select className="search-input" value={perPage} onChange={(e) => { setPerPage(parseInt(e.target.value || '10', 10)); setPage(1); }}>
                      {[10,20,50,100].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span>lignes</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingTop: 10, flexWrap: 'wrap', marginLeft: 200 }}>
                    <button className="page-button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Précédent</button>
                    {Array.from({ length: pagination.last_page || 1 }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5).map(p => (
                      <button key={p} className={`page-button ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="page-button" disabled={page >= (pagination.last_page || 1)} onClick={() => setPage(p => Math.min((pagination.last_page || 1), p + 1))}>Suivant</button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </div>
      )}
    </div>
  )
}

export default EditionPage


