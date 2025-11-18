import React, { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Plus, Upload, Download } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import Pagination from "./Pagination"
import "./Traites.css"

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

const ClientsGrid = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [sort, setSort] = useState({ key: "nom_raison_sociale", dir: "asc" })
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

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
  
  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
      const headers = (lines[0] || "").split(/[;,]/).map(h => h.trim())
      const count = Math.max(0, lines.length - 1)
      alert(`Fichier CSV détecté.\nColonnes: ${headers.join(", ")}\nEnregistrements: ${count}\n\nL'import côté serveur n'est pas encore activé pour les clients.`)
    } catch (err) {
      alert(err?.message || "Erreur lors de la lecture du fichier CSV")
    } finally {
      if (importInputRef.current) importInputRef.current.value = ""
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
        <button className="submit-button" onClick={() => navigate('/dashboard?tab=credit&view=NewClient')}>
          <Plus size={16} style={{ marginRight: 6 }} /> Nouveau compte client
        </button>
       
        <button className="submit-button" onClick={exportCSV}>
          <Download size={16} style={{ marginRight: 6 }} /> Exporter CSV
        </button>
        <button className="submit-button" onClick={handleImportClick}>
          <Upload size={16} style={{ marginRight: 6 }} /> Importer CSV
        </button>
        <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFileChange} />
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
    </div>
  )
}

export default ClientsGrid