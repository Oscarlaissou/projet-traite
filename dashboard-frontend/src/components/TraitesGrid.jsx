import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, ArrowLeft } from "lucide-react"
import { formatMoney } from "../utils/format"
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
  const [statut, setStatut] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [sort, setSort] = useState({ key: 'echeance', dir: 'asc' })
  const [initialized, setInitialized] = useState(false)
  const importInputRef = useRef(null)
  // Navigation vers la page de détail au clic sur une ligne
  const navigate = useNavigate()
  const location = useLocation()

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

  

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const exportCSV = () => {
    try {
      const headerKeys = Columns.map(c => c.key)
      const headerLabels = Columns.map(c => c.label)
      const rows = items.map(it => headerKeys.map(k => {
        let v = it[k]
        if (k === 'echeance' || k === 'date_emission') {
          if (v) {
            const d = new Date(v)
            if (!isNaN(d)) {
              const dd = String(d.getDate()).padStart(2,'0')
              const mm = String(d.getMonth()+1).padStart(2,'0')
              const yyyy = d.getFullYear()
              v = `${dd}-${mm}-${yyyy}`
            }
          }
        }
        if (k === 'montant') {
          v = Number(it[k] || 0)
        }
        const s = v == null ? '' : String(v)
        // escape quotes and wrap
        return '"' + s.replace(/"/g, '""') + '"'
      }).join(','))
      const csv = [headerLabels.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `traites_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.message || 'Export CSV échoué')
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const parseCSV = (text) => {
    // Simple CSV parser supporting quotes
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (!lines.length) return { headers: [], records: [] }
    const parseLine = (line) => {
      const out = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"') {
            if (line[i+1] === '"') { cur += '"'; i++ } else { inQuotes = false }
          } else { cur += ch }
        } else {
          if (ch === '"') { inQuotes = true }
          else if (ch === ',') { out.push(cur); cur = '' }
          else { cur += ch }
        }
      }
      out.push(cur)
      return out
    }
    const headers = parseLine(lines[0]).map(h => h.trim())
    const records = lines.slice(1).map(l => parseLine(l))
    return { headers, records }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const { headers, records } = parseCSV(text)
      if (!headers.length || !records.length) throw new Error('CSV vide ou invalide')

      // Map CSV headers to payload fields
      const headerToIndex = headers.reduce((acc, h, i) => { acc[h.toLowerCase()] = i; return acc }, {})
      const toVal = (row, key) => {
        const idx = headerToIndex[key]
        return idx != null ? row[idx] : ''
      }

      const token = localStorage.getItem('token')
      const headersReq = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      if (token) headersReq['Authorization'] = `Bearer ${token}`

      for (const row of records) {
        // Accept common French headers; fallback to our column keys
        const payload = {
          numero: toVal(row, 'numero') || toVal(row, 'numéro') || toVal(row, 'Numéro'.toLowerCase()),
          nombre_traites: Number((toVal(row, 'nombre_traites') || '1').replace(/\D+/g, '')) || 1,
          echeance: toVal(row, 'echeance') || toVal(row, 'échéance') || '',
          date_emission: toVal(row, 'date_emission') || toVal(row, 'émission') || '',
          montant: Number(String(toVal(row, 'montant') || '').replace(/\D+/g, '')) || 0,
          nom_raison_sociale: toVal(row, 'nom_raison_sociale') || toVal(row, 'nom/raison sociale'.toLowerCase()) || '',
          domiciliation_bancaire: toVal(row, 'domiciliation_bancaire') || toVal(row, 'domiciliation') || '',
          rib: toVal(row, 'rib') || '',
          motif: toVal(row, 'motif') || '',
          commentaires: toVal(row, 'commentaires') || '',
          statut: toVal(row, 'statut') || 'Non échu',
        }
        const res = await fetch(`${baseUrl}/api/traites`, { method: 'POST', headers: headersReq, body: JSON.stringify(payload) })
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Import échoué pour une ligne')
        }
      }
      alert('Import CSV terminé')
      fetchItems()
    } catch (err) {
      alert(err.message || 'Import CSV échoué')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const fetchItems = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statut) params.append('statut', statut)
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      if (sort?.key) params.append('sort', sort.key)
      if (sort?.dir) params.append('dir', sort.dir)
      params.append('page', String(page))
      params.append('per_page', String(perPage))
      const qs = params.toString()
      const res = await fetch(`${baseUrl}/api/traites${qs ? `?${qs}` : ''}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      const records = data.data || data || []
      // Auto-coerce status if due date reached
      const today = new Date()
      const normalized = Array.isArray(records) ? records.map((it) => {
        const echeanceDate = it?.echeance ? new Date(it.echeance) : null
        const isNonEchu = String(it?.statut || '').toLowerCase().includes('non')
        if (echeanceDate && !isNaN(echeanceDate) && isNonEchu && echeanceDate <= today) {
          // fire-and-forget API update; ignore errors silently
          try {
            const token = localStorage.getItem('token')
            const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            fetch(`${baseUrl}/api/traites/${it.id}/statut`, { method: 'PATCH', headers, body: JSON.stringify({ statut: 'Échu' }) }).catch(() => {})
          } catch (_) {}
          return { ...it, statut: 'Échu' }
        }
        return it
      }) : records
      setItems(normalized)
      if (data && typeof data === 'object' && data.current_page) {
        setPagination({ current_page: data.current_page, last_page: data.last_page, total: data.total })
      } else {
        setPagination({ current_page: 1, last_page: 1, total: records.length })
      }
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (initialized) fetchItems() }, [initialized, page, perPage, sort, from, to, statut])

  // Appliquer les filtres depuis l'URL quand on arrive depuis le dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab === 'traites') {
      const urlSearch = params.get('search') || ''
      const urlFrom = params.get('from') || ''
      const urlTo = params.get('to') || ''
      const urlStatut = params.get('statut') || ''
      let changed = false
      if (urlSearch && urlSearch !== search) { setSearch(urlSearch); changed = true }
      if (urlFrom && urlFrom !== from) { setFrom(urlFrom); changed = true }
      if (urlTo && urlTo !== to) { setTo(urlTo); changed = true }
      if (urlStatut && urlStatut !== statut) { setStatut(urlStatut); changed = true }
      if (changed) { setPage(1) }
      setInitialized(true)
    } else {
      // If grid is rendered without query params, allow normal fetch
      setInitialized(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const handleHeaderSort = (key) => {
    setPage(1)
    setSort((s) => {
      if (s.key === key) {
        return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: 'asc' }
    })
  }

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

  const handleRowClick = (it, e) => {
    const interactive = e.target.closest && e.target.closest('button, select, a, input, textarea, [role="button"], svg')
    if (interactive) return
    navigate(`/traites/${it.id}`)
  }

  return (
    <div className="dashboard-stats">
      <button className="icon-button" onClick={() => { setSearch(''); setStatut(''); setFrom(''); setTo(''); setSort({ key: 'echeance', dir: 'asc' }); setPage(1); fetchItems() }} aria-label="Retour" style={{ marginBottom: 8, color: 'red' }}>
        <ArrowLeft size={18} />
      </button>
      
      <h2 className="stats-title">Grille de saisie des traites</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Rechercher par client..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchItems() } }} className="search-input" style={{ maxWidth: 260 }} />
        <select className="search-input" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option>Non échu</option>
          <option>Échu</option>
          <option>Impayé</option>
          <option>Rejeté</option>
          <option>Payé</option>
        </select>
        De <input type="date" placeholder="jj/mm/aaaa" value={from} onChange={(e) => setFrom(e.target.value)} className="search-input" />
        à <input type="date" placeholder="jj/mm/aaaa" value={to} onChange={(e) => setTo(e.target.value)} className="search-input" />
        <button className="submit-button" onClick={() => { setPage(1); fetchItems() }}>Rechercher</button>
        
        <button className="submit-button" onClick={() => { setPage(1); setSort((s) => ({ key: 'nom_raison_sociale', dir: s.key === 'nom_raison_sociale' && s.dir === 'asc' ? 'desc' : 'asc' })) }}>
          Trier {sort.key === 'nom_raison_sociale' && sort.dir === 'desc' ? 'A→Z' : 'Z→A'} (Nom)
        </button>
        {/* Removed sort, alpha and expand controls as requested */}
        <button className="submit-button" onClick={handleNew}><Plus size={16} style={{ marginRight: 6 }} /> Nouvelle traite</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="submit-button" onClick={exportCSV}>Exporter CSV</button>
          <button className="submit-button" onClick={handleImportClick}>Importer CSV</button>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>


      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className={`table-wrap`}>
          <table className={`table-basic`}>
            <thead>
              <tr>
                {Columns.map(col => {
                  const sortableKeys = ['numero','nombre_traites','echeance','date_emission','montant','nom_raison_sociale','statut']
                  const isSortable = sortableKeys.includes(col.key)
                  const isActive = sort.key === col.key
                  const arrow = isActive ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''
                  return (
                    <th key={col.key} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', cursor: isSortable ? 'pointer' : 'default' }} onClick={() => isSortable && handleHeaderSort(col.key)}>
                      {col.label}{arrow}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} onClick={(e) => handleRowClick(it, e)} style={{ cursor: 'pointer' }}>
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
                    const isDate = col.key === 'echeance' || col.key === 'date_emission'
                    const isMoney = col.key === 'montant'
                    const displayVal = isDate ? formatDateDDMMYYYY(val) : isMoney ? formatMoney(val) : (val ?? '')
                    return (
                      <td key={col.key} style={{ padding: 8, borderBottom: '1px solid #f3f4f6', whiteSpace: isMoney ? 'nowrap' : undefined }}>{displayVal}</td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <tfoot>
            <tr>
              <td colSpan={Columns.length}>
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
                  <div style={{ display: 'flex', gap: 8, paddingTop: 10, flexWrap: 'wrap',marginLeft:200}}>
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

export default TraitesGrid


