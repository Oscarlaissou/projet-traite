import React, { useState } from "react"
import "./Header.css"
import { Search, ChevronDown } from "lucide-react"
import NotificationsMenu from "./NotificationsMenu"
import NotificationsBanner from "./NotificationsBanner"
import { useNavigate } from "react-router-dom"

const Header = () => {
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const runSearch = () => {
    const query = (q || "").trim().toLowerCase()
    const params = new URLSearchParams()
    // Default to Traites grid
    params.set('tab', 'traites')
    // route by keyword
    if (query.includes('histor') || query.includes('history')) {
      params.set('view', 'Historique')
    } else if (query.includes('edit') || query.includes('édition') || query.includes('edition')) {
      params.set('view', 'Edition')
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
    } else {
      params.set('view', 'Grille')
    }
    // pass along free text for grid filtering
    if (query) params.set('search', query)
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
          <button className="search-button" onClick={runSearch}><Search size={16} /></button>
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
