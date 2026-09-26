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
import './UserManagementPage.css';

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

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);

  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Menu d'actions ouvert (par user id) — géré en state pour ne pas avoir mille boutons visibles
  const [openMenuId, setOpenMenuId] = useState(null);

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

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ---------- Filtrage ----------
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
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }, [users, searchTerm, statusFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // ---------- Actions ----------
  const handleOpenModalForEdit = (user) => { setSelectedUser(user); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedUser(null); setError(''); };

  const handleOpenDetails = (user) => { setDetailsUser(user); setIsDetailsModalOpen(true); };
  const handleCloseDetails = () => { setIsDetailsModalOpen(false); setDetailsUser(null); };

  const handleOpenHistory = (user) => { setHistoryUser(user); setIsHistoryModalOpen(true); };
  const handleCloseHistory = () => { setIsHistoryModalOpen(false); setHistoryUser(null); };

  const handleOpenOrderDetails = (orderId) => { setSelectedOrderId(orderId); setIsOrderDetailsModalOpen(true); };
  const handleCloseOrderDetails = () => { setIsOrderDetailsModalOpen(false); setSelectedOrderId(null); };

  const handleSaveUser = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleOpenBlockModal = (user) => { setBlockTarget(user); setIsBlockModalOpen(true); };
  const handleCloseBlockModal = () => {
    if (isLoading) return;
    setIsBlockModalOpen(false);
    setBlockTarget(null);
  };

  const handleConfirmBlock = async (reason) => {
    if (!blockTarget) return;
    setIsLoading(true); setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/users/${blockTarget.id}`,
        { is_active: false, blocked_reason: reason },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      setIsBlockModalOpen(false); setBlockTarget(null); fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du blocage.');
    } finally { setIsLoading(false); }
  };

  const handleUnblockUser = async (userId, userName) => {
    if (!window.confirm(`Débloquer "${userName}" ?`)) return;
    setIsLoading(true); setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}`,
        { is_active: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du déblocage.');
    } finally { setIsLoading(false); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Supprimer définitivement "${userName}" ? Cette action est irréversible.`)) return;
    setIsLoading(true); setError('');
    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      fetchUsers();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.hasOrders) {
        const veutAnonymiser = window.confirm(
          `${err.response.data.message}\n\nVoulez-vous anonymiser ce compte à la place ?`
        );
        if (veutAnonymiser) await handleAnonymizeUser(userId, userName, false);
      } else {
        setError(err.response?.data?.message || "Erreur lors de la suppression.");
      }
    } finally { setIsLoading(false); }
  };

  const handleAnonymizeUser = async (userId, userName, askConfirm = true) => {
    if (askConfirm) {
      const confirme = window.confirm(
        `Anonymiser "${userName}" ? Son nom, email, adresse et téléphone seront effacés. Ses commandes resteront visibles pour vos statistiques.`
      );
      if (!confirme) return;
    }
    setIsLoading(true); setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/users/${userId}/anonymize`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'anonymisation.");
    } finally { setIsLoading(false); }
  };

  // ---------- Utilitaires ----------
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      dateStyle: 'short', timeStyle: 'short',
    });
  };

  // Couleur d'avatar déterministe basée sur l'id (comme GitHub)
  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
  const getAvatarColor = (id) => avatarColors[(Number(id) || 0) % avatarColors.length];

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return '??';
  };

  // ---------- Stats ----------
  const stats = useMemo(() => ({
    total: users.length,
    actifs: users.filter(u => u.is_active && !u.is_deleted).length,
    bloques: users.filter(u => !u.is_active && !u.is_deleted).length,
    anonymises: users.filter(u => u.is_deleted).length,
  }), [users]);

  if (isLoading && users.length === 0) {
    return <div className="um-page"><div className="um-loading">Chargement des utilisateurs…</div></div>;
  }

  return (
    <div className="um-page">
      {/* ---------- Header ---------- */}
      <div className="um-header">
        <div>
          <h1 className="um-title">👥 Gestion des utilisateurs</h1>
          <p className="um-subtitle">
            {filteredUsers.length === users.length
              ? `${users.length} utilisateur${users.length > 1 ? 's' : ''} au total`
              : `${filteredUsers.length} résultat${filteredUsers.length > 1 ? 's' : ''} sur ${users.length}`}
          </p>
        </div>
        <Link to="/dashboard" className="um-back-link">← Tableau de bord</Link>
      </div>

      {/* ---------- Cartes stats ---------- */}
      <div className="um-stats">
        <div className="um-stat-card">
          <div className="um-stat-label">Total</div>
          <div className="um-stat-value">{stats.total}</div>
        </div>
        <div className="um-stat-card um-stat-active">
          <div className="um-stat-label">Actifs</div>
          <div className="um-stat-value">{stats.actifs}</div>
        </div>
        <div className="um-stat-card um-stat-blocked">
          <div className="um-stat-label">Bloqués</div>
          <div className="um-stat-value">{stats.bloques}</div>
        </div>
        <div className="um-stat-card um-stat-anon">
          <div className="um-stat-label">Anonymisés</div>
          <div className="um-stat-value">{stats.anonymises}</div>
        </div>
      </div>

      {/* ---------- Barre de recherche + filtres ---------- */}
      <div className="um-toolbar">
        <div className="um-search">
          <span className="um-search-icon">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone, ville…"
            className="um-search-input"
          />
          {searchTerm && (
            <button className="um-search-clear" onClick={() => setSearchTerm('')} title="Effacer">
              ✕
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="um-filter-select"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">✅ Actifs</option>
          <option value="blocked">🚫 Bloqués</option>
          <option value="anonymized">🕶️ Anonymisés</option>
        </select>

        {(searchTerm || statusFilter !== 'all') && (
          <button onClick={handleResetFilters} className="um-btn-ghost" title="Réinitialiser">
            🔄 Réinitialiser
          </button>
        )}
      </div>

      {error && <div className="um-error">{error}</div>}
      {isLoading && users.length > 0 && (
        <div className="um-loading-bar">Mise à jour…</div>
      )}

      {/* ---------- Tableau ---------- */}
      <div className="um-table-wrapper">
        <table className="um-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Contact</th>
              <th>Localisation</th>
              <th>Inscription</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="um-empty">
                  {searchTerm || statusFilter !== 'all'
                    ? '❌ Aucun utilisateur ne correspond à votre recherche.'
                    : 'Aucun utilisateur trouvé.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isBlocked = !user.is_active && !user.is_deleted;
                const isAnonymized = user.is_deleted;

                return (
                  <tr
                    key={user.id}
                    className={isAnonymized ? 'um-row-anon' : ''}
                  >
                    {/* Utilisateur avec avatar */}
                    <td>
                      <div className="um-user-cell">
                        <div
                          className="um-avatar"
                          style={{ backgroundColor: getAvatarColor(user.id) }}
                        >
                          {getInitials(user.name, user.email)}
                        </div>
                        <div className="um-user-info">
                          <div className="um-user-name">{user.name || '—'}</div>
                          <div className="um-user-id">#{user.id} · {user.role}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td>
                      <div className="um-contact">
                        <div className="um-contact-line">
                          <span className="um-contact-icon">✉️</span>
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="um-contact-line um-muted">
                            <span className="um-contact-icon">📞</span>
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Localisation */}
                    <td>
                      {user.address ? (
                        <div className="um-contact-line">
                          <span className="um-contact-icon">📍</span>
                          <span>{user.address}</span>
                        </div>
                      ) : (
                        <span className="um-muted">—</span>
                      )}
                    </td>

                    {/* Inscription */}
                    <td>
                      <span className="um-date">{formatDate(user.created_at)}</span>
                    </td>

                    {/* Statut */}
                    <td>
                      {isAnonymized ? (
                        <span className="um-badge um-badge-gray">🕶️ Anonymisé</span>
                      ) : isBlocked ? (
                        <div className="um-status-cell">
                          <span className="um-badge um-badge-red">🚫 Bloqué</span>
                          {user.blocked_reason && (
                            <div
                              className="um-block-reason"
                              title={user.blocked_reason}
                            >
                              {user.blocked_reason}
                            </div>
                          )}
                          {user.blocked_at && (
                            <div className="um-block-date">
                              le {formatDateTime(user.blocked_at)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="um-badge um-badge-green">✅ Actif</span>
                      )}
                    </td>

                    {/* Actions — menu déroulant */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="um-actions">
                        <button
                          className="um-btn-icon"
                          title="Voir panier & wishlist"
                          onClick={() => handleOpenDetails(user)}
                        >
                          👁️
                        </button>

                        <button
                          className="um-btn-icon"
                          title="Historique commandes"
                          onClick={() => handleOpenHistory(user)}
                        >
                          📜
                        </button>

                        <div className="um-menu-container">
                          <button
                            className="um-btn-icon"
                            title="Plus d'actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === user.id ? null : user.id);
                            }}
                          >
                            ⋯
                          </button>

                          {openMenuId === user.id && (
                            <div className="um-menu" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="um-menu-item"
                                onClick={() => { setOpenMenuId(null); handleOpenModalForEdit(user); }}
                                disabled={user.is_deleted}
                              >
                                ✎ Modifier
                              </button>

                              {!isAnonymized && (
                                isBlocked ? (
                                  <button
                                    className="um-menu-item"
                                    onClick={() => { setOpenMenuId(null); handleUnblockUser(user.id, user.name); }}
                                  >
                                    ✅ Débloquer
                                  </button>
                                ) : (
                                  <button
                                    className="um-menu-item"
                                    onClick={() => { setOpenMenuId(null); handleOpenBlockModal(user); }}
                                  >
                                    🚫 Bloquer
                                  </button>
                                )
                              )}

                              <button
                                className="um-menu-item"
                                onClick={() => { setOpenMenuId(null); handleAnonymizeUser(user.id, user.name); }}
                                disabled={user.is_deleted}
                              >
                                🕶️ Anonymiser
                              </button>

                              <button
                                className="um-menu-item um-menu-item-danger"
                                onClick={() => { setOpenMenuId(null); handleDeleteUser(user.id, user.name); }}
                                disabled={user.is_deleted}
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Modales ---------- */}
      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveUser}
          userToEdit={selectedUser} apiBaseUrl={API_BASE_URL} adminToken={adminToken}
        />
      )}

      {isDetailsModalOpen && (
        <UserDetailsModal
          isOpen={isDetailsModalOpen} onClose={handleCloseDetails}
          user={detailsUser} apiBaseUrl={API_BASE_URL} adminToken={adminToken}
        />
      )}

      <BlockUserModal
        isOpen={isBlockModalOpen} onClose={handleCloseBlockModal}
        onConfirm={handleConfirmBlock} user={blockTarget} isLoading={isLoading}
      />

      <UserOrderHistoryModal
        isOpen={isHistoryModalOpen} onClose={handleCloseHistory}
        user={historyUser} apiBaseUrl={API_BASE_URL} adminToken={adminToken}
        onOpenOrderDetails={handleOpenOrderDetails}
      />

      {isOrderDetailsModalOpen && selectedOrderId && (
        <OrderDetailsModal
          isOpen={isOrderDetailsModalOpen} onClose={handleCloseOrderDetails}
          orderId={selectedOrderId} apiBaseUrl={API_BASE_URL} adminToken={adminToken}
        />
      )}
    </div>
  );
}

export default UserManagementPage;
