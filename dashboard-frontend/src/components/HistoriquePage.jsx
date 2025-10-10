import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Users, Calendar, ArrowLeft, Search, Download } from "lucide-react"
import "./Traites.css"
import MonImage from "../images/image6.png"

const HistoriquePage = () => {
  const navigate = useNavigate()
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || '', [])
  const [mode, setMode] = useState("client")
  const [searchClient, setSearchClient] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [historiqueData, setHistoriqueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const fetchHistorique = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (mode === 'client' && searchClient) {
        params.append('search', searchClient)
      } else if (mode === 'mois' && selectedMonth) {
        const [yyyy, mm] = selectedMonth.split('-')
        const first = `${yyyy}-${mm}-01`
        const lastDate = new Date(Number(yyyy), Number(mm), 0).getDate()
        const last = `${yyyy}-${mm}-${String(lastDate).padStart(2,'0')}`
        params.append('from', first)
        params.append('to', last)
      }

      const res = await fetch(`${baseUrl}/api/traites?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur lors du chargement de l\'historique')
      const data = await res.json()
      const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      const mapped = records.map((it) => ({
        date: it.date_emission || it.echeance,
        nom_raison_sociale: it.nom_raison_sociale,
        numero_traite: it.numero,
        montant: it.montant,
        action: '',
        statut: it.statut
      }))
      setHistoriqueData(mapped)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistorique() }, [mode, searchClient, selectedMonth])

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

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: 16, height: 'calc(100vh - 120px)' }}>
        <div className="frame-card" style={{
          backgroundImage: `url(${MonImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />

        <div>
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
  
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {historiqueData.length > 0 ? (
                    historiqueData.map((item, index) => (
                      <tr key={index}>
                        <td>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                        <td>{item.nom_raison_sociale}</td>
                        <td>{item.numero_traite}</td>
                        <td>{item.montant}</td>
                       
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
                        Aucun historique trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoriquePage
