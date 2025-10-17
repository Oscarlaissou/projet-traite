import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Users, Calendar, ArrowLeft, Search, Download } from "lucide-react"
import { formatMoney } from "../utils/format"
import "./Traites.css"
import MonImage from "../images/image6.png"


const HistoriquePage = () => {
  const navigate = useNavigate()
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000', [])
  const [mode, setMode] = useState("client")
  const [searchClient, setSearchClient] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [historiqueData, setHistoriqueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(6)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440)
  const [globalQuery, setGlobalQuery] = useState("")

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const fetchHistorique = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.append('type', mode)
      if (mode === 'client' && searchClient) {
        params.append('nom_raison_sociale', searchClient)
      } else if (mode === 'mois' && selectedMonth) {
        params.append('month', selectedMonth)
      }

      const res = await fetch(`${baseUrl}/api/traites/historique?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur lors du chargement de l\'historique')
      const data = await res.json()
      const rows = Array.isArray(data) ? data : []
      setHistoriqueData(rows)
      setPage(1)
      setPagination({ current_page: 1, last_page: Math.max(1, Math.ceil(rows.length / perPage)), total: rows.length })
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistorique() }, [mode, searchClient, selectedMonth])
  useEffect(() => { setPage(1); setPagination(p => ({ ...p, current_page: 1 })) }, [globalQuery])
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleExport = () => {
    // Simulate export functionality
    const csvContent = historiqueData.map(item => 
      `${item.date},${item.nom_raison_sociale},${item.montant},${item.statut},${item.action}`
    ).join('\n')
    const blob = new Blob([`Date,Nom/Raison sociale,Montant,Statut,Action\n${csvContent}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historique_${mode}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  

  return (
    <div className="dashboard-stats two-frames">
      <button className="icon-button" onClick={() => navigate('/dashboard?tab=traites')} aria-label="Retour" style={{ marginBottom: 8, color: 'red' }}>
        <ArrowLeft size={18} />
      </button>
      <h2 className="stats-title">Historique des traites</h2>

      <div style={{ display: 'grid', gridTemplateColumns: viewportWidth >= 992 ? '1.2fr 1.8fr' : '1fr', gap: 16, minHeight: 'calc(88vh - 120px)' }}>
        <div style={{ position: viewportWidth >= 992 ? 'sticky' : 'static', top: 8 }}>
          <div className="frame-card" style={{
            backgroundImage: `url(${MonImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: viewportWidth >= 992 ? 480 : '40vh'
          }} />
        </div>

        <div style={{ maxHeight: viewportWidth >= 992 ? 'calc(100vh - 140px)' : 'none', overflowY: viewportWidth >= 992 ? 'auto' : 'visible' }}>
          {/* Mode Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <button onClick={() => setMode('client')} className="stat-card" style={{ border: mode==='client' ? '2px solid #1f2c49' : undefined }}>
              <div className="card-icon-container" style={{ background: '#ffffff' }}>
                <Users size={18} color="#1f2c49" />
              </div>
              <div className="card-content">
                <div className="card-title">Historique </div>
                <div className="card-value">Par client</div>
              </div>
            </button>
            <button onClick={() => setMode('mois')} className="stat-card" style={{ border: mode==='mois' ? '2px solid #1f2c49' : undefined }}>
              <div className="card-icon-container" style={{ background: '#ecfeff' }}>
                <Calendar size={18} color="#0369a1" />
              </div>
              <div className="card-content">
                <div className="card-title">Historique</div>
                <div className="card-value">Par mois</div>
              </div>
            </button>
          </div>

          {/* Search Controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {mode === 'client' ? (
              <>
                <Search size={16} color="#6b7280" />
                <input 
                  type="text" 
                  placeholder="Rechercher par nom de client..." 
                  className="search-input" 
                  value={searchClient} 
                  onChange={(e) => setSearchClient(e.target.value)}
                  style={{ flex: 1, minWidth: 200 }}
                />
              </>
            ) : (
              <>
                <Calendar size={16} color="#6b7280" />
                <input 
                  type="month" 
                  className="search-input" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </>
            )}
            <button className="submit-button" onClick={fetchHistorique}>Rechercher</button>
            <button className="submit-button" onClick={handleExport} disabled={!historiqueData.length}>
              <Download size={16} style={{ marginRight: 6 }} /> Exporter
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                className="search-input"
                placeholder="Recherche globale (date, client, numéro, montant, statut, action, utilisateur)"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                style={{ minWidth: 220 }}
              />
            </div>
          </div>

          {/* Results */}
          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div>Chargement de l'historique...</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-basic">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Nom/Raison sociale</th>
                    <th>Numéro Traite</th>
                    <th>Montant</th>
                    <th>Action</th>
                    <th>Utilisateur</th>
  
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const q = globalQuery.trim().toLowerCase()
                    const filtered = q ? historiqueData.filter(item => {
                      const dateStr = item.date ? new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''
                      const user = item.username || item.user_name || item.user_email || ''
                      const fields = [
                        dateStr,
                        item.nom_raison_sociale,
                        item.numero_traite,
                        String(item.montant ?? ''),
                        item.action,
                        user,
                        item.statut,
                      ].join(' \u2002 ')
                      return fields.toLowerCase().includes(q)
                    }) : historiqueData
                    const pageRows = filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage)
                    return filtered.length > 0 ? (
                      pageRows.map((item, index) => (
                      <tr key={index}>
                        <td>{new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td>{item.nom_raison_sociale}</td>
                        <td>{item.numero_traite}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatMoney(item.montant)}</td>
                        <td>{item.action }</td>
                        <td>{item.username || item.user_name || item.user_email || ''}</td>
                       
                        <td>
                          <span className={`status-badge ${
                            item.statut === 'Non échu' ? 'status-non-echu' :
                            item.statut === 'Échu' ? 'status-echu' :
                            item.statut === 'Impayé' ? 'status-impaye' :
                            item.statut === 'Rejeté' ? 'status-rejete' :
                            item.statut === 'Payé' ? 'status-paye' : ''
                          }`}>
                            {item.statut}
                          </span>
                        </td>
                      </tr>
                      ))
                    ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                        Aucun historique trouvé. Assurez-vous d'être connecté lors de la création/modification,
                        que les migrations sont appliquées, et ajustez les filtres puis cliquez sur Rechercher.
                      </td>
                    </tr>
                    )
                  })()}
                </tbody>
                <tfoot>
                <tr>
                  <td colSpan={7}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, gap: 12, flexWrap: 'wrap' }}>
                      {(() => {
                        const q = globalQuery.trim().toLowerCase()
                        const filteredCount = (q ? historiqueData.filter(item => {
                          const dateStr = item.date ? new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''
                          const user = item.username || item.user_name || item.user_email || ''
                          const fields = [dateStr, item.nom_raison_sociale, item.numero_traite, String(item.montant ?? ''), item.action, user, item.statut].join(' ')
                          return fields.toLowerCase().includes(q)
                        }) : historiqueData).length
                        const lastPage = Math.max(1, Math.ceil(filteredCount / perPage))
                        return (
                          <div>
                            Page {Math.min(page, lastPage)} / {lastPage} • {filteredCount} résultats
                          </div>
                        )
                      })()}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Afficher</span>
                        <select className="search-input" value={perPage} onChange={(e) => { const newPer = parseInt(e.target.value || '6', 10); setPerPage(newPer); setPage(1); setPagination(p => ({ ...p, current_page: 1, last_page: Math.max(1, Math.ceil(historiqueData.length / newPer)), total: historiqueData.length })); }}>
                          {[6,12,18,24].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span>lignes</span>
                      </div>
                      {(() => {
                        const q = globalQuery.trim().toLowerCase()
                        const filteredCount = (q ? historiqueData.filter(item => {
                          const dateStr = item.date ? new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''
                          const user = item.username || item.user_name || item.user_email || ''
                          const fields = [dateStr, item.nom_raison_sociale, item.numero_traite, String(item.montant ?? ''), item.action, user, item.statut].join(' ')
                          return fields.toLowerCase().includes(q)
                        }) : historiqueData).length
                        const lastPage = Math.max(1, Math.ceil(filteredCount / perPage))
                        return (
                          <div style={{ display: 'flex', gap: 8, paddingTop: 10, flexWrap: 'wrap', marginLeft: 200 }}>
                            <button className="page-button" disabled={page <= 1} onClick={() => { const np = Math.max(1, page - 1); setPage(np); setPagination(ps => ({ ...ps, current_page: np })); }}>Précédent</button>
                            {Array.from({ length: lastPage }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5).map(pn => (
                              <button key={pn} className={`page-button ${pn === page ? 'active' : ''}`} onClick={() => { setPage(pn); setPagination(ps => ({ ...ps, current_page: pn })); }}>{pn}</button>
                            ))}
                            <button className="page-button" disabled={page >= lastPage} onClick={() => { const np = Math.min(lastPage, page + 1); setPage(np); setPagination(ps => ({ ...ps, current_page: np })); }}>Suivant</button>
                          </div>
                        )
                      })()}
                    </div>
                  </td>
                </tr>
              </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoriquePage
