import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import Can from "./Can"
import "./ClientsGrid.css"
import { useAuth } from "../hooks/useAuth" // Importer le hook d'authentification
import Pagination from "./Pagination" // Importer le composant Pagination

// Composant personnalisé pour le popup de rejet
const RejectModal = ({ isOpen, onClose, onConfirm, clientName }) => {
  const [reason, setReason] = useState("")
  
  if (!isOpen) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Rejeter le client "{clientName}"
        </h3>
        <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>
          Veuillez indiquer la raison du rejet (optionnel):
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Entrez la raison du rejet..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            marginBottom: '20px',
            resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Rejeter
          </button>
        </div>
      </div>
    </div>
  )
}

const PendingClientsGrid = () => {
  const [pendingClients, setPendingClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedClient, setSelectedClient] = useState(null)
  const [page, setPage] = useState(1) // Ajout de l'état pour la pagination
  const [perPage, setPerPage] = useState(10) // Ajout de l'état pour les éléments par page
  const [showRejectModal, setShowRejectModal] = useState(false) // État pour le modal de rejet
  const [clientToReject, setClientToReject] = useState(null) // Client à rejeter
  const navigate = useNavigate()
  const { hasPermission } = useAuth() // Utiliser le hook d'authentification
  
  // Vérifier si l'utilisateur a la permission de gérer les clients en attente
  const canManagePendingClients = hasPermission('manage_pending_clients')
  
  const baseUrl = process.env.REACT_APP_API_URL || ''

  const fetchPendingClients = async () => {
    try {
      const token = localStorage.getItem("token")
      const headers = { 
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
      
      // Ajout des paramètres de pagination
      const params = new URLSearchParams()
      params.append("page", String(page))
      params.append("per_page", String(perPage))
      
      const res = await fetch(`${baseUrl}/api/pending-clients?${params.toString()}`, { headers })
      
      if (res.ok) {
        const data = await res.json()
        setPendingClients(data.data || [])
      } else {
        throw new Error("Erreur de chargement des clients en attente")
      }
    } catch (err) {
      setError(err.message || "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Ne charger les clients que si l'utilisateur a la permission
    if (canManagePendingClients) {
      fetchPendingClients()
    } else {
      setLoading(false)
    }
  }, [canManagePendingClients, page, perPage])

  const handleApprove = async (clientId) => {
    try {
      const token = localStorage.getItem("token")
      const headers = { 
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
      
      const res = await fetch(`${baseUrl}/api/pending-clients/${clientId}/approve`, {
        method: "POST",
        headers
      })
      
      if (res.ok) {
        // Refresh the list
        fetchPendingClients()
        setSelectedClient(null)
        // Trigger a custom event to update the pending clients count in other components
        window.dispatchEvent(new Event('pendingClientsCountChanged'))
      } else {
        const errorData = await res.json()
        if (res.status === 400) {
          // Client already exists
          throw new Error(errorData.message || "Ce client existe déjà dans le système.")
        } else {
          throw new Error(errorData.message || "Erreur lors de l'approbation du client")
        }
      }
    } catch (err) {
      setError(err.message || "Erreur inconnue")
    }
  }

  // Fonction pour ouvrir le modal de rejet
  const openRejectModal = (client) => {
    setClientToReject(client)
    setShowRejectModal(true)
  }

  // Fonction pour fermer le modal de rejet
  const closeRejectModal = () => {
    setShowRejectModal(false)
    setClientToReject(null)
  }

  // Fonction pour confirmer le rejet
  const confirmReject = async (reason) => {
    if (!clientToReject) return
    
    try {
      const token = localStorage.getItem("token")
      const headers = { 
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
      
      const res = await fetch(`${baseUrl}/api/pending-clients/${clientToReject.id}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: reason || null })
      })
      
      console.log('Reject response:', res.status, res.statusText);
      
      if (res.ok) {
        // Refresh the list
        fetchPendingClients()
        setSelectedClient(null)
        // Trigger a custom event to update the pending clients count in other components
        window.dispatchEvent(new Event('pendingClientsCountChanged'))
        closeRejectModal()
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Reject error response:', errorData);
        throw new Error(errorData.message || `Erreur lors du rejet du client (HTTP ${res.status})`)
      }
    } catch (err) {
      setError(err.message || "Erreur inconnue")
      closeRejectModal()
    }
  }

  const handleReject = (client) => {
    openRejectModal(client)
  }

  // Si l'utilisateur n'a pas la permission, afficher un message
  if (!canManagePendingClients) {
    return (
      <div className="dashboard-stats">
        <h2 className="stats-title">Clients en attente d'approbation</h2>
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 500, marginBottom: "0.5rem", color: "#6b7280" }}>Accès refusé</p>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Vous n'avez pas la permission de gérer les clients en attente.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dashboard-stats">
        <h2 className="stats-title">Clients en attente d'approbation</h2>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px", backgroundColor: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <Loader2 size={24} className="loading-spinner" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-stats">
        <h2 className="stats-title">Clients en attente d'approbation</h2>
        <div className="error-message" style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "1.5rem", borderRadius: "0.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 500, marginBottom: "0.5rem" }}>Erreur de chargement</p>
          <p style={{ fontSize: "0.875rem" }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-stats">
      <h2 className="stats-title">Clients en attente d'approbation</h2>
      
      {/* Modal de rejet */}
      <RejectModal 
        isOpen={showRejectModal}
        onClose={closeRejectModal}
        onConfirm={confirmReject}
        clientName={clientToReject?.nom_raison_sociale || ''}
      />
      
      {selectedClient ? (
        <div className="client-detail-container">
          <div className="client-detail-header">
            <div>
              <h3>Détails du client en attente</h3>
              <p className="client-created-by">
                Créé par: {selectedClient.created_by?.username || "Utilisateur inconnu"}
              </p>
            </div>
            <button 
              className="submit-button" 
              style={{ backgroundColor: "#9ca3af" }}
              onClick={() => setSelectedClient(null)}
            >
              Retour à la liste
            </button>
          </div>
          
          <div className="client-detail-content">
            <div className="detail-section">
              <h4>Informations du client</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Nom/Raison sociale:</label>
                  <span>{selectedClient.nom_raison_sociale}</span>
                </div>
                <div className="detail-item">
                  <label>Numéro de compte:</label>
                  <span>{selectedClient.numero_compte || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>BP:</label>
                  <span>{selectedClient.bp || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Ville:</label>
                  <span>{selectedClient.ville || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Pays:</label>
                  <span>{selectedClient.pays || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Adresse géo 1:</label>
                  <span>{selectedClient.adresse_geo_1 || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Adresse géo 2:</label>
                  <span>{selectedClient.adresse_geo_2 || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Téléphone:</label>
                  <span>{selectedClient.telephone || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Email:</label>
                  <span>{selectedClient.email || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Catégorie:</label>
                  <span>{selectedClient.categorie}</span>
                </div>
                <div className="detail-item">
                  <label>N° contribuable:</label>
                  <span>{selectedClient.n_contribuable || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Type de tiers:</label>
                  <span>{selectedClient.type_tiers}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h4>Demande d'ouverture de compte</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Date de création:</label>
                  <span>{selectedClient.date_creation ? new Date(selectedClient.date_creation).toLocaleDateString('fr-FR') : "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Montant facturé:</label>
                  <span>{selectedClient.montant_facture ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(selectedClient.montant_facture) : "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Montant payé:</label>
                  <span>{selectedClient.montant_paye ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(selectedClient.montant_paye) : "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Crédit:</label>
                  <span>{selectedClient.credit ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(selectedClient.credit) : "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Établissement:</label>
                  <span>{selectedClient.etablissement || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Service:</label>
                  <span>{selectedClient.service || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Nom du signataire:</label>
                  <span>{selectedClient.nom_signataire || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <label>Motif:</label>
                  <span>{selectedClient.motif || "N/A"}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h4>Actions</h4>
              <div className="action-buttons">
                <button 
                  className="submit-button" 
                  style={{ backgroundColor: "#10B981" }}
                  onClick={() => handleApprove(selectedClient.id)}
                >
                  <CheckCircle size={16} style={{ marginRight: 8 }} />
                  Approuver
                </button>
                <button 
                  className="submit-button" 
                  style={{ backgroundColor: "#EF4444" }}
                  onClick={() => handleReject(selectedClient)}
                >
                  <XCircle size={16} style={{ marginRight: 8 }} />
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-container">
          {pendingClients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
              <p style={{ fontSize: "1.125rem", fontWeight: 500, marginBottom: "0.5rem" }}>Aucun client en attente d'approbation</p>
              <p style={{ fontSize: "0.875rem" }}>Les clients soumettant des demandes d'ouverture de compte apparaîtront ici.</p>
            </div>
          ) : (
            <table className="table-basic">
              <thead>
                <tr>
                  <th>Nom/Raison sociale</th>
                  <th>Type de tiers</th>
                  <th>Catégorie</th>
                  <th>Ville</th>
                  <th>Créé par</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.nom_raison_sociale}</td>
                    <td>{client.type_tiers}</td>
                    <td>{client.categorie}</td>
                    <td>{client.ville || "N/A"}</td>
                    <td>{client.created_by?.username || "Utilisateur inconnu"}</td>
                    <td>
                      <button 
                        className="submit-button" 
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.875rem",
                          backgroundColor: "#3b82f6"
                        }}
                        onClick={() => setSelectedClient(client)}
                      >
                        Voir détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "0.75rem", backgroundColor: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div style={{ fontWeight: 500, color: "#374151" }}>
                        Total: {pendingClients.length} client{pendingClients.length !== 1 ? 's' : ''} en attente
                      </div>
                      <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(pendingClients.length / perPage) || 1}
                        totalItems={pendingClients.length}
                        itemsPerPage={perPage}
                        onPageChange={(newPage) => setPage(newPage)}
                        onItemsPerPageChange={(newPerPage) => {
                          setPerPage(newPerPage)
                          setPage(1)
                        }}
                        itemsPerPageOptions={[10, 20, 50, 100]}
                        showItemsPerPage={true}
                        showTotal={true}
                      />
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default PendingClientsGrid