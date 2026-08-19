// admin_panel/src/pages/UserManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import UserFormModal from '../components/UserFormModal';
// Importer les styles généraux si besoin (ex: ProductManagementPage.css)
import './ProductManagementPage.css'; // Réutilisation pour la structure de base

const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    if (!adminToken) {
        navigate('/login');
        return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      setUsers(response.data || []);
    } catch (err) {
      console.error("Erreur chargement utilisateurs:", err);
      setError(err.response?.data?.message || 'Impossible de charger les utilisateurs.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fonctions pour ouvrir le modal d'édition
  const handleOpenModalForEdit = (user) => {
     setSelectedUser(user);
     setIsModalOpen(true);
   };
   const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setError(''); // Nettoyer l'erreur du modal
  };

  const handleSaveUser = (updatedUser) => {
    // Mettre à jour la liste des utilisateurs
    setUsers(prevUsers =>
      prevUsers.map(user => (user.id === updatedUser.id ? updatedUser : user))
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`)) {
      setIsLoading(true);
      setError('');
      try {
        await axios.delete(`${API_BASE_URL}/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        fetchUsers(); // Recharger la liste
      } catch (err) {
        console.error("Erreur suppression utilisateur:", err);
        setError(err.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleToggleActiveStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? "activer" : "désactiver";
    if (window.confirm(`Voulez-vous vraiment ${action} ce compte utilisateur ?`)) {
      setIsLoading(true);
      setError('');
      try {
        // Mettre à jour le statut via une requête PUT (ou PATCH)
        await axios.put(`${API_BASE_URL}/users/${userId}`, { is_active: newStatus }, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        // Mettre à jour l'état local pour un feedback immédiat
        setUsers(prevUsers => 
          prevUsers.map(user => user.id === userId ? { ...user, is_active: newStatus } : user)
        );
      } catch (err) {
        console.error(`Erreur lors de la tentative d'${action} le compte:`, err);
        setError(err.response?.data?.message || `Erreur lors de la mise à jour du statut du compte.`);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (isLoading && users.length === 0) {
    return <div className="management-page"><p>Chargement des utilisateurs...</p></div>;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Gestion des Utilisateurs</h1>
        {/* Pas de bouton "Ajouter Utilisateur" ici, car l'inscription se fait via l'app client ou une route admin spécifique */}
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-indicator">Opération en cours...</p>}

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Adresse</th>
              <th>Téléphone</th>
              <th>Inscrit le</th>
              <th>Statut</th>  {/* Ajout: Statut du compte */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.address || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td>{formatDate(user.created_at)}</td>
                <td> {/* Ajout: Affichage du statut + toggle */}
                  <span
                    className={user.is_active ? 'status-active' : 'status-inactive'}
                    onClick={() => handleToggleActiveStatus(user.id, user.is_active)}
                    style={{ cursor: 'pointer', padding: '3px 6px', borderRadius: '3px', display: 'inline-block' }}
                    title={user.is_active ? "Actif (cliquer pour désactiver)" : "Désactivé (cliquer pour activer)"}
                  >
                    {user.is_active ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button 
                    onClick={() => handleOpenModalForEdit(user)} 
                    className="action-btn edit-btn" 
                    title="Modifier"
                  >
                    ✎
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id, user.name)} 
                    className="action-btn delete-btn" 
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center'}}>Aucun utilisateur trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Intégration du UserFormModal */}
      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveUser} // Transmettre la fonction de sauvegarde modifiée
          userToEdit={selectedUser}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}

export default UserManagementPage;