"use client"
import React from "react"
import { useNavigate } from "react-router-dom"
import "./Sidebar.css"
import { LogOut, Users, Bell, Settings, Home, Briefcase, CreditCard, Table, Edit, History, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Can from "./Can"
import { useAuth } from "../hooks/useAuth" // Import du hook

const Sidebar = ({ activeMenuItem, activeSubItem, setActiveMenuItem, setActiveSubItem }) => {
  const navigate = useNavigate()
  const { logout, hasPermission, organization } = useAuth() // Utilisation du contexte auth
  const sidebarId = React.useRef(Math.random().toString(36).substr(2, 9)).current
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === '1'
    } catch (_) {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('sidebar_collapsed', next ? '1' : '0') } catch (_) {}
      return next
    })
  }

  // Si un sous-menu est actif, s'assurer que la sidebar est élargie
  React.useEffect(() => {
    if (activeSubItem) {
      setCollapsed(false)
      try { localStorage.setItem('sidebar_collapsed', '0') } catch (_) {}
    }
  }, [activeSubItem])

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
  
      <>
      {/* Bouton externe, positionné à l'extérieur de la sidebar */}
      <button
        className="sidebar-external-toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Déplier la barre latérale' : 'Réduire la barre latérale'}
        style={{
          left: collapsed ? 120 : 300, // aligné au bord droit de la sidebar
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} data-sidebar-id={sidebarId}>
      <div className="sidebar-header">
        <div className="logo">
          <img src={organization.logo} alt={`${organization.name} Logo`} style={{ width: "190px", height: "auto" }} />
          <div className="logo-icon"></div>
        </div>
        <div
          className="logo-text"
          style={{ fontSize: "16px", fontWeight: "bold", color: "#333", textAlign: "center", marginTop: "10px" }}
        >
          {/* {organization.name} */}
          NOM DE L'APPLICATION
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {/* Only show Dashboard menu item if user has dashboard access and access to both traites and clients */}
          {(hasPermission('access_dashboard') && 
            (hasPermission('access_traites') && hasPermission('access_clients'))) || 
            (hasPermission('access_dashboard') && 
            !hasPermission('access_traites') && 
            !hasPermission('access_clients')) ? (
            <Can permission="access_dashboard">
              <button
                className={`nav-item ${activeMenuItem === "Dashboard" ? "active" : ""}`}
                onClick={() => { setActiveMenuItem("Dashboard"); setActiveSubItem && setActiveSubItem(null); navigate('/dashboard') }}
              >
                <span className="nav-icon">
                  <Home size={16} />
                </span>
                <span className="nav-text">Dashboard</span>
              </button>
            </Can>
          ) : null}
          <Can permission="view_traites">
            <button
              className={`nav-item ${activeMenuItem === "Gestion Traites" ? "active" : ""}`}
              onClick={() => { 
                setActiveMenuItem("Gestion Traites"); 
                setActiveSubItem && setActiveSubItem("Grille de saisie"); 
                setCollapsed(false);
                try { localStorage.setItem('sidebar_collapsed', '0') } catch (_) {}
                navigate('/dashboard') 
              }}
            >
              <span className="nav-icon">
                <Briefcase size={16} />
              </span>
              <span className="nav-text">Gestion Traites</span>
            </button>
          </Can>
          <Can permission="view_traites">
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
                <button className={`nav-subitem ${activeSubItem === "Notification" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Notification"); navigate('/notifications') }}>
                  <span className="nav-icon">
                    <Bell size={16} />
                  </span>
                  <span className="nav-text">Notification</span>
                </button>
              </div>
            )}
          </Can>
          <Can permission="view_clients">
            <button
              className={`nav-item ${activeMenuItem === "Credit compte" ? "active" : ""}`}
              onClick={() => { 
                setActiveMenuItem("Credit compte");
                setActiveSubItem && setActiveSubItem("Gestion des comptes clients");
                setCollapsed(false);
                try { localStorage.setItem('sidebar_collapsed', '0') } catch (_) {}
                navigate('/dashboard?tab=credit&view=GestionClients');
              }}
            >
              <span className="nav-icon">
                <CreditCard size={16} />
              </span>
              <span className="nav-text">Comptes clients</span>
            </button>
          </Can>
          <Can permission="view_clients">
            {activeMenuItem === "Credit compte" && (
              <div className="subitems-group">
                <button className={`nav-subitem ${activeSubItem === "Gestion des comptes clients" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Gestion des comptes clients"); navigate('/dashboard?tab=credit&view=GestionClients') }}>
                  <span className="nav-icon">
                    <Users size={16} />
                  </span>
                  <span className="nav-text">Gestion des comptes clients</span>
                </button>
                <button className={`nav-subitem ${activeSubItem === "Historique clients" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Historique clients"); navigate('/dashboard?tab=credit&view=HistoriqueClients') }}>
                  <span className="nav-icon">
                    <History size={16} />
                  </span>
                  <span className="nav-text">Historique comptes clients</span>
                </button>
                <Can permission="create_clients">
                  <button className={`nav-subitem ${activeSubItem === "Nouveau client" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("Nouveau client"); navigate('/dashboard?tab=credit&view=NewClient') }}>
                    <span className="nav-icon">
                      <Plus size={16} />
                    </span>
                    <span className="nav-text">Nouveau compte client</span>
                  </button>
                </Can>
                {/* Afficher "Clients en attente" seulement si l'utilisateur a la permission */}
                {hasPermission('manage_pending_clients') && (
                  <button className={`nav-subitem ${activeSubItem === "PendingClients" ? "active" : ""}`} onClick={() => { setActiveSubItem && setActiveSubItem("PendingClients"); navigate('/dashboard?tab=credit&view=PendingClients') }}>
                    <span className="nav-icon">
                      <Users size={16} />
                    </span>
                    <span className="nav-text">Clients en attente</span>
                  </button>
                )}
              </div>
            )}
          </Can>
        </div>
      </nav>

      <div className="sidebar-footer">
        {/* Only show settings button if user has manage_company_info or manage_users permission */}
        {(hasPermission('manage_company_info') || hasPermission('manage_users')) && (
          <button 
            className={`nav-item ${activeMenuItem === "Paramètres" ? "active" : ""}`}
            onClick={() => { 
              setActiveMenuItem("Paramètres"); 
              navigate('/settings') 
            }}
          >
            <span className="nav-icon">
              <Settings size={18} />
            </span>
            <span className="nav-text">Paramètres</span>
          </button>
        )}
        <button className="logout-button" onClick={handleLogout}>
          <span className="logout-icon">
            <LogOut size={18} />
          </span>
          <span className="logout-text">Déconnexion</span>
        </button>
      </div>
    </aside>
    </>
  )
}

export default Sidebar