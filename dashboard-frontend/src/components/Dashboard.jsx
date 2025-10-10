"use client"

import React from "react"
import { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import DashboardStats from "./DashboardStats"
import Header from "./Header"
import TraitesGrid from "./TraitesGrid"
import EditionPage from "./EditionPage"
import HistoriquePage from "./HistoriquePage"
import TraiteFormPage from "./TraiteFormPage"
import TraiteDetailPage from "./TraiteDetailPage"
import { useLocation } from "react-router-dom"
import "./Dashboard.css"

const Dashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard")
  const [activeSubItem, setActiveSubItem] = useState(null)
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab === 'traites') {
      setActiveMenuItem('Gestion Traites')
      setActiveSubItem('Grille de saisie')
    }
  }, [location.search])

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Sidebar activeMenuItem={activeMenuItem} activeSubItem={activeSubItem} setActiveMenuItem={(item) => { setActiveMenuItem(item); if (item === "Gestion Traites") setActiveSubItem("Grille de saisie"); else setActiveSubItem(null) }} setActiveSubItem={setActiveSubItem} />
        <div className="main-content">
          <Header />
          <div className="content-area">
            {location.pathname.startsWith('/traites/new') || location.pathname.match(/^\/traites\/\d+\/edit$/) ? (
              <TraiteFormPage />
            ) : location.pathname.match(/^\/traites\/\d+$/) ? (
              <TraiteDetailPage />
            ) : activeMenuItem === "Dashboard" ? (
              <DashboardStats />
            ) : activeMenuItem === "Gestion Traites" ? (
              activeSubItem === "Edition" ? <EditionPage /> : 
              activeSubItem === "Historique" ? <HistoriquePage /> : 
              <TraitesGrid />
            ) : activeMenuItem === "Credit compte" ? (
              <div>Module Credit compte (contenu à définir)</div>
            ) : null}
            
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
