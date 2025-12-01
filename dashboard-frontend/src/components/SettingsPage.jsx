import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Can from './Can';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, hasPermission, updateOrganizationSettings } = useAuth();
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('Paramètres');
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [activeTab, setActiveTab] = useState('organization');
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [organizationSettings, setOrganizationSettings] = useState({
    name: '',
    logo: '',
    logoPreview: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Form states for user management
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'admin',
    ville: ''
  });
  
  // Password visibility states
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  
  // Roles data
  const roles = [
    { name: 'traites_manager', description: 'Gestionnaire de traites' },
    { name: 'clients_manager', description: 'Gestionnaire de clients' },
    { name: 'admin', description: 'Administrateur' },
    { name: 'super_admin', description: 'Super Administrateur' }
  ];
  
  // New state for user permissions
  const [userPermissions, setUserPermissions] = useState({});
  
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    role: 'admin',
    ville: ''
  });
  
  // State for permissions tab
  const [permissionsTabUser, setPermissionsTabUser] = useState(null);

  const baseUrl = process.env.REACT_APP_API_URL || '';

  // Fetch users, permissions and organization settings
  useEffect(() => {
    fetchUsers();
    fetchPermissions();
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

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/permissions`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
        
        // Initialize userPermissions state
        const initialPermissions = {};
        data.forEach(permission => {
          initialPermissions[permission.name] = false;
        });
        setUserPermissions(initialPermissions);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
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
        setOrganizationSettings({
          name: data.name || '',
          logo: data.logo || '',
          logoPreview: data.logo || ''
        });
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

  // Handle permission toggle
  const handlePermissionToggle = (permissionName) => {
    setUserPermissions(prev => ({
      ...prev,
      [permissionName]: !prev[permissionName]
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validation basique
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        setError('Format de fichier non valide. Utilisez JPG, PNG, GIF ou SVG.');
        return;
      }
      
      if (file.size > 2048 * 1024) {
        setError('Le fichier est trop volumineux. Maximum 2MB.');
        return;
      }
      
      // Créer un aperçu local
      const logoUrl = URL.createObjectURL(file);
      setOrganizationSettings(prev => ({
        ...prev,
        logoPreview: logoUrl
      }));
      
      // Effacer les messages d'erreur
      setError('');
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
      const formData = new FormData();
      
      // Ajouter le nom
      formData.append('name', organizationSettings.name || '');
      
      // Ajouter le logo s'il y en a un nouveau
      const logoFile = fileInputRef.current?.files[0];
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      const res = await fetch(`${baseUrl}/api/organization/settings`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrganizationSettings({
          name: data.name || '',
          logo: data.logo || '',
          logoPreview: data.logo || ''
        });
        
        // Mettre à jour le contexte d'authentification
        updateOrganizationSettings(data);
        
        setSuccess('Paramètres de l\'organisation mis à jour avec succès');
        
        // Réinitialiser l'input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Échec de la mise à jour');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour des paramètres');
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
          role: 'admin',
          ville: ''
        });
        setSuccess('Utilisateur créé avec succès');
        fetchUsers();
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
      role: user.role || 'admin',
      ville: user.ville || ''
    });
  };
  
  const startPermissionsEdit = (user) => {
    setPermissionsTabUser(user);
    setActiveTab('user-permissions');
    fetchUserPermissions(user.id);
  };

  const fetchUserPermissions = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/users/${userId}/permissions`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserPermissions(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(permission => {
            updated[permission] = data.includes(permission);
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
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
        fetchUsers();
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

  const updateUserPermissions = async (userId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const selectedPermissions = Object.keys(userPermissions).filter(permission => userPermissions[permission]);
      
      const res = await fetch(`${baseUrl}/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: selectedPermissions })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccess('Permissions mises à jour avec succès');
        setActiveTab('users');
        setPermissionsTabUser(null);
        fetchUsers();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update permissions');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour des permissions');
      console.error('Error updating permissions:', err);
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

  // Group permissions by category for better UI
  const groupPermissions = (permissions) => {
    const groups = {
      'Clients': [],
      'Traites': [],
      'Système': []
    };
    
    permissions.forEach(permission => {
      if (permission.name.includes('client')) {
        groups['Clients'].push(permission);
      } else if (permission.name.includes('traite')) {
        groups['Traites'].push(permission);
      } else {
        groups['Système'].push(permission);
      }
    });
    
    return groups;
  };

  const permissionGroups = groupPermissions(permissions);

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
                {hasPermission('manage_users') && (
                  <button 
                    className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                  >
                    Gestion des utilisateurs
                  </button>
                )}
                {hasPermission('manage_users') && activeTab === 'user-permissions' && (
                  <button 
                    className={`tab-button active`}
                  >
                    Permissions - {permissionsTabUser?.username}
                  </button>
                )}
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
                          placeholder="Entrez le nom de l'organisation"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Logo de l'organisation</label>
                        <div className="logo-upload-container">
                          {(organizationSettings.logoPreview || organizationSettings.logo) ? (
                            <img 
                              src={organizationSettings.logoPreview || organizationSettings.logo} 
                              alt="Logo de l'organisation" 
                              className="logo-preview"
                            />
                          ) : (
                            <div className="no-logo-placeholder">
                              <span>Aucun logo</span>
                            </div>
                          )}
                          <button 
                            type="button" 
                            className="upload-button"
                            onClick={triggerFileInput}
                          >
                            {organizationSettings.logo ? 'Changer le logo' : 'Ajouter un logo'}
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
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
                
                {activeTab === 'users' && hasPermission('manage_users') && (
                  <div className="user-management">
                    <h2>Gestion des utilisateurs</h2>
                    
                    {/* Create new user form */}
                    <div className="form-section">
                      <h3>Créer un nouvel utilisateur</h3>
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
                            <div className="password-input-wrapper">
                              <input
                                type={showNewUserPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={newUser.password}
                                onChange={handleNewUserChange}
                                className="form-control"
                                required
                                minLength="8"
                              />
                              <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                                title={showNewUserPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                              >
                                {showNewUserPassword ? '👁️' : '👁️‍🗨️'}
                              </button>
                            </div>
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
                              {roles.map(role => (
                                <option key={role.name} value={role.name}>
                                  {role.description}
                                </option>
                              ))}
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
                                    {roles.find(r => r.name === user.role)?.description || user.role}
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
                                      className="permissions-button"
                                      onClick={() => startPermissionsEdit(user)}
                                    >
                                      Permissions
                                    </button>
                                    <Can permission="manage_users">
                                      <button 
                                        className="delete-button"
                                        onClick={() => deleteUser(user.id)}
                                        disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
                                      >
                                        Supprimer
                                      </button>
                                    </Can>
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
                              <div className="password-input-wrapper">
                                <input
                                  type={showEditUserPassword ? 'text' : 'password'}
                                  id="edit-password"
                                  name="password"
                                  value={editForm.password}
                                  onChange={handleEditUserChange}
                                  className="form-control"
                                  minLength="8"
                                />
                                <button 
                                  type="button" 
                                  className="toggle-password"
                                  onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                                  title={showEditUserPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                >
                                  {showEditUserPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                              </div>
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
                                {roles.map(role => (
                                  <option key={role.name} value={role.name}>
                                    {role.description}
                                  </option>
                                ))}
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
                              <Can permission="manage_users">
                                <button 
                                  type="button" 
                                  className="delete-button"
                                  onClick={() => {
                                    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
                                      deleteUser(editingUser.id);
                                      setEditingUser(null);
                                    }
                                  }}
                                  disabled={editingUser.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
                                >
                                  Supprimer
                                </button>
                              </Can>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'user-permissions' && hasPermission('manage_users') && permissionsTabUser && (
                  <div className="user-permissions">
                    <h2>Permissions pour {permissionsTabUser.username}</h2>
                    <div className="permissions-section">
                      <div className="permissions-grid">
                        {Object.keys(permissionGroups).map(groupName => (
                          <div key={groupName} className="permission-group">
                            <h3>{groupName}</h3>
                            {permissionGroups[groupName].map(permission => (
                              <div key={permission.name} className="permission-toggle">
                                <label className="toggle yellow-toggle">
                                  <input
                                    type="checkbox"
                                    checked={userPermissions[permission.name] || false}
                                    onChange={() => handlePermissionToggle(permission.name)}
                                  />
                                  <span className="slider"></span>
                                </label>
                                <span className="permission-label">
                                  {permission.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      
                      <div className="modal-actions" style={{ marginTop: '30px' }}>
                        <button 
                          type="button" 
                          className="cancel-button"
                          onClick={() => {
                            setActiveTab('users');
                            setPermissionsTabUser(null);
                          }}
                        >
                          Annuler
                        </button>
                        <button 
                          type="button" 
                          className="submit-button"
                          onClick={() => updateUserPermissions(permissionsTabUser.id)}
                          disabled={loading}
                        >
                          {loading ? 'Mise à jour...' : 'Mettre à jour les permissions'}
                        </button>
                      </div>
                    </div>
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