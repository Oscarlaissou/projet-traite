import React, { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Plus, Upload, Download, X } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import Pagination from "./Pagination"
import Can from "./Can"
import "./Traites.css"

// Ajout de la bibliothèque XLSX pour l'export Excel
import * as XLSX from 'xlsx'

const Columns = [
  { key: "nom_raison_sociale", label: "Nom / Raison sociale" },
  { key: "bp", label: "BP" },
  { key: "ville", label: "Ville" },
  { key: "pays", label: "Pays" },
  { key: "categorie", label: "Catégorie" },
]

const DEFAULT_CATEGORIES = [
  "Sté Privées Hors Grp",
  "Société Groupe",
  "Individuel",
  "Personnel Groupe",
  "Administration",
  "Collectivité locale",
  "Entreprise Publique",
  "Administration Privée",
]

// Mapping des catégories pour l'affichage
const CATEGORY_MAPPINGS = {
  "IND=STE": "Sté Privées Hors Grp",
  "HGP": "Sté Privées Hors Grp",
  "ADM": "Administration",
  "COL LOC": "Collectivité locale",
  "ONG": "Administration Privée",
  "IND": "Individuel",
  "PG": "Personnel Groupe"
}

const ClientsGrid = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [printPerPage] = useState(53) // Nombre d'éléments par page pour l'impression
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [sort, setSort] = useState({ key: "nom_raison_sociale", dir: "asc" })
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedPrintRange, setSelectedPrintRange] = useState({ start: 1, end: 1 }) // Plage de pages à imprimer
  const [showPrintModal, setShowPrintModal] = useState(false) // Modal pour sélectionner la plage d'impression
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // États pour l'importation CSV
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRecords, setCsvRecords] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' })
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importController, setImportController] = useState(null)

  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || "", [])

  const authHeaders = () => {
    const token = localStorage.getItem("token")
    const headers = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  const fetchClients = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (appliedSearch.trim()) params.append("search", appliedSearch.trim())
      if (sort?.key) params.append("sort", sort.key)
      if (sort?.dir) params.append("dir", sort.dir)
      params.append("page", String(page))
      params.append("per_page", String(perPage))
      if (selectedCategory) {
        params.append("categorie[]", selectedCategory)
      }

      const response = await fetch(`${baseUrl}/api/tiers?${params.toString()}`, {
        headers: authHeaders(),
      })

      if (!response.ok) {
        throw new Error("Échec du chargement des clients")
      }

      const payload = await response.json()
      const data = payload?.data ?? []

      setItems(Array.isArray(data) ? data : [])
      setPagination({
        current_page: payload?.current_page ?? 1,
        last_page: payload?.last_page ?? 1,
        total: payload?.total ?? data.length,
      })
      if (Array.isArray(payload?.available_categories) && payload.available_categories.length > 0) {
        setAvailableCategories(payload.available_categories)
      }
    } catch (e) {
      setError(e.message || "Erreur inconnue lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (appliedSearch.trim()) params.append("search", appliedSearch.trim())
      if (sort?.key) params.append("sort", sort.key)
      if (sort?.dir) params.append("dir", sort.dir)
      params.append("per_page", "1000")
      if (selectedCategory) {
        params.append("categorie[]", selectedCategory)
      }

      const response = await fetch(`${baseUrl}/api/tiers?${params.toString()}`, {
        headers: authHeaders(),
      })

      if (!response.ok) {
        throw new Error("Export CSV impossible pour le moment")
      }

      const payload = await response.json()
      const data = payload?.data ?? []
      const rows = data.map((row) =>
        Columns.map(({ key }) => {
          const value = row?.[key] ?? ""
          const safeValue = String(value).replace(/"/g, '""')
          return `"${safeValue}"`
        }).join(","),
      )

      const header = Columns.map(({ label }) => label.replace(/"/g, '""')).join(",")
      const csvContent = ["\uFEFF" + header, ...rows].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.message || "Erreur inconnue lors de l'export")
    }
  }

  // Nouvelle fonction pour exporter en Excel
  const exportExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (appliedSearch.trim()) params.append("search", appliedSearch.trim())
      if (sort?.key) params.append("sort", sort.key)
      if (sort?.dir) params.append("dir", sort.dir)
      params.append("per_page", "1000")
      if (selectedCategory) {
        params.append("categorie[]", selectedCategory)
      }

      const response = await fetch(`${baseUrl}/api/tiers?${params.toString()}`, {
        headers: authHeaders(),
      })

      if (!response.ok) {
        throw new Error("Export Excel impossible pour le moment")
      }

      const payload = await response.json()
      const data = payload?.data ?? []
      
      // Créer la feuille de calcul
      const worksheet = XLSX.utils.json_to_sheet(data.map(row => {
        const formattedRow = {}
        Columns.forEach(col => {
          formattedRow[col.label] = row[col.key] ?? ""
        })
        return formattedRow
      }))

      // Ajuster la largeur des colonnes
      const colWidths = Columns.map(col => ({
        wch: Math.max(col.label.length, ...data.map(row => String(row[col.key] ?? "").length))
      }))
      worksheet['!cols'] = colWidths

      // Créer le classeur et y ajouter la feuille
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clients")

      // Télécharger le fichier
      const fileName = `clients_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (e) {
      alert(e.message || "Erreur inconnue lors de l'export Excel")
    }
  }
  
  // Fonction pour imprimer une plage spécifique de pages
  const handlePrint = () => {
    // Calculer le nombre total de pages pour l'impression
    const totalPages = Math.ceil(pagination.total / printPerPage)
    setSelectedPrintRange({ start: 1, end: Math.min(5, totalPages) }) // Par défaut, imprimer les 5 premières pages
    setShowPrintModal(true)
  }
  
  // Fonction pour effectuer l'impression
  const executePrint = async () => {
    try {
      // Fermer le modal
      setShowPrintModal(false)
      
      // Récupérer les données pour la plage de pages sélectionnée
      const printedItems = []
      const { start, end } = selectedPrintRange
      
      for (let pageNum = start; pageNum <= end; pageNum++) {
        const params = new URLSearchParams()
        if (appliedSearch.trim()) params.append("search", appliedSearch.trim())
        if (sort?.key) params.append("sort", sort.key)
        if (sort?.dir) params.append("dir", sort.dir)
        params.append("page", String(pageNum))
        params.append("per_page", String(printPerPage))
        if (selectedCategory) {
          params.append("categorie[]", selectedCategory)
        }
        
        const response = await fetch(`${baseUrl}/api/tiers?${params.toString()}`, {
          headers: authHeaders(),
        })
        
        if (!response.ok) {
          throw new Error("Échec de la récupération des données pour l'impression")
        }
        
        const payload = await response.json()
        const data = payload?.data ?? []
        printedItems.push(...data)
      }
      
      // Créer une nouvelle fenêtre pour l'impression
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <html>
          <head>
            <title>Impression des clients</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              @media print {
                @page { size: A4; margin: 1cm; }
                body { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            <h2>Liste des clients</h2>
            <p>Imprimé le: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>
                  ${Columns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${printedItems.map(item => `
                  <tr>
                    ${Columns.map(col => `<td>${item[col.key] || ''}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                // Fermer la fenêtre après impression
                window.onfocus = function() { 
                  setTimeout(function() { window.close(); }, 500); 
                }
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    } catch (e) {
      alert(e.message || "Erreur lors de la préparation de l'impression")
    }
  }
  
  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleCancelImport = () => {
    // Annuler l'importation en cours
    if (importController) {
      importController.abort()
    }
    setIsImporting(false)
    setImportModalOpen(false)
    // Nettoyer les données d'importation
    setCsvHeaders([])
    setCsvRecords([])
    setColumnMapping({})
    setImportProgress({ current: 0, total: 0, status: '' })
    setImportResult(null)
  }

  // Fonction pour parser le CSV
  const parseCSV = (text) => {
    const separator = text.includes(';') ? ';' : ','
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    
    if (lines.length === 0) {
      return { headers: [], records: [] }
    }
    
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"(.*)"$/, '$1'))
    const records = lines.slice(1).map(line => {
      return line.split(separator).map(field => field.trim().replace(/^"(.*)"$/, '$1'))
    })
    
    return { headers, records }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const { headers, records } = parseCSV(text)
      if (!headers.length || !records.length) throw new Error('CSV vide ou invalide')

      // Mapping automatique des colonnes selon les spécifications fournies
      const autoMapping = {}
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (normalizedHeader.includes('nom') && normalizedHeader.includes('tiers')) {
          autoMapping['nom_raison_sociale'] = header
        } else if (normalizedHeader.includes('type') && !normalizedHeader.includes('tiers')) {
          // Mapping de la colonne 'Type' vers 'categorie'
          autoMapping['categorie'] = header
        } else if (normalizedHeader.includes('adresse') && normalizedHeader.includes('geo')) {
          autoMapping['adresse_geo_1'] = header
        } else if (normalizedHeader.includes('boite') || normalizedHeader.includes('bp')) {
          autoMapping['bp'] = header
        } else if (normalizedHeader.includes('ville')) {
          autoMapping['ville'] = header
        } else if (normalizedHeader.includes('telephone') || normalizedHeader.includes('tel')) {
          autoMapping['telephone'] = header
        } else if (normalizedHeader.includes('date') && normalizedHeader.includes('creation')) {
          autoMapping['date_creation'] = header
        } else if (normalizedHeader.includes('signataire')) {
          autoMapping['nom_signataire'] = header
        } else if (normalizedHeader.includes('general') && normalizedHeader.includes('n')) {
          autoMapping['numero_compte'] = header
        } else if (normalizedHeader.includes('type') && normalizedHeader.includes('tiers')) {
          autoMapping['type_tiers'] = header
        }
      })

      setCsvHeaders(headers)
      setCsvRecords(records)
      setColumnMapping(autoMapping)
      setImportModalOpen(true)
      
    } catch (err) {
      alert(err.message || 'Erreur lors de la lecture du fichier CSV')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  const handleImportConfirm = async () => {
    try {
      setIsImporting(true)
      
      // Créer un contrôleur pour pouvoir annuler l'importation
      const controller = new AbortController()
      setImportController(controller)
      
      // Créer un objet pour envoyer les données mappées
      const mappedData = csvRecords.map((row, index) => {
        const mappedRow = {}
        Object.keys(columnMapping).forEach(field => {
          const csvColumn = columnMapping[field]
          if (csvColumn) {
            const columnIndex = csvHeaders.indexOf(csvColumn)
            if (columnIndex !== -1 && row[columnIndex]) {
              mappedRow[field] = row[columnIndex]
            }
          }
        })
        return mappedRow
      }).filter(row => Object.keys(row).length > 0) // Filtrer les lignes vides
      
      // Mettre à jour la progression
      setImportProgress({ 
        current: 0, 
        total: mappedData.length, 
        status: `Préparation de l'importation de ${mappedData.length} enregistrements...` 
      })
      
      // Envoyer les données au backend avec progression
      const token = localStorage.getItem("token")
      const headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      // Traiter les données par lots pour une meilleure progression
      const batchSize = 50
      let importedCount = 0
      const errors = []
      
      for (let i = 0; i < mappedData.length; i += batchSize) {
        // Vérifier si l'importation a été annulée
        if (controller.signal.aborted) {
          setImportProgress({ 
            current: importedCount, 
            total: mappedData.length, 
            status: `Importation annulée. ${importedCount} enregistrements traités avant l'annulation.` 
          })
          break
        }
        
        const batch = mappedData.slice(i, i + batchSize)
        
        try {
          const response = await fetch(`${baseUrl}/api/tiers/import-csv`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ 
              data: batch,
              duplicate_action: 'update' // Permet d'écraser les données existantes
            }),
            signal: controller.signal // Attacher le signal d'annulation
          })
          
          if (controller.signal.aborted) {
            setImportProgress({ 
              current: importedCount, 
              total: mappedData.length, 
              status: `Importation annulée. ${importedCount} enregistrements traités avant l'annulation.` 
            })
            break
          }
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`Import échoué: ${errorData.message || response.statusText}`)
          }
          
          const result = await response.json()
          importedCount += result.created + result.updated
          
          // Mettre à jour la progression
          setImportProgress({ 
            current: Math.min(i + batchSize, mappedData.length), 
            total: mappedData.length, 
            status: `Importation en cours... ${importedCount} enregistrements traités` 
          })
          
          // Ajouter les erreurs éventuelles
          if (result.errors && result.errors.length > 0) {
            errors.push(...result.errors)
          }
        } catch (batchError) {
          if (batchError.name === 'AbortError') {
            // L'importation a été annulée
            setImportProgress({ 
              current: importedCount, 
              total: mappedData.length, 
              status: `Importation annulée. ${importedCount} enregistrements traités avant l'annulation.` 
            })
            break
          }
          
          console.error('Erreur lors de l\'importation du lot:', batchError)
          errors.push(`Lot ${Math.floor(i/batchSize) + 1}: ${batchError.message}`)
        }
      }
      
      // Résumé final
      setImportResult({ 
        created: importedCount,
        updated: 0,
        skipped: 0,
        errors: errors
      })
      
      if (!controller.signal.aborted) {
        setImportProgress({ 
          current: mappedData.length, 
          total: mappedData.length, 
          status: `Importation terminée! ${importedCount} enregistrements traités${errors.length > 0 ? `, ${errors.length} erreurs` : ''}` 
        })
      }
      
      // Fermer la modale après 2 secondes et rafraîchir les données
      setTimeout(() => {
        if (!controller.signal.aborted) {
          setImportModalOpen(false)
          setIsImporting(false)
          // Nettoyer les données d'importation
          setCsvHeaders([])
          setCsvRecords([])
          setColumnMapping({})
          setImportProgress({ current: 0, total: 0, status: '' })
          setImportResult(null)
          fetchClients()
        }
      }, 2000)
      
    } catch (err) {
      console.error('Erreur d\'importation:', err)
      setIsImporting(false)
      setImportProgress({ current: 0, total: 0, status: `Erreur: ${err.message}` })
    }
  }

  const handleHeaderSort = (key) => {
    setPage(1)
    setSort((current) => {
      if (current.key === key) {
        return { key, dir: current.dir === "asc" ? "desc" : "asc" }
      }
      return { key, dir: "asc" }
    })
  }

  const resetFilters = () => {
    setSearch("")
    setAppliedSearch("")
    setSelectedCategory("")
    setSort({ key: "nom_raison_sociale", dir: "asc" })
    setPage(1)
  }

  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, sort, selectedCategory, appliedSearch])

  // Appliquer les filtres depuis l'URL quand on arrive depuis le dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const view = params.get('view')
    if (tab === 'traites' && view === 'Clients') {
      const urlSearch = params.get('search') || ''
      if (urlSearch && urlSearch !== search) {
        setSearch(urlSearch)
        setAppliedSearch(urlSearch)
        setPage(1)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  return (
    <div className="dashboard-stats">
      <button
        className="icon-button"
        onClick={() => {
          resetFilters()
        }}
        aria-label="Réinitialiser"
        style={{ marginBottom: 8, color: "red" }}
      >
        <ArrowLeft size={18} />
      </button>

      <h2 className="stats-title">Grille des comptes clients</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1)
              setAppliedSearch(e.target.value.trim())
            }
          }}
          className="search-input"
          style={{ maxWidth: 260 }}
        />
        <select
          className="search-input"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setPage(1)
          }}
          style={{ minWidth: 220 }}
        >
          <option value="">Toutes catégories</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          className="submit-button"
          onClick={() => {
            setPage(1)
            setAppliedSearch(search.trim())
          }}
        >
          Rechercher
        </button>
        <Can permission="create_clients">
          <button className="submit-button" onClick={() => navigate('/dashboard?tab=credit&view=NewClient')}>
            <Plus size={16} style={{ marginRight: 6 }} /> Nouveau compte client
          </button>
        </Can>
       
        {/* <button className="submit-button" onClick={exportCSV}>
          <Download size={16} style={{ marginRight: 6 }} /> Exporter CSV
        </button> */}
        <Can permission="view_clients">
          <button className="submit-button" onClick={exportExcel}>
            <Download size={16} style={{ marginRight: 6 }} /> Exporter Excel
          </button>
        </Can>
        <Can permission="view_clients">
          <button className="submit-button" onClick={handlePrint}>
            <Download size={16} style={{ marginRight: 6 }} /> Imprimer
          </button>
        </Can>
        <Can permission="create_clients">
          <button className="submit-button" onClick={handleImportClick}>
            <Upload size={16} style={{ marginRight: 6 }} /> Importer CSV
          </button>
        </Can>
        <Can permission="create_clients">
          <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFileChange} />
        </Can>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="table-basic">
            <thead>
              <tr>
                {Columns.map((col) => {
                  const isSortable = ["nom_raison_sociale", "bp", "ville", "pays", "categorie"].includes(col.key)
                  const isActive = sort.key === col.key
                  const arrow = isActive ? (sort.dir === "asc" ? " ↑" : " ↓") : ""
                  return (
                    <th
                      key={col.key}
                      style={{
                        textAlign: "left",
                        padding: 8,
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                        cursor: isSortable ? "pointer" : "default",
                      }}
                      onClick={() => isSortable && handleHeaderSort(col.key)}
                    >
                      {col.label}
                      {arrow}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={Columns.length} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
                    Aucun compte client trouvé avec les critères actuels.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr 
                    key={row.id ?? row.nom_raison_sociale}
                    onClick={() => navigate(`/clients/${row.id}`)}
                    style={{ cursor: "pointer" }}
                    className="clickable-row"
                  >
                    {Columns.map((col) => (
                      <td key={col.key} style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                        {row?.[col.key] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
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
          </table>
        </div>
      )}

      {/* Modale d'importation CSV */}
      {importModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)', position: 'relative' }}>
            <button aria-label="Fermer" onClick={() => setImportModalOpen(false)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'red', lineHeight: 0 }}>
              <X size={20} />
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Importation CSV des clients</h3>
            
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

            <div style={{ marginBottom: 20 }}>
              <h4>Mapping des colonnes :</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'nom_raison_sociale', label: 'Nom / Raison sociale (Nom tiers)' },
                  { key: 'categorie', label: 'Catégorie (Type)' },
                  { key: 'adresse_geo_1', label: 'Adresse géographique 1' },
                  { key: 'bp', label: 'Boîte postale' },
                  { key: 'ville', label: 'Ville' },
                  { key: 'telephone', label: 'Téléphone' },
                  { key: 'date_creation', label: 'Date de création' },
                  { key: 'nom_signataire', label: 'Nom du signataire' },
                  { key: 'type_tiers', label: 'Type tiers' }
                ].map(field => (
                  <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ minWidth: 180, fontSize: '14px' }}>{field.label}:</label>
                    <select 
                      value={columnMapping[field.key] || ''} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
                    >
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
                      {csvRecords.slice(0, 3).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={{ padding: '4px 8px', border: '1px solid #d1d5db' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
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

            {importResult && (
              <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4 }}>
                <h4>Résultat de l'importation :</h4>
                <p>
                  {importResult.created} clients créés, {importResult.updated} mis à jour, {importResult.skipped} ignorés
                  {importResult.errors && importResult.errors.length > 0 && (
                    <span>, {importResult.errors.length} erreurs</span>
                  )}
                </p>
              </div>
            )}

            {importResult && importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4 }}>
                <h4>Erreurs d'importation :</h4>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>
                      {error}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                      ... et {importResult.errors.length - 10} autres erreurs
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={handleCancelImport} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 4, backgroundColor: 'white', cursor: 'pointer' }}>Annuler</button>
              <button
                onClick={handleImportConfirm}
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
      
      {/* Modale de sélection de plage d'impression */}
      {showPrintModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)', position: 'relative' }}>
            <button aria-label="Fermer" onClick={() => setShowPrintModal(false)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: 'red', lineHeight: 0 }}>
              <X size={20} />
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Sélection de la plage d'impression</h3>
            
            <div style={{ marginBottom: 20 }}>
              <p>Nombre total de pages disponibles : {Math.ceil(pagination.total / printPerPage)}</p>
              <p>Nombre total d'éléments : {pagination.total}</p>
            </div>
            
            <div style={{ marginBottom: 20, display: 'flex', gap: 20 }}>
              <div>
                <label>Page de début :</label>
                <input 
                  type="number" 
                  min="1" 
                  max={Math.ceil(pagination.total / printPerPage)}
                  value={selectedPrintRange.start}
                  onChange={(e) => setSelectedPrintRange(prev => ({ ...prev, start: parseInt(e.target.value) || 1 }))}
                  style={{ width: '100px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, marginLeft: '8px' }}
                />
              </div>
              <div>
                <label>Page de fin :</label>
                <input 
                  type="number" 
                  min="1" 
                  max={Math.ceil(pagination.total / printPerPage)}
                  value={selectedPrintRange.end}
                  onChange={(e) => setSelectedPrintRange(prev => ({ ...prev, end: parseInt(e.target.value) || 1 }))}
                  style={{ width: '100px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, marginLeft: '8px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPrintModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 4, backgroundColor: 'white', cursor: 'pointer' }}>Annuler</button>
              <button
                onClick={executePrint}
                style={{ padding: '8px 16px', border: 'none', borderRadius: 4, backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientsGrid
