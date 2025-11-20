import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('Paramètres');
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [activeTab, setActiveTab] = useState('organization');
  const [users, setUsers] = useState([]);
  const [organizationSettings, setOrganizationSettings] = useState({
    name: 'CFAO MOBILITY CAMEROON',
    logo: '/images/LOGO.png'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Form states for user management
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    ville: ''
  });
  
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    role: 'user',
    ville: ''
  });

  const baseUrl = process.env.REACT_APP_API_URL || '';

  // Fetch users and organization settings
  useEffect(() => {
    fetchUsers();
    fetchOrganizationSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/users`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchOrganizationSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/organization/settings`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrganizationSettings(data);
      }
    } catch (err) {
      console.error('Error fetching organization settings:', err);
    }
  };

  const handleOrganizationSettingsChange = (e) => {
    const { name, value } = e.target;
    setOrganizationSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditUserChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real application, you would upload the file to the server
      // For now, we'll just create a local URL
      const logoUrl = URL.createObjectURL(file);
      setOrganizationSettings(prev => ({
        ...prev,
        logo: logoUrl
      }));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const saveOrganizationSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/organization/settings`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(organizationSettings)
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrganizationSettings(data);
        setSuccess('Paramètres de l\'organisation mis à jour avec succès');
      } else {
        throw new Error('Failed to update organization settings');
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour des paramètres de l\'organisation');
      console.error('Error saving organization settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => [...prev, data]);
        setNewUser({
          username: '',
          password: '',
          role: 'user',
          ville: ''
        });
        setSuccess('Utilisateur créé avec succès');
        fetchUsers(); // Refresh the user list
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de l\'utilisateur');
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditingUser = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      password: '',
      role: user.role,
      ville: user.ville || ''
    });
  };

  const updateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === data.id ? data : u));
        setEditingUser(null);
        setSuccess('Utilisateur mis à jour avec succès');
        fetchUsers(); // Refresh the user list
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour de l\'utilisateur');
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSuccess('Utilisateur supprimé avec succès');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression de l\'utilisateur');
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <Sidebar 
          activeMenuItem={activeMenuItem} 
          activeSubItem={activeSubItem}
          setActiveMenuItem={setActiveMenuItem}
          setActiveSubItem={setActiveSubItem}
        />
        <div className="main-content">
          <Header />
          <div className="content-area">
            <div className="settings-page">
              <h1>Paramètres</h1>
              
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              
              <div className="settings-tabs">
                <button 
                  className={`tab-button ${activeTab === 'organization' ? 'active' : ''}`}
                  onClick={() => setActiveTab('organization')}
                >
                  Organisation
                </button>
                <button 
                  className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  Gestion des utilisateurs
                </button>
              </div>
              
              <div className="settings-content">
                {activeTab === 'organization' && (
                  <div className="organization-settings">
                    <h2>Paramètres de l'organisation</h2>
                    <div className="form-section">
                      <div className="form-group">
                        <label htmlFor="name">Nom de l'organisation</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={organizationSettings.name}
                          onChange={handleOrganizationSettingsChange}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Logo de l'organisation</label>
                        <div className="logo-upload-container">
                          <img 
                            src={organizationSettings.logo} 
                            alt="Logo de l'organisation" 
                            className="logo-preview"
                          />
                          <button 
                            type="button" 
                            className="upload-button"
                            onClick={triggerFileInput}
                          >
                            Changer le logo
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="file-input"
                          />
                        </div>
                      </div>
                      
                      <button 
                        className="submit-button"
                        onClick={saveOrganizationSettings}
                        disabled={loading}
                      >
                        {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'users' && (
                  <div className="user-management">
                    <h2>Gestion des utilisateurs</h2>
                    
                    {/* Create new user form */}
                    <div className="form-section">
                      <h3>Créer un nouvel administrateur</h3>
                      <form onSubmit={createUser}>
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="username">Nom d'utilisateur</label>
                            <input
                              type="text"
                              id="username"
                              name="username"
                              value={newUser.username}
                              onChange={handleNewUserChange}
                              className="form-control"
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="password">Mot de passe</label>
                            <input
                              type="password"
                              id="password"
                              name="password"
                              value={newUser.password}
                              onChange={handleNewUserChange}
                              className="form-control"
                              required
                              minLength="8"
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="role">Rôle</label>
                            <select
                              id="role"
                              name="role"
                              value={newUser.role}
                              onChange={handleNewUserChange}
                              className="form-control"
                            >
                              <option value="admin">Administrateur</option>
                              <option value="manager">Gestionnaire</option>
                              <option value="user">Utilisateur</option>
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="ville">Ville</label>
                            <input
                              type="text"
                              id="ville"
                              name="ville"
                              value={newUser.ville}
                              onChange={handleNewUserChange}
                              className="form-control"
                            />
                          </div>
                        </div>
                        
                        <button 
                          type="submit" 
                          className="submit-button"
                          disabled={loading}
                        >
                          {loading ? 'Création...' : 'Créer un utilisateur'}
                        </button>
                      </form>
                    </div>
                    
                    {/* Users list */}
                    <div className="form-section">
                      <h3>Liste des utilisateurs</h3>
                      <div className="table-wrap">
                        <table className="table-basic">
                          <thead>
                            <tr>
                              <th>Nom d'utilisateur</th>
                              <th>Rôle</th>
                              <th>Ville</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map(user => (
                              <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>
                                  <span className={`role-badge role-${user.role}`}>
                                    {user.role === 'admin' ? 'Administrateur' : 
                                     user.role === 'manager' ? 'Gestionnaire' : 'Utilisateur'}
                                  </span>
                                </td>
                                <td>{user.ville || '-'}</td>
                                <td>
                                  <div className="action-buttons">
                                    <button 
                                      className="edit-button"
                                      onClick={() => startEditingUser(user)}
                                    >
                                      Modifier
                                    </button>
                                    <button 
                                      className="delete-button"
                                      onClick={() => deleteUser(user.id)}
                                      disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Edit user modal */}
                    {editingUser && (
                      <div className="modal-overlay">
                        <div className="modal-content">
                          <h3>Modifier l'utilisateur</h3>
                          <form onSubmit={updateUser}>
                            <div className="form-group">
                              <label htmlFor="edit-username">Nom d'utilisateur</label>
                              <input
                                type="text"
                                id="edit-username"
                                name="username"
                                value={editForm.username}
                                onChange={handleEditUserChange}
                                className="form-control"
                                required
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="edit-password">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                              <input
                                type="password"
                                id="edit-password"
                                name="password"
                                value={editForm.password}
                                onChange={handleEditUserChange}
                                className="form-control"
                                minLength="8"
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="edit-role">Rôle</label>
                              <select
                                id="edit-role"
                                name="role"
                                value={editForm.role}
                                onChange={handleEditUserChange}
                                className="form-control"
                              >
                                <option value="admin">Administrateur</option>
                                <option value="manager">Gestionnaire</option>
                                <option value="user">Utilisateur</option>
                              </select>
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="edit-ville">Ville</label>
                              <input
                                type="text"
                                id="edit-ville"
                                name="ville"
                                value={editForm.ville}
                                onChange={handleEditUserChange}
                                className="form-control"
                              />
                            </div>
                            
                            <div className="modal-actions">
                              <button 
                                type="button" 
                                className="cancel-button"
                                onClick={() => setEditingUser(null)}
                              >
                                Annuler
                              </button>
                              <button 
                                type="submit" 
                                className="submit-button"
                                disabled={loading}
                              >
                                {loading ? 'Mise à jour...' : 'Mettre à jour'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;