import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, ArrowLeft, X } from "lucide-react"
import { formatMoney } from "../utils/format"
import Pagination from './Pagination'
import * as XLSX from 'xlsx'
// ÉTAPE 1: Importer les outils pour l'impression
import { useReactToPrint } from 'react-to-print'
import "./Traites.css"

const Columns = [
  { key: 'numero', label: 'Numéro' },
  { key: 'nombre_traites', label: 'Nb traites' },
  { key: 'echeance', label: 'Échéance' },
  { key: 'date_emission', label: 'Émission' },
  { key: 'montant', label: 'Montant de crédit' },
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
  const [sort, setSort] = useState({ key: 'numero', dir: 'desc' })
  const [initialized, setInitialized] = useState(false)
  const importInputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // ÉTAPE 2: Créer une référence pour le contenu à imprimer
  const componentToPrintRef = useRef(null);
  
  // État pour gérer l'impression de toutes les données
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [allItemsForPrint, setAllItemsForPrint] = useState([]);

  // Fonction pour charger toutes les données pour l'impression
  const loadAllItemsForPrint = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statut) params.append('statut', statut);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (sort?.key) params.append('sort', sort.key);
      if (sort?.dir) params.append('dir', sort.dir);
      params.append('per_page', '1000'); // Charger toutes les données
      
      const url = `${baseUrl}/api/traites?${params.toString()}`;
      const res = await fetch(url, { headers: authHeaders() });
      
      if (!res.ok) {
        throw new Error(`Erreur lors du chargement des données pour l'impression: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const allItems = data.data || data || [];
      
      // Trier les données pour l'impression (ascendant sur 'numero')
      const sortedItems = allItems.slice().sort((a, b) => {
        const an = Number(a.numero);
        const bn = Number(b.numero);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        return String(a.numero).localeCompare(String(b.numero));
      });
      
      return sortedItems;
    } catch (e) {
      console.error('Erreur lors du chargement des données pour l\'impression:', e);
      throw e;
    }
  };

  // Fonction d'impression modifiée
  const handlePrint = useReactToPrint({
    contentRef: componentToPrintRef,
    documentTitle: 'Grille-des-traites',
    pageStyle: `
      @media print {
        @page { 
          size: landscape; 
          margin: 0.2cm;
        }
        body { 
          -webkit-print-color-adjust: exact; 
          zoom: 65%;
        }
        table { 
          width: 100% !important; 
          border-collapse: collapse; 
          font-size: 6pt;
          table-layout: auto;
        }
        th, td { 
          border: 1px solid #ccc; 
          padding: 2px;
          word-wrap: break-word;
        }
        tfoot, .no-print { display: none !important; } /* Cacher la pagination et autres éléments non désirés */
        .status-badge { 
          border: 1px solid #ddd !important; 
          background-color: transparent !important; 
          color: #000 !important;
          font-size: 5pt;
        }
      }
    `,
    onBeforeGetContent: async () => {
      // Avant l'impression, charger toutes les données si nécessaire
      setIsPrintingAll(true);
      try {
        const allItems = await loadAllItemsForPrint();
        setAllItemsForPrint(allItems);
      } catch (e) {
        alert(e.message || 'Erreur lors du chargement des données pour l\'impression');
      }
    },
    onAfterPrint: () => {
      // Après l'impression, réinitialiser l'état
      setIsPrintingAll(false);
      setAllItemsForPrint([]);
    }
  });

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

  const exportExcel = async () => {
    try {
      console.log('Début de l\'exportation Excel...')
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statut) params.append('statut', statut)
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      if (sort?.key) params.append('sort', sort.key)
      if (sort?.dir) params.append('dir', sort.dir)
      params.append('per_page', '1000')

      const url = `${baseUrl}/api/traites?${params.toString()}`
      const res = await fetch(url, { headers: authHeaders() })

      if (!res.ok) {
        throw new Error(`Erreur lors du chargement des données pour l'export: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      const allItems = data.data || data || []

      const sortedItems = allItems.slice().sort((a, b) => {
        const an = Number(a.numero)
        const bn = Number(b.numero)
        if (!isNaN(an) && !isNaN(bn)) return an - bn
        return String(a.numero).localeCompare(String(b.numero))
      })

      const headerLabels = Columns.map(c => c.label)

      const dataForSheet = sortedItems.map(item => {
        const rowData = {}
        Columns.forEach(col => {
          let value = item[col.key]
          if (col.key === 'echeance' || col.key === 'date_emission') {
            value = formatDateDDMMYYYY(value)
          } else if (col.key === 'montant') {
            value = Number(item[col.key] || 0)
          } else {
            value = value ?? ''
          }
          rowData[col.label] = value
        })
        return rowData
      })
      
      const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: headerLabels })

      const colWidths = headerLabels.map(header => ({
        wch: Math.max(
          header.length,
          ...dataForSheet.map(row => row[header]?.toString().length ?? 0)
        ) + 2
      }))
      worksheet['!cols'] = colWidths

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Traites")

      const fileName = `traites_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, fileName)

      console.log('Exportation Excel terminée avec succès')
    } catch (e) {
      console.error('Erreur lors de l\'exportation:', e)
      alert(e.message || 'Export Excel échoué')
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const parseCSV = (text) => {
    const separator = ';'
    const parseCSVWithQuotes = (csvText) => {
      const rows = []
      let currentRow = []
      let currentField = ''
      let inQuotes = false
      let i = 0
      
      while (i < csvText.length) {
        const char = csvText[i]
        const nextChar = csvText[i + 1]
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"'
            i += 2
            continue
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === separator && !inQuotes) {
          currentRow.push(currentField.trim())
          currentField = ''
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField.trim())
            if (currentRow.some(field => field !== '')) {
              rows.push(currentRow)
            }
            currentRow = []
            currentField = ''
          }
          if (char === '\r' && nextChar === '\n') {
            i++
          }
        } else {
          currentField += char
        }
        i++
      }
      
      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim())
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow)
        }
      }
      
      return rows
    }
    
    const rows = parseCSVWithQuotes(text)
    
    if (rows.length === 0) {
      return { headers: [], records: [] }
    }
    
    const headers = rows[0]
    const records = rows.slice(1).map((row) => {
      const record = new Array(headers.length).fill('')
      row.forEach((field, fieldIndex) => {
        if (fieldIndex < headers.length) {
          record[fieldIndex] = field
        }
      })
      return record
    })
    
    return { headers, records }
  }

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRecords, setCsvRecords] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' })
  const [duplicates, setDuplicates] = useState({ csvDuplicates: [], existingDuplicates: [] })
  const [duplicateAction, setDuplicateAction] = useState('skip')
  const [isImporting, setIsImporting] = useState(false)

  const fieldMappings = {
    numero: ['num'],
    nombre_traites: ['nbreTT'],
    echeance: ['echeance'],
    date_emission: ['DateTT'],
    montant: ['Mt'],
    nom_raison_sociale: ['tire'],
    domiciliation_bancaire: ['domiciliation'],
    rib: ['NumCompte'],
    motif: ['motif'],
    commentaires: ['commentaires'],
    statut: ['statut']
  }

  const detectDuplicates = async (headers, records, columnMapping) => {
    const csvDuplicates = []
    const existingDuplicates = []
    
    const numeroIndex = headers.findIndex(h => columnMapping.numero === h)
    const nbTraitesIndex = headers.findIndex(h => columnMapping.nombre_traites === h)
    const montantIndex = headers.findIndex(h => columnMapping.montant === h)
    
    if (numeroIndex !== -1 && nbTraitesIndex !== -1 && montantIndex !== -1) {
      const seenTraites = new Map()
      
      records.forEach((record, index) => {
        const numero = record[numeroIndex]?.trim()
        const nbTraites = parseInt(record[nbTraitesIndex]) || 0
        const montant = parseFloat(record[montantIndex]) || 0
        
        if (nbTraites > 0 && montant > 0) {
          const cleTraite = `${nbTraites}_${montant}`
          
          if (seenTraites.has(cleTraite)) {
            csvDuplicates.push({ 
              line: index + 2, 
              numero, 
              nbTraites,
              montant,
              type: 'csv',
              reason: `Doublon par nombre de traites (${nbTraites}) et montant (${montant})`
            })
          } else {
            seenTraites.set(cleTraite, { line: index + 2, numero })
          }
        }
      })
    }
    
    try {
      const res = await fetch(`${baseUrl}/api/traites?per_page=1000`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const existingTraites = data.data || data || []
        
        const existingTraitesKeys = new Set(
          existingTraites
            .filter(t => t.nombre_traites > 0 && t.montant > 0)
            .map(t => `${t.nombre_traites}_${t.montant}`)
        )
        
        records.forEach((record, index) => {
          const numero = record[numeroIndex]?.trim()
          const nbTraites = parseInt(record[nbTraitesIndex]) || 0
          const montant = parseFloat(record[montantIndex]) || 0
          
          if (nbTraites > 0 && montant > 0) {
            const cleTraite = `${nbTraites}_${montant}`
            if (existingTraitesKeys.has(cleTraite)) {
              existingDuplicates.push({ 
                line: index + 2, 
                numero, 
                nbTraites,
                montant,
                type: 'existing',
                reason: `Nombre de traites (${nbTraites}) et montant (${montant}) déjà existant en base`
              })
            }
          }
        })
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des doublons existants:', error)
    }
    
    return { csvDuplicates, existingDuplicates }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const { headers, records } = parseCSV(text)
      if (!headers.length || !records.length) throw new Error('CSV vide ou invalide')

      const autoMapping = {}
      Object.keys(fieldMappings).forEach(field => {
        const possibleNames = fieldMappings[field]
        for (const name of possibleNames) {
          let index = headers.findIndex(h => h === name)
          if (index === -1) {
            index = headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
          }
          if (index === -1) {
            index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(h.toLowerCase()))
          }
          if (index !== -1) {
            autoMapping[field] = headers[index]
            break
          }
        }
      })
      
      const duplicates = await detectDuplicates(headers, records, autoMapping)

      setCsvHeaders(headers)
      setCsvRecords(records)
      setColumnMapping(autoMapping)
      setDuplicates(duplicates)
      setImportModalOpen(true)
      
    } catch (err) {
      alert(err.message || 'Erreur lors de la lecture du fichier CSV')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleImportConfirm = async () => {
    try {
      setIsImporting(true)
      setImportProgress({ current: 0, total: csvRecords.length, status: 'Préparation de l\'importation...' })
      
      const token = localStorage.getItem('token')
      const headersReq = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      if (token) headersReq['Authorization'] = `Bearer ${token}`

      const headerToIndex = csvHeaders.reduce((acc, h, i) => { acc[h] = i; return acc }, {})
      const toVal = (row, fieldName) => {
        const mappedColumn = columnMapping[fieldName]
        if (!mappedColumn) return ''
        const idx = headerToIndex[mappedColumn]
        return idx != null ? row[idx] : ''
      }

      const dataToImport = []
      for (let i = 0; i < csvRecords.length; i++) {
        const row = csvRecords[i]
        
        const numero = toVal(row, 'numero')
        const montant = Number(String(toVal(row, 'montant') || '').replace(/[^\d.,]/g, '').replace(',', '.')) || 0
        const echeance = toVal(row, 'echeance')
        const date_emission = toVal(row, 'date_emission')
        
        const hasImportantData = numero || montant > 0 || echeance || date_emission
        if (!hasImportantData) continue
        
        const payload = {
          numero: numero,
          nombre_traites: Number((toVal(row, 'nombre_traites') || '1').replace(/\D+/g, '')) || 1,
          echeance: echeance,
          date_emission: date_emission,
          montant: montant,
          nom_raison_sociale: toVal(row, 'nom_raison_sociale') || 'Client sans nom',
          domiciliation_bancaire: toVal(row, 'domiciliation_bancaire'),
          rib: toVal(row, 'rib'),
          motif: toVal(row, 'motif') || '',
          commentaires: toVal(row, 'commentaires') || '',
          statut: toVal(row, 'statut') || '',
        }
        dataToImport.push(payload)
      }
      
      setImportProgress({ current: 0, total: dataToImport.length, status: 'Importation en cours...' })
      
      const requestBody = { 
        data: dataToImport, 
        duplicate_action: duplicateAction 
      }
      
      const res = await fetch(`${baseUrl}/api/traites/import-csv`, { 
        method: 'POST', 
        headers: headersReq, 
        body: JSON.stringify(requestBody) 
      })
      
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(`Import échoué: ${msg}`)
      }
      
      const result = await res.json()
      
      let statusMessage = `Importation terminée! ${result.imported} traites importées`
      if (result.skipped > 0) statusMessage += `, ${result.skipped} doublons ignorés`
      if (result.errors && result.errors.length > 0) statusMessage += `, ${result.errors.length} erreurs`
      
      setImportProgress({ current: dataToImport.length, total: dataToImport.length, status: statusMessage })
      
      setTimeout(() => {
        setImportModalOpen(false)
        setIsImporting(false)
        fetchItems()
      }, 2000)
      
    } catch (err) {
      setIsImporting(false)
      setImportProgress({ current: 0, total: 0, status: `Erreur: ${err.message}` })
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
      const today = new Date()
      const normalized = Array.isArray(records) ? records.map((it) => {
        const echeanceDate = it?.echeance ? new Date(it.echeance) : null
        const isNonEchu = String(it?.statut || '').toLowerCase().includes('non')
        if (echeanceDate && !isNaN(echeanceDate) && isNonEchu && echeanceDate <= today) {
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
  
  const handleRowClick = (it, e) => {
    const interactive = e.target.closest && e.target.closest('button, select, a, input, textarea, [role="button"], svg')
    if (interactive) return
    navigate(`/traites/${it.id}`)
  }

  return (
    <div className="dashboard-stats">
      {isImporting && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'white' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #ffffff', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
          <h3 style={{ margin: 0, fontSize: '18px' }}>Importation en cours...</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.8 }}>{importProgress.status || 'Traitement des données...'}</p>
          {importProgress.total > 0 && (
            <div style={{ marginTop: '20px', width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{importProgress.current} / {importProgress.total}</span>
                <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: '4px', height: '8px' }}>
                <div style={{ backgroundColor: '#ffffff', height: '100%', borderRadius: '4px', width: `${(importProgress.current / importProgress.total) * 100}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}
        </div>
      )}
      
      <button className="icon-button" onClick={() => { setSearch(''); setStatut(''); setFrom(''); setTo(''); setSort({ key: 'numero', dir: 'desc' }); setPage(1); fetchItems() }} aria-label="Retour" style={{ marginBottom: 8, color: 'red' }}>
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
        
        <button className="submit-button" onClick={handleNew}><Plus size={16} style={{ marginRight: 6 }} /> Nouvelle traite</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="submit-button" onClick={exportExcel}>Exporter Excel</button>
          <button className="submit-button" onClick={handleImportClick}>Importer CSV</button>
          {/* ÉTAPE 4: Ajouter le bouton d'impression */}
          <button className="submit-button" onClick={handlePrint}>Imprimer</button>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        // ÉTAPE 5: Lier la référence à la div contenant la grille
        <div ref={componentToPrintRef} className={`table-wrap`}>
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
              {/* Utiliser allItemsForPrint lors de l'impression, sinon utiliser items */}
              {(isPrintingAll ? allItemsForPrint : items).map(it => (
                <tr key={it.id} onClick={(e) => !isPrintingAll && handleRowClick(it, e)} style={{ cursor: isPrintingAll ? 'default' : 'pointer' }}>
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
          {/* Cacher la pagination lors de l'impression */}
          {!isPrintingAll && (
            <tfoot>
              <tr>
                <td colSpan={Columns.length}>
                  <Pagination
                    currentPage={pagination.current_page || page}
                    totalPages={pagination.last_page || 1}
                    totalItems={pagination.total || 0}
                    itemsPerPage={perPage}
                    onPageChange={(newPage) => setPage(newPage)}
                    onItemsPerPageChange={(newPerPage) => {
                      setPerPage(newPerPage)
                      setPage(1)
                    }}
                    itemsPerPageOptions={[10, 20, 50, 100]}
                    showItemsPerPage={true}
                    showTotal={true}
                  />
                </td>
              </tr>
            </tfoot>
          )}
        </div>
      )}
      
    {/* ... Le reste de votre JSX (modal d'importation, etc.) reste inchangé ... */}
    {importModalOpen && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)', position: 'relative' }}>
          <button aria-label="Fermer" onClick={() => setImportModalOpen(false)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'red', lineHeight: 0 }}>
            <X size={20} />
          </button>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>Configuration de l'importation CSV</h3>
          
          <div style={{ marginBottom: 20 }}>
            <h4>Colonnes détectées dans le fichier CSV :</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {csvHeaders.map((header, index) => (
                <span key={index} style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: '12px', border: '1px solid #d1d5db' }}>
                  {header}
                </span>
              ))}
            </div>
          </div>

          {(duplicates.csvDuplicates.length > 0 || duplicates.existingDuplicates.length > 0) && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#dc2626' }}>⚠️ Doublons détectés :</h4>
              
              {duplicates.csvDuplicates.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Doublons dans le fichier CSV :</strong>
                  <div style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 4, marginTop: 4 }}>
                    {duplicates.csvDuplicates.map((dup, index) => (
                      <div key={index} style={{ fontSize: '12px', color: '#dc2626' }}>
                        Ligne {dup.line}: Numéro "{dup.numero}" déjà présent dans le fichier
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {duplicates.existingDuplicates.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Doublons avec les données existantes :</strong>
                  <div style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 4, marginTop: 4 }}>
                    {duplicates.existingDuplicates.map((dup, index) => (
                      <div key={index} style={{ fontSize: '12px', color: '#dc2626' }}>
                        Ligne {dup.line}: Numéro "{dup.numero}" existe déjà dans la base de données
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Action pour les doublons :</label>
                <select value={duplicateAction} onChange={(e) => setDuplicateAction(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%' }}>
                  <option value="skip">Ignorer les doublons (recommandé)</option>
                  <option value="import_all">Importer tous les enregistrements</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h4>Mapping des colonnes :</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.keys(fieldMappings).map(field => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ minWidth: 120, fontSize: '14px' }}>{Columns.find(c => c.key === field)?.label || field}:</label>
                  <select value={columnMapping[field] || ''} onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: e.target.value }))} style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}>
                    <option value="">-- Non mappé --</option>
                    {csvHeaders.map(header => (<option key={header} value={header}>{header}</option>))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {csvRecords.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4>Aperçu des données (3 premières lignes) :</h4>
              <div style={{ overflow: 'auto', maxHeight: 200, border: '1px solid #d1d5db', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      {csvHeaders.map((header, index) => (<th key={index} style={{ padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left' }}>{header}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRecords.slice(0, 3).map((row, rowIndex) => (<tr key={rowIndex}> {row.map((cell, cellIndex) => (<td key={cellIndex} style={{ padding: '4px 8px', border: '1px solid #d1d5db' }}>{cell}</td>))}</tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importProgress.total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4>Progression de l'importation :</h4>
              <div style={{ backgroundColor: '#f3f4f6', borderRadius: 4, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>{importProgress.status}</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: 4, height: 8 }}>
                  <div style={{ backgroundColor: '#10b981', height: '100%', borderRadius: 4, width: `${(importProgress.current / importProgress.total) * 100}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setImportModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 4, backgroundColor: 'white', cursor: 'pointer' }}>Annuler</button>
            <button
              onClick={() => {
                const requiredFields = ['numero', 'nombre_traites', 'echeance', 'date_emission', 'montant', 'nom_raison_sociale']
                const missingFields = requiredFields.filter(field => !columnMapping[field])
                if (missingFields.length > 0) {
                  alert(`Champs requis non mappés: ${missingFields.join(', ')}`)
                  return
                }
                handleImportConfirm()
              }}
              disabled={isImporting}
              style={{ padding: '8px 16px', border: 'none', borderRadius: 4, backgroundColor: isImporting ? '#9ca3af' : '#3b82f6', color: 'white', cursor: isImporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isImporting && (<div style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />)}
              {isImporting ? 'Importation en cours...' : 'Importer'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}

export default TraitesGrid