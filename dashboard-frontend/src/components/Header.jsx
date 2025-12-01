import React, { useState } from "react"
import "./Header.css"
import { Search, ChevronDown } from "lucide-react"
import NotificationsMenu from "./NotificationsMenu"
import NotificationsBanner from "./NotificationsBanner"
import { useNavigate } from "react-router-dom"

const Header = () => {
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  
  const authHeaders = () => {
    const token = localStorage.getItem("token")
    const headers = { Accept: "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  const runSearch = async () => {
    const query = (q || "").trim().toLowerCase()
    const originalQuery = (q || "").trim()
    
    // route by keyword - ces cas ne nécessitent pas de vérification
    if (query.includes('histor') || query.includes('history')) {
      const params = new URLSearchParams()
      params.set('tab', 'traites')
      params.set('view', 'Historique')
      if (originalQuery) params.set('search', originalQuery)
      navigate(`/dashboard?${params.toString()}`)
      return
    } else if (query.includes('edit') || query.includes('édition') || query.includes('edition')) {
      const params = new URLSearchParams()
      params.set('tab', 'traites')
      params.set('view', 'Edition')
      if (originalQuery) params.set('search', originalQuery)
      navigate(`/dashboard?${params.toString()}`)
      return
    } else if (query.includes('notif')) {
      navigate('/notifications')
      return
    } else if (query.includes('nouvelle') || query.includes('new') || query.includes('créer') || query.includes('creer')) {
      navigate('/traites/new')
      return
    } else if (query.match(/^#?\d+$/)) {
      // direct id navigation: "#123" or "123"
      const id = query.replace('#','')
      navigate(`/traites/${id}`)
      return
    }

    // Pour les recherches normales dans la grille, vérifier d'abord les traites
    if (originalQuery) {
      try {
        const baseUrl = process.env.REACT_APP_API_URL || ""
        const searchParams = new URLSearchParams()
        searchParams.append('search', originalQuery)
        searchParams.append('page', '1')
        searchParams.append('per_page', '1') // On a juste besoin de savoir s'il y a des résultats
        
        const res = await fetch(`${baseUrl}/api/traites?${searchParams.toString()}`, { 
          headers: authHeaders() 
        })
        
        if (res.ok) {
          const data = await res.json()
          // Vérifier le total depuis la pagination Laravel
          const total = data?.total ?? 0
          // Vérifier aussi si data.data est vide (cas de pagination)
          const records = data?.data ?? data ?? []
          const hasResults = total > 0 || (Array.isArray(records) && records.length > 0)
          
          // Si aucun résultat dans les traites, chercher dans les clients
          if (!hasResults) {
            const params = new URLSearchParams()
            params.set('tab', 'traites')
            params.set('view', 'Clients')
            params.set('search', originalQuery)
            navigate(`/dashboard?${params.toString()}`)
            return
          }
        }
      } catch (error) {
        // En cas d'erreur, continuer avec la recherche normale dans les traites
        console.error('Erreur lors de la vérification des traites:', error)
      }
    }

    // Recherche normale dans les traites
    const params = new URLSearchParams()
    params.set('tab', 'traites')
    params.set('view', 'Grille')
    if (originalQuery) params.set('search', originalQuery)
    navigate(`/dashboard?${params.toString()}`)
  }
  return (
    <header className="header">
      <NotificationsBanner />
      <div className="header-left">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="header-center">
        <div className="search-container">
          <input type="text" placeholder="Search..." className="search-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }} />
          <button type="button" className="search-button" onClick={runSearch} aria-label="Rechercher"><Search size={16} /></button>
        </div>
      </div>
      <div className="header-right">
        <NotificationsMenu />
        <div className="user-profile">
          <div className="user-avatar">
            <img src="/logo512.png" alt="User Avatar" />
          </div>
          <span className="user-name">Aiden Max</span>
          <ChevronDown className="dropdown-arrow" size={12} />
        </div>
      </div>
    </header>
  )
}

export default Header
