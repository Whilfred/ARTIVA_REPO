// admin_panel/src/pages/UserManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import UserFormModal from '../components/UserFormModal';
import UserCartModal from '../components/UserCartModal';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [cartUser, setCartUser] = useState(null);

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
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setUsers(response.data || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
      setError(err.response?.data?.message || 'Impossible de charger les utilisateurs.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModalForEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setError('');
  };

  const handleOpenCart = (user) => {
    setCartUser(user);
    setIsCartModalOpen(true);
  };
  const handleCloseCart = () => {
    setIsCartModalOpen(false);
    setCartUser(null);
  };

  const handleSaveUser = (updatedUser) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
  };

  // Suppression : d'abord une tentative de suppression définitive. Si le
  // backend refuse parce que l'utilisateur a des commandes (409), on propose
  // l'anonymisation à la place plutôt que de laisser un message d'erreur sec.
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Supprimer définitivement "${userName}" ? Cette action est irréversible.`)) {
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      fetchUsers();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.hasOrders) {
        const veutAnonymiser = window.confirm(
          `${err.response.data.message}\n\nVoulez-vous anonymiser ce compte à la place ? (efface son identité, garde ses commandes)`
        );
        if (veutAnonymiser) {
          await handleAnonymizeUser(userId, userName, false);
        }
      } else {
        console.error('Erreur suppression utilisateur:', err);
        setError(err.response?.data?.message || "Erreur lors de la suppression de l'utilisateur.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymizeUser = async (userId, userName, askConfirm = true) => {
    if (askConfirm) {
      const confirme = window.confirm(
        `Anonymiser "${userName}" ? Son nom, email, adresse et téléphone seront effacés. Ses commandes et avis resteront visibles pour vos statistiques.`
      );
      if (!confirme) return;
    }
    setIsLoading(true);
    setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}/anonymize`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchUsers();
    } catch (err) {
      console.error("Erreur anonymisation utilisateur:", err);
      setError(err.response?.data?.message || "Erreur lors de l'anonymisation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActiveStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activer' : 'désactiver';
    if (window.confirm(`Voulez-vous vraiment ${action} ce compte utilisateur ?`)) {
      setIsLoading(true);
      setError('');
      try {
        await axios.put(
          `${API_BASE_URL}/users/${userId}`,
          { is_active: newStatus },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === userId ? { ...user, is_active: newStatus } : user))
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
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map(user => (
              <tr key={user.id} style={user.is_deleted ? { opacity: 0.5 } : undefined}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.address || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <span
                    className={user.is_active ? 'status-active' : 'status-inactive'}
                    onClick={() => !user.is_deleted && handleToggleActiveStatus(user.id, user.is_active)}
                    style={{ cursor: user.is_deleted ? 'default' : 'pointer', padding: '3px 6px', borderRadius: '3px', display: 'inline-block' }}
                    title={user.is_deleted ? 'Compte anonymisé' : (user.is_active ? 'Actif (cliquer pour désactiver)' : 'Désactivé (cliquer pour activer)')}
                  >
                    {user.is_deleted ? 'Anonymisé' : (user.is_active ? 'Actif' : 'Désactivé')}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    onClick={() => handleOpenCart(user)}
                    className="action-btn"
                    title="Voir le panier"
                  >
                    🛒
                  </button>
                  <button
                    onClick={() => handleOpenModalForEdit(user)}
                    className="action-btn edit-btn"
                    title="Modifier"
                    disabled={user.is_deleted}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleAnonymizeUser(user.id, user.name)}
                    className="action-btn"
                    title="Anonymiser (garder les données)"
                    disabled={user.is_deleted}
                  >
                    🕶️
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="action-btn delete-btn"
                    title="Supprimer définitivement"
                    disabled={user.is_deleted}
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

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          userToEdit={selectedUser}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}

      {isCartModalOpen && (
        <UserCartModal
          isOpen={isCartModalOpen}
          onClose={handleCloseCart}
          user={cartUser}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}

export default UserManagementPage;
