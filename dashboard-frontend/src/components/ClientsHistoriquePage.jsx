import React, { useEffect, useMemo, useState } from "react"
import { Users, Calendar, Search as SearchIcon, Download } from "lucide-react"
import Pagination from "./Pagination"
import "./Traites.css"
import MonImage from "../images/image6.png"
import * as XLSX from 'xlsx'

const ClientsHistoriquePage = () => {
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || "", [])
  const [mode, setMode] = useState("client") // 'client' | 'mois'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(6)
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440)
  const [globalQuery, setGlobalQuery] = useState("")

  // Fonction pour formater les changements pour l'export
  const formatChangesForCSV = (changes) => {
    if (!changes || typeof changes !== 'object') return '';
    
    const fieldLabels = {
      'numero_compte': 'N° compte',
      'nom_raison_sociale': 'Nom/Raison sociale',
      'bp': 'BP',
      'ville': 'Ville',
      'pays': 'Pays',
      'adresse_geo_1': 'Adresse 1',
      'adresse_geo_2': 'Adresse 2',
      'telephone': 'Téléphone',
      'email': 'Email',
      'categorie': 'Catégorie',
      'n_contribuable': 'N° contribuable',
      'type_tiers': 'Type',
      'etablissement': 'Établissement',
      'service': 'Service',
      'nom_signataire': 'Signataire',
      'montant_facture': 'Montant facturé',
      'montant_paye': 'Montant payé',
      'credit': 'Crédit',
      'motif': 'Motif'
    };
    
    const items = [];
    for (const [key, value] of Object.entries(changes)) {
      const label = fieldLabels[key] || key;
      const oldVal = value.old || value.from || 'vide';
      const newVal = value.new || value.to || 'vide';
      items.push(`${label}: ${oldVal} -> ${newVal}`);
    }
    
    return items.length > 0 ? items.join(' | ') : '';
  };

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.append('type', mode)
      if (mode === 'client') {
        if (search.trim()) params.append('nom_raison_sociale', search.trim())
      } else {
        params.append('month', selectedMonth)
      }
      params.append('per_page', '100000')
      const res = await fetch(`${baseUrl}/api/tiers/historique?${params.toString()}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
      })
      if (!res.ok) throw new Error("Échec du chargement de l'historique")
      const data = await res.json()
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      const sorted = arr.slice().sort((a, b) => {
        const da = a && a.date ? new Date(a.date).getTime() : 0
        const db = b && b.date ? new Date(b.date).getTime() : 0
        return db - da
      })
      setRows(sorted)
      setPage(1)
    } catch (e) {
      setError(e.message || "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, search, selectedMonth])

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleExport = () => {
    if (!rows.length) return
    const sorted = rows.slice().sort((a, b) => {
      const da = a && a.date ? new Date(a.date).getTime() : 0
      const db = b && b.date ? new Date(b.date).getTime() : 0
      return da - db
    })
    
    // Préparer les données pour Excel
    const worksheetData = sorted.map(item => ({
      'Date': item.date ? new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '',
      'Nom/Raison sociale': item.nom_raison_sociale || '',
      'Action': item.action || '',
      'Utilisateur': item.username + (item.original_creator && item.username !== item.original_creator ? ` (Initialement par: ${item.original_creator})` : ''),
      'Détails': item.action === 'Modification' ? formatChangesForCSV(item.changes) : ''
    }));
    
    // Créer la feuille de calcul Excel
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Ajuster la largeur des colonnes
    const colWidths = [
      { wch: 15 }, // Date
      { wch: 25 }, // Nom/Raison sociale
      { wch: 15 }, // Action
      { wch: 30 }, // Utilisateur
      { wch: 40 }  // Détails
    ];
    worksheet['!cols'] = colWidths;
    
    // Créer le classeur Excel
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historique Clients");
    
    // Générer le fichier Excel et le télécharger
    const fileName = `historique_clients_${mode}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  const filteredRows = React.useMemo(() => {
    const q = globalQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(item => {
      const dateStr = item.date ? new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''
      const fields = [
        dateStr,
        item.nom_raison_sociale || '',
        item.action || '',
        (item.username || '') + (item.original_creator && item.username !== item.original_creator ? ` (Initialement par: ${item.original_creator})` : ''),
      ].join(' ')
      return fields.toLowerCase().includes(q)
    })
  }, [rows, globalQuery])

  useEffect(() => {
    setPage(1)
  }, [filteredRows])

  return (
    <div className="dashboard-stats">
      <h2 className="stats-title">Historique des comptes clients</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: viewportWidth >= 992 ? '0.8fr 2.2fr' : '1fr', 
        gap: viewportWidth >= 768 ? 16 : 8, 
        minHeight: viewportWidth >= 768 ? 'calc(88vh - 120px)' : 'auto'
      }}>
        <div style={{ 
          position: viewportWidth >= 992 ? 'sticky' : 'static', 
          top: 8,
          display: viewportWidth < 768 ? 'none' : 'block'
        }}>
          <div className="frame-card" style={{
            backgroundImage: `url(${MonImage})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: viewportWidth >= 992 ? 480 : '30vh'
          }} />
        </div>

        <div style={{ 
          maxHeight: viewportWidth >= 992 ? 'calc(100vh - 140px)' : 'none', 
          overflowY: viewportWidth >= 992 ? 'auto' : 'visible',
          padding: viewportWidth < 768 ? '0 4px' : '0'
        }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
        <button onClick={() => setMode('client')} className="stat-card" style={{ border: mode==='client' ? '2px solid #1f2c49' : undefined }}>
          <div className="card-icon-container" style={{ background: '#ffffff' }}>
            <Users size={18} color="#1f2c49" />
          </div>
          <div className="card-content">
            <div className="card-title">Historique</div>
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {mode === 'client' ? (
          <>
            <SearchIcon size={16} color="#6b7280" />
            <input className="search-input" placeholder="Rechercher par nom de client..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 280, flex: '0 0 320px' }} />
          </>
        ) : (
          <>
            <Calendar size={16} color="#6b7280" />
            <input className="search-input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </>
        )}
        <button className="submit-button" onClick={fetchData}><SearchIcon size={16} style={{ marginRight: 6 }} /> Rechercher</button>
        <button className="submit-button" onClick={handleExport} disabled={!rows.length}><Download size={16} style={{ marginRight: 6 }} /> Exporter Excel</button>
      </div>
      {/* <div style={{ marginBottom: 12 }}>
        <input
          className="search-input"
          placeholder="Recherche globale..."
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          style={{ width: '100%', maxWidth: 360 }}
        />
      </div> */}
      {error && <div className="error-message" style={{ marginBottom: 8 }}>{error}</div>}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="table-basic">
            <thead>
              <tr>
                <th>Date</th>
                <th>Nom/Raison sociale</th>
                <th>Action</th>
                <th>Utilisateur</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const currentRows = filteredRows.slice((page - 1) * perPage, (page - 1) * perPage + perPage)
                
                // Fonction pour formater les changements
                const formatChanges = (changes) => {
                  if (!changes || typeof changes !== 'object') return 'Aucun détail';
                  
                  const fieldLabels = {
                    'numero_compte': 'N° compte',
                    'nom_raison_sociale': 'Nom/Raison sociale',
                    'bp': 'BP',
                    'ville': 'Ville',
                    'pays': 'Pays',
                    'adresse_geo_1': 'Adresse 1',
                    'adresse_geo_2': 'Adresse 2',
                    'telephone': 'Téléphone',
                    'email': 'Email',
                    'categorie': 'Catégorie',
                    'n_contribuable': 'N° contribuable',
                    'type_tiers': 'Type',
                    'etablissement': 'Établissement',
                    'service': 'Service',
                    'nom_signataire': 'Signataire',
                    'montant_facture': 'Montant facturé',
                    'montant_paye': 'Montant payé',
                    'credit': 'Crédit',
                    'motif': 'Motif'
                  };
                  
                  const items = [];
                  for (const [key, value] of Object.entries(changes)) {
                    const label = fieldLabels[key] || key;
                    const oldVal = value.old || value.from || 'vide';
                    const newVal = value.new || value.to || 'vide';
                    items.push(`${label}: ${oldVal} → ${newVal}`);
                  }
                  
                  return items.length > 0 ? items.join(' | ') : 'Aucun détail';
                };
                
                return filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
                      Aucun enregistrement pour les critères sélectionnés.
                    </td>
                  </tr>
                ) : currentRows.map((r, idx) => (
                  <tr key={(r.date || '') + '_' + idx}>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.date ? new Date(r.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td>
                    <td>{r.nom_raison_sociale || ''}</td>
                    <td>{r.action || ''}</td>
                    <td>
                      {r.username || ''}
                      {r.original_creator && r.username !== r.original_creator && (
                        <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '2px' }}>
                          Initialement par: {r.original_creator}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85em', maxWidth: '300px' }}>
                      {r.action === 'Modification' ? formatChanges(r.changes) : '-'}
                    </td>
                  </tr>
                ))})()}
            </tbody>
          </table>
          <div style={{ marginTop: 8 }}>
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(filteredRows.length / perPage))}
              totalItems={filteredRows.length}
              itemsPerPage={perPage}
              onPageChange={(p) => setPage(p)}
              onItemsPerPageChange={(n) => { setPerPage(n); setPage(1) }}
              itemsPerPageOptions={[6, 10, 20, 50]}
              showItemsPerPage={true}
              showTotal={true}
            />
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default ClientsHistoriquePage

