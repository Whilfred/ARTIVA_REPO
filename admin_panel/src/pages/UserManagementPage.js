// admin_panel/src/pages/UserManagementPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import UserFormModal from '../components/UserFormModal';
import UserDetailsModal from '../components/UserDetailsModal';
import BlockUserModal from '../components/BlockUserModal';
import UserOrderHistoryModal from '../components/UserOrderHistoryModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);

  // --- Historique des commandes ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);

  // --- Détails d'une commande (ouvert depuis la modale historique) ---
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // --- Recherche + filtre ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // ---------- Chargement ----------
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

  // ---------- Filtrage côté client ----------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const isBlocked = !user.is_active && !user.is_deleted;
      const isAnonymized = user.is_deleted;

      if (statusFilter === 'active' && (isBlocked || isAnonymized)) return false;
      if (statusFilter === 'blocked' && !isBlocked) return false;
      if (statusFilter === 'anonymized' && !isAnonymized) return false;

      if (!term) return true;

      const haystack = [
        String(user.id || ''),
        user.name || '',
        user.email || '',
        user.phone || '',
        user.address || '',
        user.role || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [users, searchTerm, statusFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // ---------- Modale édition ----------
  const handleOpenModalForEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setError('');
  };

  // ---------- Modale détails user (panier & wishlist) ----------
  const handleOpenDetails = (user) => {
    setDetailsUser(user);
    setIsDetailsModalOpen(true);
  };
  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setDetailsUser(null);
  };

  // ---------- Modale historique commandes ----------
  const handleOpenHistory = (user) => {
    setHistoryUser(user);
    setIsHistoryModalOpen(true);
  };
  const handleCloseHistory = () => {
    setIsHistoryModalOpen(false);
    setHistoryUser(null);
  };

  // ---------- Modale détails d'une commande (depuis historique) ----------
  const handleOpenOrderDetails = (orderId) => {
    setSelectedOrderId(orderId);
    setIsOrderDetailsModalOpen(true);
  };
  const handleCloseOrderDetails = () => {
    setIsOrderDetailsModalOpen(false);
    setSelectedOrderId(null);
  };

  const handleSaveUser = (updatedUser) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
  };

  // ---------- Blocage ----------
  const handleOpenBlockModal = (user) => {
    setBlockTarget(user);
    setIsBlockModalOpen(true);
  };

  const handleCloseBlockModal = () => {
    if (isLoading) return;
    setIsBlockModalOpen(false);
    setBlockTarget(null);
  };

  const handleConfirmBlock = async (reason) => {
    if (!blockTarget) return;
    setIsLoading(true);
    setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/users/${blockTarget.id}`,
        { is_active: false, blocked_reason: reason },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      setIsBlockModalOpen(false);
      setBlockTarget(null);
      fetchUsers();
    } catch (err) {
      console.error('Erreur blocage utilisateur:', err);
      setError(err.response?.data?.message || 'Erreur lors du blocage.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Déblocage ----------
  const handleUnblockUser = async (userId, userName) => {
    if (!window.confirm(`Débloquer "${userName}" ? L'utilisateur pourra à nouveau se connecter.`)) {
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}`,
        { is_active: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchUsers();
    } catch (err) {
      console.error('Erreur déblocage utilisateur:', err);
      setError(err.response?.data?.message || 'Erreur lors du déblocage.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Suppression ----------
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

  // ---------- Anonymisation ----------
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

  // ---------- Utilitaires ----------
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
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

      {/* ---------- Barre de recherche + filtre ---------- */}
      <div className="filters-container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end',
        padding: '15px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ flex: '1 1 300px', minWidth: '240px' }}>
          <label htmlFor="userSearch" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
            🔍 Rechercher :
          </label>
          <input
            id="userSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom, email, téléphone, adresse, ID..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label htmlFor="statusFilter" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
            Statut :
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '150px' }}
          >
            <option value="all">Tous</option>
            <option value="active">✅ Actifs</option>
            <option value="blocked">🚫 Bloqués</option>
            <option value="anonymized">🕶️ Anonymisés</option>
          </select>
        </div>

        <button
          onClick={handleResetFilters}
          className="action-btn"
          style={{ padding: '10px 16px', cursor: 'pointer' }}
          title="Réinitialiser les filtres"
        >
          🔄 Réinitialiser
        </button>
      </div>

      {/* ---------- Compteur ---------- */}
      <div style={{ marginBottom: '12px', color: '#666', fontSize: '0.9em' }}>
        {filteredUsers.length === users.length
          ? `${users.length} utilisateur(s) affiché(s)`
          : `${filteredUsers.length} résultat(s) sur ${users.length} utilisateur(s)`}
      </div>

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
            {filteredUsers.length > 0 ? filteredUsers.map(user => {
              const isBlocked = !user.is_active && !user.is_deleted;
              const isAnonymized = user.is_deleted;

              return (
                <tr key={user.id} style={isAnonymized ? { opacity: 0.5 } : undefined}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.address || '-'}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{formatDate(user.created_at)}</td>

                  <td>
                    {isAnonymized ? (
                      <span className="status-inactive">Anonymisé</span>
                    ) : isBlocked ? (
                      <div>
                        <span className="status-inactive">🚫 Bloqué</span>
                        {user.blocked_reason && (
                          <div className="blocked-reason" title={user.blocked_reason}>
                            « {user.blocked_reason} »
                          </div>
                        )}
                        {user.blocked_at && (
                          <div className="blocked-date">
                            le {formatDateTime(user.blocked_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="status-active">Actif</span>
                    )}
                  </td>

                  <td className="actions-cell">
                    <button
                      onClick={() => handleOpenDetails(user)}
                      className="action-btn"
                      title="Voir panier & wishlist"
                    >
                      👁️
                    </button>

                    <button
                      onClick={() => handleOpenHistory(user)}
                      className="action-btn"
                      title="Voir l'historique des commandes"
                    >
                      📜
                    </button>

                    <button
                      onClick={() => handleOpenModalForEdit(user)}
                      className="action-btn edit-btn"
                      title="Modifier"
                      disabled={user.is_deleted}
                    >
                      ✎
                    </button>

                    {!isAnonymized && (
                      isBlocked ? (
                        <button
                          onClick={() => handleUnblockUser(user.id, user.name)}
                          className="action-btn"
                          title="Débloquer le compte"
                        >
                          ✅
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenBlockModal(user)}
                          className="action-btn"
                          title="Bloquer le compte"
                        >
                          🚫
                        </button>
                      )
                    )}

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
              );
            }) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '20px'}}>
                  {searchTerm || statusFilter !== 'all'
                    ? '❌ Aucun utilisateur ne correspond à votre recherche.'
                    : 'Aucun utilisateur trouvé.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Modales ---------- */}
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

      {isDetailsModalOpen && (
        <UserDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetails}
          user={detailsUser}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}

      <BlockUserModal
        isOpen={isBlockModalOpen}
        onClose={handleCloseBlockModal}
        onConfirm={handleConfirmBlock}
        user={blockTarget}
        isLoading={isLoading}
      />

      <UserOrderHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistory}
        user={historyUser}
        apiBaseUrl={API_BASE_URL}
        adminToken={adminToken}
        onOpenOrderDetails={handleOpenOrderDetails}
      />

      {/* Modale détails commande — s'ouvre PAR-DESSUS la modale historique */}
      {isOrderDetailsModalOpen && selectedOrderId && (
        <OrderDetailsModal
          isOpen={isOrderDetailsModalOpen}
          onClose={handleCloseOrderDetails}
          orderId={selectedOrderId}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}

export default UserManagementPage;
