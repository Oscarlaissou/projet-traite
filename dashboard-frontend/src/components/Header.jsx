import React, { useState } from "react"
import "./Header.css"
import { Search } from "lucide-react"
import NotificationsMenu from "./NotificationsMenu"
import NotificationsBanner from "./NotificationsBanner"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth" // Import useAuth hook

const Header = () => {
  const navigate = useNavigate()
  const { user } = useAuth() // Get user from auth context
  const [q, setQ] = useState("")
  
  console.log('Header - user:', user)
  
  const handleSubmit = (e) => {
    e.preventDefault(); // Empêcher le rechargement de la page
    runSearch();
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

    // Pour les recherches normales, toujours aller dans la grille des traites
    // avec les paramètres de recherche
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
        <form onSubmit={handleSubmit} className="search-container">
          <input 
            type="text" 
            placeholder="Search..." 
            className="search-input" 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            onKeyDown={(e) => { 
              if (e.key === 'Enter') {
                e.preventDefault(); // Empêcher le rechargement de la page
                runSearch();
              }
            }} 
          />
          <button 
            type="submit" 
            className="search-button" 
            onClick={(e) => {
              e.preventDefault(); // Empêcher le rechargement de la page
              runSearch();
            }} 
            aria-label="Rechercher"
          >
            <Search size={16} />
          </button>
        </form>
      </div>
      <div className="header-right">
        <NotificationsMenu />
        <div className="user-profile">
          <div className="user-avatar">
            <img src="/person.png" alt="User Avatar" />
          </div>
          <span className="user-name">Bienvenue, {user?.username || 'Utilisateur'}</span>
          
        </div>
      </div>
    </header>
  )
}

export default Header