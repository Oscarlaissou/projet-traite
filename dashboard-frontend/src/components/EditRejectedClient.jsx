import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const EditRejectedClient = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const baseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
  
  // Extract ID from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');
  
  const [clientData, setClientData] = useState({
    nom_raison_sociale: "",
    numero_compte: "",
    bp: "",
    ville: "",
    pays: "",
    adresse_geo_1: "",
    adresse_geo_2: "",
    telephone: "",
    email: "",
    categorie: "",
    n_contribuable: "",
    type_tiers: "Client",
    date_creation: "",
    montant_facture: "",
    montant_paye: "",
    credit: "",
    motif: "",
    etablissement: "",
    service: "",
    nom_signataire: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canSubmit, setCanSubmit] = useState(false);
  const [clientExists, setClientExists] = useState(true);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Charger les données du client
  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) {
        setError("ID du client non spécifié.");
        setClientExists(false);
        return;
      }
      
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${baseUrl}/api/pending-clients/${id}`, {
          headers: authHeaders()
        });
        
        if (res.status === 404) {
          setError(`Client avec ID ${id} non trouvé. Il a peut-être déjà été approuvé ou supprimé.`);
          setClientExists(false);
          setLoading(false);
          return;
        }
        
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}: Impossible de charger les données du client`);
        }
        
        const data = await res.json();
        setClientData({
          nom_raison_sociale: data.nom_raison_sociale || "",
          numero_compte: data.numero_compte || "",
          bp: data.bp || "",
          ville: data.ville || "",
          pays: data.pays || "",
          adresse_geo_1: data.adresse_geo_1 || "",
          adresse_geo_2: data.adresse_geo_2 || "",
          telephone: data.telephone || "",
          email: data.email || "",
          categorie: data.categorie || "",
          n_contribuable: data.n_contribuable || "",
          type_tiers: data.type_tiers || "Client",
          date_creation: data.date_creation || "",
          montant_facture: data.montant_facture || "",
          montant_paye: data.montant_paye || "",
          credit: data.credit || "",
          motif: data.motif || "",
          etablissement: data.etablissement || "",
          service: data.service || "",
          nom_signataire: data.nom_signataire || ""
        });
        setClientExists(true);
      } catch (e) {
        setError(e.message || "Erreur lors du chargement des données du client");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClientData();
    }
  }, [id]);

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!clientExists || !id) return;
    
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${baseUrl}/api/pending-clients/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(clientData)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Erreur ${res.status}: ${errorData.message || 'Impossible de sauvegarder les modifications'}`);
      }
      
      const updatedData = await res.json();
      setSuccess("Modifications enregistrées avec succès");
      setCanSubmit(true);
    } catch (e) {
      setError(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Soumettre pour approbation
  const handleSubmit = async () => {
    if (!clientExists || !id) return;
    
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${baseUrl}/api/pending-clients/${id}/submit`, {
        method: 'POST',
        headers: authHeaders()
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Erreur ${res.status}: ${errorData.message || 'Impossible de soumettre pour approbation'}`);
      }
      
      setSuccess("Demande soumise pour approbation avec succès");
      // Rediriger vers l'historique après soumission
      setTimeout(() => {
        navigate('/dashboard?tab=credit&view=ClientApprovalHistory');
      }, 2000);
    } catch (e) {
      setError(e.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancel = () => {
    navigate('/dashboard?tab=credit&view=ClientApprovalHistory');
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        Chargement des données du client...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '24px' }}>
          Modifier la Demande Rejetée
        </h1>
        
        {error && (
          <div style={{ 
            backgroundColor: '#FEF2F2', 
            padding: '12px', 
            borderRadius: '6px', 
            border: '1px solid #FEE2E2', 
            color: '#DC2626', 
            marginBottom: '16px' 
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            backgroundColor: '#ECFDF5', 
            padding: '12px', 
            borderRadius: '6px', 
            border: '1px solid #D1FAE5', 
            color: '#047857', 
            marginBottom: '16px' 
          }}>
            {success}
          </div>
        )}
        
        {!clientExists ? (
          <div style={{ 
            backgroundColor: '#FEF2F2', 
            padding: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#DC2626', marginBottom: '16px' }}>Client non trouvé</h2>
            <p>Le client que vous tentez de modifier n'existe plus. Il a peut-être déjà été approuvé ou supprimé.</p>
            <button
              onClick={handleCancel}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Retour à l'historique
            </button>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Nom/Raison Sociale *
                </label>
                <input
                  type="text"
                  name="nom_raison_sociale"
                  value={clientData.nom_raison_sociale}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Numéro de Compte
                </label>
                <input
                  type="text"
                  name="numero_compte"
                  value={clientData.numero_compte}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                  readOnly
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  BP
                </label>
                <input
                  type="text"
                  name="bp"
                  value={clientData.bp}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Ville
                </label>
                <input
                  type="text"
                  name="ville"
                  value={clientData.ville}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Pays
                </label>
                <input
                  type="text"
                  name="pays"
                  value={clientData.pays}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Adresse Géo 1
                </label>
                <input
                  type="text"
                  name="adresse_geo_1"
                  value={clientData.adresse_geo_1}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Adresse Géo 2
                </label>
                <input
                  type="text"
                  name="adresse_geo_2"
                  value={clientData.adresse_geo_2}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Téléphone
                </label>
                <input
                  type="text"
                  name="telephone"
                  value={clientData.telephone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={clientData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Catégorie
                </label>
                <select
                  name="categorie"
                  value={clientData.categorie}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Sélectionnez une catégorie</option>
                  <option value="Particulier">Particulier</option>
                  <option value="Entreprise">Entreprise</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  N° Contribuable
                </label>
                <input
                  type="text"
                  name="n_contribuable"
                  value={clientData.n_contribuable}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Type de Tiers
                </label>
                <select
                  name="type_tiers"
                  value={clientData.type_tiers}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                  disabled
                >
                  <option value="Client">Client</option>
                  <option value="Fournisseur">Fournisseur</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Date de Création
                </label>
                <input
                  type="date"
                  name="date_creation"
                  value={clientData.date_creation}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Montant Facture
                </label>
                <input
                  type="number"
                  name="montant_facture"
                  value={clientData.montant_facture}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Montant Payé
                </label>
                <input
                  type="number"
                  name="montant_paye"
                  value={clientData.montant_paye}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Crédit
                </label>
                <input
                  type="number"
                  name="credit"
                  value={clientData.credit}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Motif
                </label>
                <textarea
                  name="motif"
                  value={clientData.motif}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    minHeight: '80px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Établissement
                </label>
                <input
                  type="text"
                  name="etablissement"
                  value={clientData.etablissement}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Service
                </label>
                <input
                  type="text"
                  name="service"
                  value={clientData.service}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Nom du Signataire
                </label>
                <input
                  type="text"
                  name="nom_signataire"
                  value={clientData.nom_signataire}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>
          </div>
        )}
        
        {clientExists && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            
            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {submitting ? "Soumission..." : "Soumettre pour Approbation"}
              </button>
            )}
            
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#9CA3AF',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditRejectedClient;