import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, ArrowLeft, X, Search, Download, Upload, Printer, FileText } from "lucide-react"
import Can from "./Can"
import { useAuth } from "../hooks/useAuth"
import { formatMoney } from "../utils/format"
import Pagination from './Pagination'
import * as XLSX from 'xlsx'
// ÉTAPE 1: Importer les outils pour l'impression
import { useReactToPrint } from 'react-to-print'
import "./Traites.css"

// Define Columns array for the grid
const Columns = [
  { key: 'numero', label: 'Numéro', minWidth: 80 },
  { key: 'nombre_traites', label: 'Nb TT', minWidth: 60 },
  { key: 'echeance', label: 'Échéance', minWidth: 100 },
  { key: 'date_emission', label: 'Émission', minWidth: 120 }, // Increased width as requested
  { key: 'montant', label: 'Montant', minWidth: 100 },
  { key: 'nom_raison_sociale', label: 'Tiré', minWidth: 150 },
  { key: 'statut', label: 'Statut', minWidth: 100 }
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
  const [perPage, setPerPage] = useState(10) // Reste à 10 pour l'affichage normal
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [itemsPerPageForPrinting] = useState(53) // Fixed value for printing
  const [sort, setSort] = useState({ key: 'numero', dir: 'desc' })
  const [initialized, setInitialized] = useState(false)
  const importInputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authHeaders: authHeadersHook, baseUrl: baseUrlHook } = useAuth()
  
  // États pour la fonctionnalité d'impression améliorée
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printOptions, setPrintOptions] = useState({
    printAllPages: true,
    specificPage: 1,
    fromPage: 1,
    toPage: 1,
    printCurrentView: false,
    pageRanges: '',
    selectedOption: 'all' // 'all', 'specific', 'range', 'current', 'pages'
  })
  const [isPrinting, setIsPrinting] = useState(false)
  
  // ÉTAPE 2: Créer une référence pour le contenu à imprimer
  const componentToPrintRef = useRef(null);
  
  // État pour gérer l'impression de toutes les données
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [allItemsForPrint, setAllItemsForPrint] = useState([]);

  // Use the baseUrl from useAuth hook or fallback to environment variable
  // Move useMemo outside of conditional logic to comply with React Hooks rules
  const apiBaseUrl = useMemo(() => {
    return baseUrlHook || process.env.REACT_APP_API_URL || ''
  }, [baseUrlHook])

  // Use the authHeaders from useAuth hook or fallback to local implementation
  const getApiHeaders = () => {
    return authHeadersHook ? authHeadersHook() : (() => {
      const token = localStorage.getItem('token')
      const headers = { 'Accept': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      return headers
    })()
  }

  // Add missing helper functions
  const getElementRangeForPage = (pageNum) => {
    const start = (pageNum - 1) * itemsPerPageForPrinting + 1;
    const end = pageNum * itemsPerPageForPrinting;
    return { start, end };
  };

  const openPrintModal = () => {
    setPrintModalOpen(true);
  };

  const handlePrintWithOptions = async () => {
    setIsPrinting(true);
    
    try {
      // Implementation depends on selected option
      switch (printOptions.selectedOption) {
        case 'all':
          // Fetch all data for printing
          await fetchAllItemsForPrinting();
          break;
        case 'specific':
          // Print specific page
          await fetchSpecificPageForPrinting(printOptions.specificPage);
          break;
        case 'current':
          // Print current view with 53 items per page
          await fetchCurrentViewForPrinting();
          break;
        case 'range':
          // Print page range
          await fetchPageRangeForPrinting(printOptions.fromPage, printOptions.toPage);
          break;
        case 'pages':
          // Print specific pages
          await fetchSpecificPagesForPrinting(printOptions.pageRanges);
          break;
        default:
          // Default to current view
          await fetchCurrentViewForPrinting();
      }
      
      // Trigger print after a short delay to ensure state updates
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);
    } catch (error) {
      console.error('Print error:', error);
      setIsPrinting(false);
      alert('Erreur lors de la préparation de l\'impression');
    }
  };

  // Helper functions for printing
  const fetchAllItemsForPrinting = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statut) params.append('statut', statut);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (sort?.key) params.append('sort', sort.key);
      if (sort?.dir) params.append('dir', sort.dir);
      params.append('per_page', '1000'); // Fetch all items
      
      const response = await fetch(`${apiBaseUrl}/api/traites?${params.toString()}`, { 
        headers: getApiHeaders() 
      });
      
      if (!response.ok) throw new Error('Failed to fetch data for printing');
      
      const data = await response.json();
      const allItems = data.data || data || [];
      
      // Format data for printing
      const formattedItems = allItems.map(item => {
        const formattedItem = {};
        Columns.forEach(col => {
          let value = item[col.key];
          if (col.key === 'echeance' || col.key === 'date_emission') {
            value = formatDateDDMMYYYY(value);
          } else if (col.key === 'montant') {
            value = formatMoney(value);
          } else {
            value = value ?? '';
          }
          formattedItem[col.label] = value;
        });
        return formattedItem;
      });
      
      setAllItemsForPrint(formattedItems);
      setIsPrintingAll(true);
    } catch (error) {
      console.error('Error fetching all items for printing:', error);
      throw error;
    }
  };

  const fetchSpecificPageForPrinting = async (pageNum) => {
    // Implementation for specific page printing
    console.log('Printing specific page:', pageNum);
  };

  const fetchCurrentViewForPrinting = async () => {
    // Implementation for current view printing
    console.log('Printing current view');
  };

  const fetchPageRangeForPrinting = async (fromPage, toPage) => {
    // Implementation for page range printing
    console.log('Printing page range:', fromPage, 'to', toPage);
  };

  const fetchSpecificPagesForPrinting = async (pageRanges) => {
    // Implementation for specific pages printing
    console.log('Printing specific pages:', pageRanges);
  };

  const formatDateDDMMYYYY = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d)) return value
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
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

      const url = `${apiBaseUrl}/api/traites?${params.toString()}`
      const res = await fetch(url, { headers: getApiHeaders() })

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
      const res = await fetch(`${apiBaseUrl}/api/traites?per_page=1000`, { headers: getApiHeaders() })
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
      
      const res = await fetch(`${apiBaseUrl}/api/traites/import-csv`, { 
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
      params.append('per_page', String(perPage)) // Toujours utiliser perPage (10) pour l'affichage
      const qs = params.toString()
      const res = await fetch(`${apiBaseUrl}/api/traites${qs ? `?${qs}` : ''}`, { headers: getApiHeaders() })
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
            fetch(`${apiBaseUrl}/api/traites/${it.id}/statut`, { method: 'PATCH', headers, body: JSON.stringify({ statut: 'Échu' }) }).catch(() => {})
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

  useEffect(() => { 
    if (initialized) {
      fetchItems();
    }
  }, [initialized, page, perPage, sort, from, to, statut]);

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
              <div style={{ backgroundColor: '#f3f4f6', borderRadius: 4, padding: 12 }}>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: 4, height: 8 }}>
                  <div style={{ backgroundColor: '#10b981', height: '100%', borderRadius: 4, width: `${(importProgress.current / importProgress.total) * 100}%`, transition: 'width 0.3s ease' }} />
                </div>
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
        <button className="submit-button" onClick={() => { setPage(1); fetchItems() }}><Search size={16} style={{ marginRight: 6 }} /> Rechercher</button>
        
        <Can permission="create_traites">
          <button className="submit-button" onClick={handleNew}><Plus size={16} style={{ marginRight: 6 }} /> Nouvelle traite</button>
        </Can>
        <div style={{ display: 'flex', gap: 8 }}>
          <Can permission="view_traites">
            <button className="submit-button" onClick={exportExcel}><Download size={16} style={{ marginRight: 6 }} /> Exporter Excel</button>
          </Can>
          <Can permission="create_traites" condition={user && (user.role && (user.role.name === 'admin' || user.role.name === 'super_admin'))}>
            <button className="submit-button" onClick={handleImportClick}><Upload size={16} style={{ marginRight: 6 }} /> Importer CSV</button>
          </Can>
          {/* ÉTAPE 4: Ajouter le bouton d'impression */}
          <Can permission="view_traites">
            <button className="submit-button" onClick={openPrintModal}><Printer size={16} style={{ marginRight: 6 }} /> Imprimer</button>
          </Can>
          <Can permission="create_traites">
            <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileChange} />
          </Can>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div>Chargement...</div>
      ) : (
        // ÉTAPE 5: Lier la référence à la div contenant la grille
        <div ref={componentToPrintRef} className={`table-wrap`}>
          {/* Affichage normal du tableau */}
          {!isPrintingAll ? (
            <table className={`table-basic`}>
              <thead>
                <tr>
                  {Columns.map(col => {
                    const sortableKeys = ['numero','nombre_traites','echeance','date_emission','montant','nom_raison_sociale','statut']
                    const isSortable = sortableKeys.includes(col.key)
                    const isActive = sort.key === col.key
                    const arrow = isActive ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''
                    return (
                      <th key={col.key} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', cursor: isSortable ? 'pointer' : 'default', minWidth: col.minWidth || 'auto' }} onClick={() => isSortable && handleHeaderSort(col.key)}>
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
                      const cellStyle = { 
                        padding: 8, 
                        borderBottom: '1px solid #f3f4f6', 
                        whiteSpace: isMoney ? 'nowrap' : undefined,
                        minWidth: col.key === 'date_emission' ? 120 : 'auto'
                      }
                      return (
                        <td key={col.key} style={cellStyle}>{displayVal}</td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Tableau spécifique pour l'impression */
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  {Columns.map(col => (
                    <th key={col.key} style={{ border: '1px solid #000', padding: '4px', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allItemsForPrint.map((item, index) => (
                  <tr key={index}>
                    {Columns.map(col => (
                      <td key={col.key} style={{ border: '1px solid #000', padding: '3px', wordWrap: 'break-word' }}>
                        {item[col.label]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
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
                    itemsPerPageOptions={[10, 20, 53, 100, 200]} // Ajout de plus d'options incluant 53
                    showItemsPerPage={true}
                    showTotal={true}
                  />
                </td>
              </tr>
            </tfoot>
          )}
        </div>
      )}
      
      {/* Modale d'impression */}
      {printModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, maxWidth: '500px', width: '90%', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)', position: 'relative' }}>
            <button aria-label="Fermer" onClick={() => setPrintModalOpen(false)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'red', lineHeight: 0 }}>
              <X size={20} />
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Options d'impression</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input
                  type="radio"
                  name="printOption"
                  checked={printOptions.selectedOption === 'all'}
                  onChange={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'all' }))}
                  style={{ marginRight: 8 }}
                  onClick={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'all' }))}
                />
                Imprimer toutes les pages ({pagination.last_page || 1} pages)
                <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '24px' }}>
                  Total: {pagination.total || 0} éléments
                </div>
              </label>
              
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input
                  type="radio"
                  name="printOption"
                  checked={printOptions.selectedOption === 'specific'}
                  onChange={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'specific', specificPage: page }))}
                  style={{ marginRight: 8 }}
                  onClick={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'specific', specificPage: page }))}
                />
                Imprimer une page spécifique
              </label>
              
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input
                  type="radio"
                  name="printOption"
                  checked={printOptions.selectedOption === 'current'}
                  onChange={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'current' }))}
                  style={{ marginRight: 8 }}
                  onClick={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'current' }))}
                />
                Imprimer la vue actuelle
                <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '24px' }}>
                  Page {page}: 53 éléments (au lieu de {items.length} actuellement affichés)
                </div>
              </label>
              
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input
                  type="radio"
                  name="printOption"
                  checked={printOptions.selectedOption === 'range'}
                  onChange={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'range', fromPage: 1, toPage: pagination.last_page || 1 }))}
                  style={{ marginRight: 8 }}
                  onClick={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'range', fromPage: 1, toPage: pagination.last_page || 1 }))}
                />
                Imprimer une plage de pages
              </label>
              {printOptions.selectedOption === 'range' && (
                <div style={{ marginLeft: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    De la page :
                    <input
                      type="number"
                      min="1"
                      max={pagination.last_page || 1}
                      value={printOptions.fromPage}
                      onChange={(e) => setPrintOptions(prev => ({ ...prev, fromPage: parseInt(e.target.value) || 1 }))}
                      style={{ marginLeft: 8, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: 80 }}
                    />
                    {printOptions.fromPage && (
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        (Éléments {getElementRangeForPage(printOptions.fromPage).start} à {getElementRangeForPage(printOptions.fromPage).end})
                      </span>
                    )}
                  </label>
                  <label>
                    À la page :
                    <input
                      type="number"
                      min="1"
                      max={pagination.last_page || 1}
                      value={printOptions.toPage}
                      onChange={(e) => setPrintOptions(prev => ({ ...prev, toPage: parseInt(e.target.value) || 1 }))}
                      style={{ marginLeft: 8, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: 80 }}
                    />
                    {printOptions.toPage && (
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        (Éléments {getElementRangeForPage(printOptions.toPage).start} à {getElementRangeForPage(printOptions.toPage).end})
                      </span>
                    )}
                  </label>
                </div>
              )}
              
              <label style={{ display: 'block', marginBottom: 12 }}>
                <input
                  type="radio"
                  name="printOption"
                  checked={printOptions.selectedOption === 'pages'}
                  onChange={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'pages', pageRanges: '' }))}
                  style={{ marginRight: 8 }}
                  onClick={() => setPrintOptions(prev => ({ ...prev, selectedOption: 'pages', pageRanges: '' }))}
                />
                Imprimer des pages spécifiques
              </label>
              {printOptions.selectedOption === 'pages' && (
                <div style={{ marginLeft: 24 }}>
                  <label>
                    Pages (ex: 1,3,5-7) :
                    <input
                      type="text"
                      value={printOptions.pageRanges}
                      onChange={(e) => setPrintOptions(prev => ({ ...prev, pageRanges: e.target.value }))}
                      placeholder="1,3,5-7"
                      style={{ marginLeft: 8, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%' }}
                    />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Entrez les numéros de pages séparés par des virgules. Utilisez un tiret pour les plages (ex: 1-5).
                      Chaque page contient 53 éléments (valeur fixe pour l'impression). Total: {pagination.last_page || 1} pages.
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Page 1: éléments 1 à 53, Page 2: éléments 54 à 106, etc.
                    </div>
                  </label>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setPrintModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 4, backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><X size={16} style={{ marginRight: 6 }} /> Annuler</button>
              <button
                onClick={handlePrintWithOptions}
                disabled={isPrinting}
                style={{ padding: '8px 16px', border: 'none', borderRadius: 4, backgroundColor: isPrinting ? '#9ca3af' : '#3b82f6', color: 'white', cursor: isPrinting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isPrinting && (
                  <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                )}
                {isPrinting ? 'Impression en cours...' : <><Printer size={16} style={{ marginRight: 6 }} /> Imprimer</>}
              </button>
            </div>
          </div>
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
            <button onClick={() => setImportModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 4, backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><X size={16} style={{ marginRight: 6 }} /> Annuler</button>
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
              {isImporting ? 'Importation en cours...' : <><Upload size={16} style={{ marginRight: 6 }} /> Importer</>}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}

export default TraitesGrid