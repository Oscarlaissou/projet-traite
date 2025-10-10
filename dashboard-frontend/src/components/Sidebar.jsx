"use client"
import React from "react"
import { useNavigate } from "react-router-dom"
import "./Sidebar.css"
import { LogOut, Users, Bell, Settings, Home, Briefcase, CreditCard, Table, Edit, History } from "lucide-react"
import MonImage from "../images/LOGO.png"
import { useAuth } from "../hooks/useAuth" // Import du hook

const Sidebar = ({ activeMenuItem, activeSubItem, setActiveMenuItem, setActiveSubItem }) => {
  const navigate = useNavigate()
  const { logout } = useAuth() // Utilisation du contexte auth
  const sidebarId = React.useRef(Math.random().toString(36).substr(2, 9)).current

  const handleLogout = async () => {
    try {
      console.log(`Déconnexion en cours (Sidebar ID: ${sidebarId})`)
      await logout() // Utilise la fonction logout du contexte
      console.log(`Déconnexion réussie (Sidebar ID: ${sidebarId})`)
    } catch (error) {
      console.error(`Erreur lors de la déconnexion (Sidebar ID: ${sidebarId}):`, error)
      // Force la déconnexion même en cas d'erreur
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      navigate("/")
    }
  }

  console.log(`Rendu de Sidebar (ID: ${sidebarId}) à:`, new Date().toISOString())
  
  return (
  
      <aside className="sidebar" data-sidebar-id={sidebarId}>
      <div className="sidebar-header">
        <div className="logo">
          <img src={MonImage} alt="CFAO Mobility Cameroon Logo" style={{ width: "190px", height: "auto" }} />
          <div className="logo-icon"></div>
        </div>
        <div
          className="logo-text"
          style={{ fontSize: "16px", fontWeight: "bold", color: "#333", textAlign: "center", marginTop: "10px" }}
        >
          Nom de l'application
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <button
            className={`nav-item ${activeMenuItem === "Dashboard" ? "active" : ""}`}
            onClick={() => { setActiveMenuItem("Dashboard"); setActiveSubItem && setActiveSubItem(null); navigate('/dashboard') }}
          >
            <span className="nav-icon">
              <Home size={16} />
            </span>
            <span className="nav-text">Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeMenuItem === "Gestion Traites" ? "active" : ""}`}
            onClick={() => { setActiveMenuItem("Gestion Traites"); setActiveSubItem && setActiveSubItem("Grille de saisie"); navigate('/dashboard') }}
          >
            <span className="nav-icon">
              <Briefcase size={16} />
            </span>
            <span className="nav-text">Gestion Traites</span>
          </button>
          {activeMenuItem === "Gestion Traites" && (
            <div className="subitems-group">
              <button className={`nav-subitem ${activeSubItem === "Grille de saisie" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Grille de saisie"); navigate('/dashboard') }}>
                <span className="nav-icon">
                  <Table size={16} />
                </span>
                <span className="nav-text">Grille de saisie</span>
              </button>
              <button className={`nav-subitem ${activeSubItem === "Edition" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Edition"); navigate('/dashboard') }}>
                <span className="nav-icon">
                  <Edit size={16} />
                </span>
                <span className="nav-text">Edition</span>
              </button>
              <button className={`nav-subitem ${activeSubItem === "Historique" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Historique"); navigate('/dashboard') }}>
                <span className="nav-icon">
                  <History size={16} />
                </span>
                <span className="nav-text">Historique</span>
              </button>
              <button className="nav-subitem">
                <span className="nav-icon">
                  <Bell size={16} />
                </span>
                <span className="nav-text">Notification</span>
              </button>
            </div>
          )}
          <button
            className={`nav-item ${activeMenuItem === "Credit compte" ? "active" : ""}`}
            onClick={() => setActiveMenuItem("Credit compte")}
          >
            <span className="nav-icon">
              <CreditCard size={16} />
            </span>
            <span className="nav-text">Crédit compte</span>
          </button>
          {activeMenuItem === "Credit compte" && (
            <div className="subitems-group">
              <button className="nav-subitem">
                <span className="nav-icon">
                  <Users size={16} />
                </span>
                <span className="nav-text">Gestion des comptes clients</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item">
          <span className="nav-icon">
            <Settings size={18} />
          </span>
          <span className="nav-text">Paramètres</span>
        </button>
        <button className="logout-button" onClick={handleLogout}>
          <span className="logout-icon">
            <LogOut size={18} />
          </span>
          <span className="logout-text">Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar