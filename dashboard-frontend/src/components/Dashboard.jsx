"use client"

import React from "react"
import { useState } from "react"
import Sidebar from "./Sidebar"
import DashboardStats from "./DashboardStats"
import Header from "./Header"
import TraitesGrid from "./TraitesGrid"
import TraiteFormPage from "./TraiteFormPage"
import { useLocation } from "react-router-dom"
import "./Dashboard.css"

const Dashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard")
  const [activeSubItem, setActiveSubItem] = useState(null)
  const location = useLocation()

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Sidebar activeMenuItem={activeMenuItem} activeSubItem={activeSubItem} setActiveMenuItem={(item) => { setActiveMenuItem(item); if (item !== "Gestion Traites") setActiveSubItem(null) }} setActiveSubItem={setActiveSubItem} />
        <div className="main-content">
          <Header />
          <div className="content-area">
            {location.pathname.startsWith('/traites/new') || location.pathname.match(/^\/traites\/\d+\/edit$/) ? (
              <TraiteFormPage />
            ) : activeMenuItem === "Dashboard" ? (
              <DashboardStats />
            ) : activeMenuItem === "Gestion Traites" ? (
              <>
                {activeSubItem === "Grille de saisie" ? (
                  <TraitesGrid />
                ) : (
                  <div>Module Gestion Traites (contenu à définir)</div>
                )}
              </>
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
