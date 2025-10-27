import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, ArrowLeft } from "lucide-react"
import { formatMoney } from "../utils/format"
import Pagination from './Pagination'
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

  const exportCSV = async () => {
    try {
      console.log('Début de l\'exportation CSV...')
      // Récupérer TOUTES les données sans pagination pour l'export
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statut) params.append('statut', statut)
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      if (sort?.key) params.append('sort', sort.key)
      if (sort?.dir) params.append('dir', sort.dir)
      params.append('per_page', '1000') // Récupérer jusqu'à 1000 éléments
      
      const url = `${baseUrl}/api/traites?${params.toString()}`
      console.log('URL de l\'API:', url)
      
      const res = await fetch(url, { headers: authHeaders() })
      console.log('Réponse de l\'API:', res.status, res.statusText)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Erreur API:', errorText)
        throw new Error(`Erreur lors du chargement des données pour export: ${res.status} ${res.statusText}`)
      }
      
      const data = await res.json()
      console.log('Données reçues:', data)
      const allItems = data.data || data || []
      console.log('Nombre d\'éléments à exporter:', allItems.length)
      
      const headerKeys = Columns.map(c => c.key)
      const headerLabels = Columns.map(c => c.label)
      console.log('Clés des colonnes:', headerKeys)
      console.log('Labels des colonnes:', headerLabels)
      console.log('Premier élément de données:', allItems[0])
      
      // Vérifier spécifiquement le champ numero
      console.log('Vérification du champ numero:')
      allItems.forEach((item, index) => {
        console.log(`Élément ${index}: numero = "${item.numero}"`)
      })
      
      const rows = allItems.map(it => headerKeys.map(k => {
        let v = it[k]
        if (k === 'numero') {
          console.log(`Champ numero trouvé: "${v}"`)
        }
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
      
      console.log('Première ligne CSV:', rows[0])
      
      // Ajouter BOM UTF-8 pour assurer la compatibilité avec Excel
      const csv = '\uFEFF' + [headerLabels.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url_download = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url_download
      a.download = `traites_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url_download)
      
      console.log('Exportation CSV terminée avec succès')
    } catch (e) {
      console.error('Erreur lors de l\'exportation:', e)
      alert(e.message || 'Export CSV échoué')
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const parseCSV = (text) => {
    console.log('=== DÉBUT PARSING CSV AVEC GUILLEMETS ===')
    
    // Force semicolon separator for CFAO data
    const separator = ';'
    console.log(`Utilisation du séparateur point-virgule pour les données CFAO`)
    
    // Parse CSV with proper handling of quotes and multiline content
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
            // Escaped quote
            currentField += '"'
            i += 2
            continue
          } else {
            // Toggle quote state
            inQuotes = !inQuotes
          }
        } else if (char === separator && !inQuotes) {
          // End of field
          currentRow.push(currentField.trim())
          currentField = ''
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          // End of row (but not if we're inside quotes)
          if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField.trim())
            if (currentRow.some(field => field !== '')) {
              rows.push(currentRow)
            }
            currentRow = []
            currentField = ''
          }
          // Skip \r\n
          if (char === '\r' && nextChar === '\n') {
            i++
          }
        } else {
          // Regular character
          currentField += char
        }
        i++
      }
      
      // Add last field and row if exists
      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim())
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow)
        }
      }
      
      return rows
    }
    
    const rows = parseCSVWithQuotes(text)
    console.log('Nombre de lignes parsées:', rows.length)
    
    if (rows.length === 0) {
      return { headers: [], records: [] }
    }
    
    // First row is headers
    const headers = rows[0]
    console.log('Headers détectés:', headers)
    console.log('Nombre de colonnes attendues:', headers.length)
    
    // Rest are data rows
    const records = rows.slice(1).map((row, index) => {
      console.log(`\n=== Traitement ligne ${index + 2} ===`)
      console.log(`Row brute:`, row)
      
      // Ensure row has same length as headers
      const record = new Array(headers.length).fill('')
      row.forEach((field, fieldIndex) => {
        if (fieldIndex < headers.length) {
          record[fieldIndex] = field
        }
      })
      
      console.log(`Record final:`, record)
      console.log(`Correspondance:`, headers.map((header, i) => `${header}: "${record[i]}"`))
      
      return record
    })
    
    console.log('\n=== RÉSUMÉ DU PARSING ===')
    console.log('Headers:', headers)
    console.log('Nombre de colonnes:', headers.length)
    console.log('Nombre de lignes de données:', records.length)
    records.forEach((record, index) => {
      console.log(`Ligne ${index + 2}:`, record)
    })
    
    return { headers, records }
  }

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRecords, setCsvRecords] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' })
  const [duplicates, setDuplicates] = useState({ csvDuplicates: [], existingDuplicates: [] })
  const [duplicateAction, setDuplicateAction] = useState('skip') // 'skip', 'replace', 'import_all'
  const [isImporting, setIsImporting] = useState(false)

  // Mapping des colonnes CSV vers les champs de la base de données
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

  // Fonction pour détecter les doublons
  const detectDuplicates = async (headers, records, columnMapping) => {
    console.log('=== DÉTECTION DES DOUBLONS ===')
    console.log('headers:', headers)
    console.log('records:', records)
    console.log('columnMapping:', columnMapping)
    
    const csvDuplicates = []
    const existingDuplicates = []
    
    // Détecter les doublons dans le CSV lui-même (basé sur nombre de traites + montant)
    const numeroIndex = headers.findIndex(h => columnMapping.numero === h)
    const nbTraitesIndex = headers.findIndex(h => columnMapping.nombre_traites === h)
    const montantIndex = headers.findIndex(h => columnMapping.montant === h)
    
    console.log('numeroIndex:', numeroIndex)
    console.log('nbTraitesIndex:', nbTraitesIndex)
    console.log('montantIndex:', montantIndex)
    console.log('columnMapping.numero:', columnMapping.numero)
    console.log('columnMapping.nombre_traites:', columnMapping.nombre_traites)
    console.log('columnMapping.montant:', columnMapping.montant)
    
    if (numeroIndex !== -1 && nbTraitesIndex !== -1 && montantIndex !== -1) {
      const seenTraites = new Map() // Utiliser Map pour stocker nbTraites + montant comme clé
      
      records.forEach((record, index) => {
        const numero = record[numeroIndex]?.trim()
        const nbTraites = parseInt(record[nbTraitesIndex]) || 0
        const montant = parseFloat(record[montantIndex]) || 0
        
        console.log(`Ligne ${index + 2}: numero = "${numero}", nbTraites = ${nbTraites}, montant = ${montant}`)
        
        if (nbTraites > 0 && montant > 0) {
          const cleTraite = `${nbTraites}_${montant}` // Clé composite comme dans le backend
          
          if (seenTraites.has(cleTraite)) {
            csvDuplicates.push({ 
              line: index + 2, 
              numero, 
              nbTraites,
              montant,
              type: 'csv',
              reason: `Doublon par nombre de traites (${nbTraites}) et montant (${montant})`
            })
            console.log(`Doublon CSV détecté: ligne ${index + 2}, numero "${numero}", nbTraites ${nbTraites}, montant ${montant}`)
          } else {
            seenTraites.set(cleTraite, { line: index + 2, numero })
          }
        }
      })
    } else {
      console.log('ERREUR: Colonnes requises non trouvées dans le mapping')
      if (numeroIndex === -1) console.log('Colonne numero manquante')
      if (nbTraitesIndex === -1) console.log('Colonne nombre_traites manquante')
      if (montantIndex === -1) console.log('Colonne montant manquante')
    }
    
    // Détecter les doublons avec les données existantes
    try {
      console.log('Vérification des doublons existants...')
      const res = await fetch(`${baseUrl}/api/traites?per_page=1000`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const existingTraites = data.data || data || []
        
        // Créer un Set des combinaisons nbTraites + montant existantes
        const existingTraitesKeys = new Set(
          existingTraites
            .filter(t => t.nombre_traites > 0 && t.montant > 0)
            .map(t => `${t.nombre_traites}_${t.montant}`)
        )
        console.log('existingTraitesKeys:', existingTraitesKeys)
        
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
              console.log(`Doublon existant détecté: ligne ${index + 2}, numero "${numero}", nbTraites ${nbTraites}, montant ${montant}`)
            }
          }
        })
      } else {
        console.log('Erreur lors de la récupération des traites existantes:', res.status)
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des doublons existants:', error)
    }
    
    console.log('csvDuplicates:', csvDuplicates)
    console.log('existingDuplicates:', existingDuplicates)
    
    return { csvDuplicates, existingDuplicates }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const { headers, records } = parseCSV(text)
      if (!headers.length || !records.length) throw new Error('CSV vide ou invalide')

      // Auto-mapper les colonnes avec parsing amélioré
      const autoMapping = {}
      console.log('=== MAPPING AUTOMATIQUE ===')
      console.log('Headers détectés:', headers)
      console.log('Headers disponibles pour mapping:', headers.map((h, i) => `${i}: "${h}"`))
      
      Object.keys(fieldMappings).forEach(field => {
        const possibleNames = fieldMappings[field]
        console.log(`\n--- Recherche du champ ${field} ---`)
        console.log(`Noms possibles:`, possibleNames)
        
        for (const name of possibleNames) {
          // Recherche exacte d'abord
          let index = headers.findIndex(h => h === name)
          console.log(`Recherche exacte "${name}":`, index !== -1 ? `✅ Trouvé à l'index ${index}` : '❌ Non trouvé')
          
          // Si pas trouvé, recherche insensible à la casse
          if (index === -1) {
            index = headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
            console.log(`Recherche insensible à la casse "${name}":`, index !== -1 ? `✅ Trouvé à l'index ${index}` : '❌ Non trouvé')
          }
          
          // Si pas trouvé, recherche partielle
          if (index === -1) {
            index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(h.toLowerCase()))
            console.log(`Recherche partielle "${name}":`, index !== -1 ? `✅ Trouvé à l'index ${index}` : '❌ Non trouvé')
          }
          
          if (index !== -1) {
            autoMapping[field] = headers[index] // Garder le nom original
            console.log(`✅ Champ ${field} mappé vers "${headers[index]}" (index ${index})`)
            break
          }
        }
        
        if (!autoMapping[field]) {
          console.log(`❌ Champ ${field} non mappé - sera laissé vide`)
        }
      })
      
      console.log('Mapping final:', autoMapping)

      // Détecter les doublons
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
      console.log('=== DÉBUT IMPORTATION ===')
      console.log('csvRecords:', csvRecords)
      console.log('csvHeaders:', csvHeaders)
      console.log('columnMapping:', columnMapping)
      console.log('duplicates:', duplicates)
      console.log('duplicateAction:', duplicateAction)
      
      setIsImporting(true)
      setImportProgress({ current: 0, total: csvRecords.length, status: 'Préparation de l\'importation...' })
      
      const token = localStorage.getItem('token')
      const headersReq = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      if (token) headersReq['Authorization'] = `Bearer ${token}`

      // Créer un mapping des colonnes vers les indices
      const headerToIndex = csvHeaders.reduce((acc, h, i) => { acc[h] = i; return acc }, {})
      console.log('headerToIndex:', headerToIndex)
      
      const toVal = (row, fieldName) => {
        const mappedColumn = columnMapping[fieldName]
        if (!mappedColumn) {
          console.log(`⚠️ Champ ${fieldName} non mappé`)
          return ''
        }
        const idx = headerToIndex[mappedColumn]
        const value = idx != null ? row[idx] : ''
        console.log(`📋 ${fieldName} (${mappedColumn}): "${value}"`)
        return value
      }

      // Préparer les données à importer - le backend gère maintenant les doublons
      const dataToImport = []
      
      console.log('\n=== PRÉPARATION DES DONNÉES POUR IMPORTATION ===')
      console.log('Nombre de lignes à traiter:', csvRecords.length)
      
      for (let i = 0; i < csvRecords.length; i++) {
        const row = csvRecords[i]
        
        console.log(`\n--- Traitement ligne ${i + 1} ---`)
        console.log('Row data:', row)
        
        const payload = {
          numero: toVal(row, 'numero'),
          nombre_traites: Number((toVal(row, 'nombre_traites') || '1').replace(/\D+/g, '')) || 1,
          echeance: toVal(row, 'echeance'),
          date_emission: toVal(row, 'date_emission'),
          montant: Number(String(toVal(row, 'montant') || '').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
          nom_raison_sociale: toVal(row, 'nom_raison_sociale'),
          domiciliation_bancaire: toVal(row, 'domiciliation_bancaire'),
          rib: toVal(row, 'rib'),
          motif: toVal(row, 'motif') || '', // Laisser vide si non mappé
          commentaires: toVal(row, 'commentaires') || '', // Laisser vide si non mappé
          statut: toVal(row, 'statut') || '', // Laisser vide si non mappé
        }
        
        console.log(`✅ Payload ligne ${i + 1}:`, payload)
        dataToImport.push(payload)
      }
      
      console.log('dataToImport:', dataToImport)
      console.log('Nombre d\'éléments à importer:', dataToImport.length)
      
      // Vérifier la taille des données
      const dataSize = JSON.stringify(dataToImport).length
      console.log('Taille des données:', dataSize, 'bytes (' + Math.round(dataSize / 1024 / 1024 * 100) / 100 + ' MB)')
      
      setImportProgress({ current: 0, total: dataToImport.length, status: 'Importation en cours...' })
      
      // Utiliser la route de test temporaire
      const requestBody = { 
        data: dataToImport, 
        duplicate_action: duplicateAction 
      }
      console.log('Request body:', requestBody)
      
      const res = await fetch(`${baseUrl}/api/traites/import-csv`, { 
        method: 'POST', 
        headers: headersReq, 
        body: JSON.stringify(requestBody) 
      })
      
      console.log('Response status:', res.status)
      console.log('Response headers:', res.headers)
      
      if (!res.ok) {
        const msg = await res.text()
        console.error('Erreur API:', msg)
        throw new Error(`Import échoué: ${msg}`)
      }
      
      const result = await res.json()
      console.log('Result:', result)
      
      let statusMessage = `Importation terminée! ${result.imported} traites importées`
      if (result.skipped > 0) {
        statusMessage += `, ${result.skipped} doublons ignorés`
      }
      if (result.errors && result.errors.length > 0) {
        statusMessage += `, ${result.errors.length} erreurs`
      }
      
      setImportProgress({ current: dataToImport.length, total: dataToImport.length, status: statusMessage })
      
      setTimeout(() => {
        setImportModalOpen(false)
        setIsImporting(false)
        fetchItems()
      }, 2000)
      
    } catch (err) {
      console.error('Erreur importation:', err)
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
      {/* Indicateur de chargement global */}
      {isImporting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #ffffff',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <h3 style={{ margin: 0, fontSize: '18px' }}>Importation en cours...</h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
            {importProgress.status || 'Traitement des données...'}
          </p>
          {importProgress.total > 0 && (
            <div style={{ marginTop: '20px', width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{importProgress.current} / {importProgress.total}</span>
                <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: '4px', height: '8px' }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  height: '100%',
                  borderRadius: '4px',
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
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
        </div>
      )}
      
      {/* Modal d'importation CSV */}
    {importModalOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 24,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 20 }}>Configuration de l'importation CSV</h3>
          
          {/* Aperçu des données */}
          <div style={{ marginBottom: 20 }}>
            <h4>Colonnes détectées dans le fichier CSV :</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {csvHeaders.map((header, index) => (
                <span key={index} style={{
                  backgroundColor: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: '12px',
                  border: '1px solid #d1d5db'
                }}>
                  {header}
                </span>
              ))}
            </div>
          </div>

          {/* Détection des doublons */}
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
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Action pour les doublons :
                </label>
                <select
                  value={duplicateAction}
                  onChange={(e) => setDuplicateAction(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%' }}
                >
                  <option value="skip">Ignorer les doublons (recommandé)</option>
                  <option value="import_all">Importer tous les enregistrements</option>
                </select>
              </div>
            </div>
          )}

          {/* Mapping des colonnes */}
          <div style={{ marginBottom: 20 }}>
            <h4>Mapping des colonnes :</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.keys(fieldMappings).map(field => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ minWidth: 120, fontSize: '14px' }}>
                    {Columns.find(c => c.key === field)?.label || field}:
                  </label>
                  <select
                    value={columnMapping[field] || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
                  >
                    <option value="">-- Non mappé --</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu des données */}
          {csvRecords.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4>Aperçu des données (3 premières lignes) :</h4>
              <div style={{ overflow: 'auto', maxHeight: 200, border: '1px solid #d1d5db', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      {csvHeaders.map((header, index) => (
                        <th key={index} style={{ padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRecords.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} style={{ padding: '4px 8px', border: '1px solid #d1d5db' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progression de l'importation */}
          {importProgress.total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4>Progression de l'importation :</h4>
              <div style={{ backgroundColor: '#f3f4f6', borderRadius: 4, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>{importProgress.status}</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div style={{ backgroundColor: '#e5e7eb', borderRadius: 4, height: 8 }}>
                  <div style={{
                    backgroundColor: '#10b981',
                    height: '100%',
                    borderRadius: 4,
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setImportModalOpen(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => {
                console.log('=== CLIC BOUTON IMPORTER ===')
                console.log('columnMapping:', columnMapping)
                console.log('csvHeaders:', csvHeaders)
                console.log('csvRecords:', csvRecords)
                
                // Vérifier que les champs requis sont mappés
                const requiredFields = ['numero', 'nombre_traites', 'echeance', 'date_emission', 'montant', 'nom_raison_sociale']
                const missingFields = requiredFields.filter(field => !columnMapping[field])
                
                if (missingFields.length > 0) {
                  alert(`Champs requis non mappés: ${missingFields.join(', ')}`)
                  return
                }
                
                handleImportConfirm()
              }}
              disabled={isImporting}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 4,
                backgroundColor: isImporting ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: isImporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isImporting && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
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


