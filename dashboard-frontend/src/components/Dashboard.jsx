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
import ClientApprovalHistory from "./ClientApprovalHistory"
import EditRejectedClient from "./EditRejectedClient"
import { useLocation } from "react-router-dom"
import { useAuth } from "../hooks/useAuth" // Import useAuth hook
import "./Dashboard.css"

const Dashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard") // Par défaut à "Dashboard"
  const [activeSubItem, setActiveSubItem] = useState(null) // Par défaut à null
  const [currentSearch, setCurrentSearch] = useState("")
  
  const location = useLocation()
  const { hasPermission } = useAuth() // Get user permissions

  // Déterminer si l'utilisateur peut accéder aux stats du dashboard
  const canAccessDashboardStats = () => {
    return hasPermission('access_dashboard') && 
           (hasPermission('access_traites') && hasPermission('access_clients')) ||
           (hasPermission('access_dashboard') && 
            !hasPermission('access_traites') && 
            !hasPermission('access_clients'));
  }

  // Mettre à jour l'état par défaut en fonction des permissions
  useEffect(() => {
    // Si l'utilisateur peut accéder au dashboard, conserver "Dashboard" comme menu actif
    if (canAccessDashboardStats()) {
      // Ne pas changer l'état par défaut - garder "Dashboard"
      return;
    } 
    // Si l'utilisateur n'a pas accès au dashboard, le rediriger vers la première grille disponible
    else if (hasPermission('access_traites')) {
      setActiveMenuItem("Gestion Traites");
      setActiveSubItem("Grille de saisie");
    } else if (hasPermission('access_clients')) {
      setActiveMenuItem("Credit compte");
      setActiveSubItem("Gestion des comptes clients");
    }
  }, [hasPermission]);

  // Gestion de l'URL pour activer les bons menus
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const view = params.get('view')
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
      else if (view === 'ClientApprovalHistory') setActiveSubItem('ClientApprovalHistory')
      else if (view === 'editRejectedClient') setActiveSubItem('editRejectedClient')
      else setActiveSubItem('Gestion des comptes clients')
    } else if (location.pathname.startsWith('/notifications')) {
      setActiveMenuItem('Gestion Traites')
      setActiveSubItem('Notification')
    }
  }, [location.search, location.pathname])

  // Fonction wrapper pour gérer le changement de menu et le reset des sous-menus
  const handleMenuChange = (newItem) => {
    setActiveMenuItem(newItem)
    // On ne force pas le sous-menu à null ici pour 'Credit compte' car la Sidebar le gère déjà
    if (newItem === "Gestion Traites") {
        setActiveSubItem("Grille de saisie")
    } else if (newItem === "Dashboard") {
        setActiveSubItem(null)
    } else if (newItem === "Credit compte") {
        setActiveSubItem("Gestion des comptes clients")
    }
    // Pour "Credit compte", on laisse la Sidebar ou l'URL décider du sous-menu
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Sidebar 
          activeMenuItem={activeMenuItem} 
          activeSubItem={activeSubItem} 
          setActiveMenuItem={handleMenuChange} 
          setActiveSubItem={setActiveSubItem} 
        />
        
        <div className="main-content">
          <Header />
          <div className="content-area">
            {/* --- ROUTAGE --- */}
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
            
            ) : activeMenuItem === "Dashboard" ? (
              <DashboardStats />
              
            ) : activeMenuItem === "Gestion Traites" ? (
              activeSubItem === "Edition" ? <EditionPage /> : 
              activeSubItem === "Historique" ? <HistoriquePage /> : 
              activeSubItem === "Notification" ? <NotificationsPage /> : 
              activeSubItem === "Grille clients" ? (
                <ClientsGrid key={`clients-grid-${currentSearch}`} searchTerm={currentSearch} />
              ) : (
                <TraitesGrid key={`traites-grid-${currentSearch}`} searchTerm={currentSearch} />
              )
            
            ) : activeMenuItem === "Credit compte" ? (
              activeSubItem === "Gestion des comptes clients" ? (
                <ClientsGrid key={`credit-clients-${currentSearch}`} searchTerm={currentSearch} />
              ) :
              activeSubItem === "Historique clients" ? <ClientsHistoriquePage /> :
              activeSubItem === "Nouveau client" ? <ClientFormPage /> :
              activeSubItem === "PendingClients" ? <PendingClientsGrid /> :
              activeSubItem === "ClientApprovalHistory" ? <ClientApprovalHistory /> :
              activeSubItem === "editRejectedClient" ? <EditRejectedClient /> :
              <ClientsGrid key={`default-clients-${currentSearch}`} searchTerm={currentSearch} />
            ) : (
              // Par défaut, afficher le DashboardStats
              <DashboardStats />
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard