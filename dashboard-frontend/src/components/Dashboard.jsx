"use client"

import React from "react"
import { useState } from "react"
import Sidebar from "./Sidebar"
import DashboardStats from "./DashboardStats"
import Header from "./Header"
import "./Dashboard.css"

const Dashboard = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard")

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Sidebar activeMenuItem={activeMenuItem} setActiveMenuItem={setActiveMenuItem} />
        <div className="main-content">
          <Header />
          <div className="content-area">
            {activeMenuItem === "Dashboard" && (
              <DashboardStats />
            )}
            {activeMenuItem === "Gestion Traites" && (
              <div>Module Gestion Traites (contenu à définir)</div>
            )}
            {activeMenuItem === "Credit compte" && (
              <div>Module Credit compte (contenu à définir)</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
