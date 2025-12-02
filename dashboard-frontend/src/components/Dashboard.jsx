"use client"

import React, { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import DashboardStats from "./DashboardStats"
import Header from "./Header"
import TraitesGrid from "./TraitesGrid"
import ClientsGrid from "./ClientsGrid"
import ClientFormPage from "./ClientFormPage"
import ClientsHistoriquePage from "./ClientsHistoriquePage"
import ClientDetailPage from "./ClientDetailPage"
import EditionPage from "./EditionPage"
import HistoriquePage from "./HistoriquePage"
import TraiteFormPage from "./TraiteFormPage"
import TraiteDetailPage from "./TraiteDetailPage"
import PendingClientsGrid from "./PendingClientsGrid"
import NotificationsPage from "./NotificationsPage"
import Can from "./Can"
import { useLocation } from "react-router-dom"
import "./Dashboard.css"

const Dashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard")
  const [activeSubItem, setActiveSubItem] = useState(null)
  
  // 1. État pour stocker la recherche actuelle
  const [currentSearch, setCurrentSearch] = useState("")

  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const view = params.get('view')
    
    // 2. On récupère la valeur de recherche de l'URL
    const searchParam = params.get('search') || ""
    setCurrentSearch(searchParam)

    if (tab === 'traites') {
      setActiveMenuItem('Gestion Traites')
      if (view === 'Edition') setActiveSubItem('Edition')
      else if (view === 'Historique') setActiveSubItem('Historique')
      else if (view === 'Notification') setActiveSubItem('Notification')
      else if (view === 'Clients') setActiveSubItem('Grille clients')
      else setActiveSubItem('Grille de saisie')
    } else if (tab === 'credit') {
      setActiveMenuItem('Credit compte')
      if (view === 'GestionClients') setActiveSubItem('Gestion des comptes clients')
      else if (view === 'HistoriqueClients') setActiveSubItem('Historique clients')
      else if (view === 'NewClient') setActiveSubItem('Nouveau client')
      else if (view === 'PendingClients') setActiveSubItem('PendingClients')
      else setActiveSubItem('Gestion des comptes clients')
    } else if (location.pathname.startsWith('/notifications')) {
      setActiveMenuItem('Gestion Traites')
      setActiveSubItem('Notification')
    }
  }, [location.search, location.pathname])

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Sidebar 
          activeMenuItem={activeMenuItem} 
          activeSubItem={activeSubItem} 
          setActiveMenuItem={(item) => { 
            setActiveMenuItem(item); 
            if (item === "Gestion Traites") setActiveSubItem("Grille de saisie"); 
            else setActiveSubItem(null) 
          }} 
          setActiveSubItem={setActiveSubItem} 
        />
        
        <div className="main-content">
          <Header />
          <div className="content-area">
            {/* --- ROUTAGE BASÉ SUR L'URL (Routes spécifiques) --- */}
            {location.pathname.startsWith('/traites/new') || location.pathname.match(/^\/traites\/\d+\/edit$/) ? (
              <TraiteFormPage />
            ) : location.pathname.match(/^\/traites\/\d+$/) ? (
              <TraiteDetailPage />
            ) : location.pathname.match(/^\/clients\/\d+\/edit$/) ? (
              <ClientFormPage key={location.pathname} />
            ) : location.pathname.match(/^\/clients\/\d+$/) ? (
              <ClientDetailPage />
            ) : location.pathname.startsWith('/clients/new') ? (
              <ClientFormPage key={location.pathname} />
            ) : location.pathname.startsWith('/notifications') ? (
              <NotificationsPage />
            
            /* --- ROUTAGE BASÉ SUR LE MENU (Dashboard / Grilles) --- */
            ) : activeMenuItem === "Dashboard" ? (
              <DashboardStats />
            
            ) : activeMenuItem === "Gestion Traites" ? (
              activeSubItem === "Edition" ? <EditionPage /> : 
              activeSubItem === "Historique" ? <HistoriquePage /> : 
              activeSubItem === "Notification" ? <NotificationsPage /> : 
              activeSubItem === "Grille clients" ? (
                // 3. ICI : Ajout de key et searchTerm pour forcer le rafraîchissement
                <ClientsGrid 
                  key={`clients-grid-${currentSearch}`} 
                  searchTerm={currentSearch} 
                />
              ) : (
                // 3. ICI : Pareil pour TraitesGrid
                <TraitesGrid 
                  key={`traites-grid-${currentSearch}`} 
                  searchTerm={currentSearch} 
                />
              )
            
            ) : activeMenuItem === "Credit compte" ? (
              activeSubItem === "Gestion des comptes clients" ? (
                <ClientsGrid 
                  key={`credit-clients-${currentSearch}`} 
                  searchTerm={currentSearch} 
                />
              ) :
              activeSubItem === "Historique clients" ? <ClientsHistoriquePage /> :
              activeSubItem === "Nouveau client" ? <ClientFormPage /> :
              activeSubItem === "PendingClients" ? <PendingClientsGrid /> :
              <ClientsGrid 
                 key={`default-clients-${currentSearch}`} 
                 searchTerm={currentSearch} 
              />
            ) : null}
            
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard