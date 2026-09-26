// admin_panel/src/pages/OrderManagementPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';

const ORDER_STATUSES = ['pending', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];

const STATUS_LABELS = {
  pending:           { label: 'En attente',       color: '#92400e', bg: '#fef3c7' },
  awaiting_payment:  { label: 'Attente paiement', color: '#92400e', bg: '#fef3c7' },
  paid:              { label: 'Payée',            color: '#1e40af', bg: '#dbeafe' },
  processing:        { label: 'En préparation',   color: '#1e40af', bg: '#dbeafe' },
  shipped:           { label: 'Expédiée',         color: '#1e40af', bg: '#dbeafe' },
  delivered:         { label: 'Livrée',           color: '#166534', bg: '#dcfce7' },
  cancelled:         { label: 'Annulée',          color: '#991b1b', bg: '#fee2e2' },
  refunded:          { label: 'Remboursée',       color: '#991b1b', bg: '#fee2e2' },
  failed:            { label: 'Échouée',          color: '#991b1b', bg: '#fee2e2' },
};

function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // ---------- Chargement (SANS filtre user_id, on va tout filtrer côté client) ----------
  const fetchOrders = useCallback(async (pageToFetch, currentFilterStatus, currentDateFrom, currentDateTo) => {
    if (!adminToken) {
      navigate('/login');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', String(pageToFetch));
      params.append('limit', String(ITEMS_PER_PAGE));
      if (currentFilterStatus) params.append('status', currentFilterStatus);
      if (currentDateFrom) params.append('date_from', currentDateFrom);
      if (currentDateTo) params.append('date_to', currentDateTo);

      const response = await axios.get(`${API_BASE_URL}/orders/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setOrders(response.data.orders || []);
      setCurrentPage(response.data.currentPage || pageToFetch);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (err) {
      console.error("Erreur chargement commandes (admin):", err);
      setError(err.response?.data?.message || 'Impossible de charger les commandes.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate, ITEMS_PER_PAGE]);

  useEffect(() => {
    fetchOrders(currentPage, filterStatus, filterDateFrom, filterDateTo);
  }, [currentPage, filterStatus, filterDateFrom, filterDateTo, fetchOrders]);

  // ---------- Filtrage côté client (recherche uniquement) ----------
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((order) => {
      const addr = order.shipping_address || {};
      const haystack = [
        String(order.orderId || ''),
        order.order_number || '',
        order.userName || '',
        order.userEmail || '',
        addr.country || '',
        addr.city || '',
        addr.address || '',
        addr.phone || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [orders, searchTerm]);

  // ---------- Raccourcis de date ----------
  const setDateRange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fmt = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      setFilterDateFrom(fmt(today));
      setFilterDateTo(fmt(today));
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setFilterDateFrom(fmt(y));
      setFilterDateTo(fmt(y));
    } else if (preset === '7d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      setFilterDateFrom(fmt(d));
      setFilterDateTo(fmt(today));
    } else if (preset === '30d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      setFilterDateFrom(fmt(d));
      setFilterDateTo(fmt(today));
    } else if (preset === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilterDateFrom(fmt(first));
      setFilterDateTo(fmt(today));
    } else if (preset === 'all') {
      setFilterDateFrom('');
      setFilterDateTo('');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // ---------- Changement de statut ----------
  const handleStatusChange = async (orderId, newStatus) => {
    if (!adminToken) return;
    if (!ORDER_STATUSES.includes(newStatus)) {
      alert("Statut invalide sélectionné.");
      return;
    }
    if (newStatus === 'cancelled' && !window.confirm("Confirmer l'annulation de cette commande ?")) return;

    setIsLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/orders/admin/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.orderId === orderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order
        )
      );
    } catch (err) {
      console.error("Erreur MàJ statut commande:", err);
      alert(err.response?.data?.message || "Erreur lors de la mise à jour du statut.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Utilitaires ----------
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getCountry = (order) => {
    const addr = order.shipping_address || {};
    return addr.country || '—';
  };

  const getCity = (order) => {
    const addr = order.shipping_address || {};
    return addr.city || '';
  };

  const handleOpenDetailsModal = (orderId) => {
    setSelectedOrderId(orderId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrderId(null);
  };

  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  useEffect(() => {
    if (!isLoading && !initialLoadAttempted) {
      setInitialLoadAttempted(true);
    }
  }, [isLoading, initialLoadAttempted]);

  if (isLoading && !initialLoadAttempted) {
    return <div className="management-page" style={{ padding: '20px', textAlign: 'center' }}><p>Chargement des commandes...</p></div>;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Gestion des Commandes</h1>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {/* ---------- Barre de recherche globale ---------- */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Rechercher par client, email, n° commande, pays, ville..."
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '0.95rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ---------- Filtres ---------- */}
      <div className="filters-container" style={{
        display: 'flex', flexWrap: 'wrap', gap: '15px',
        padding: '15px', border: '1px solid #e2e8f0',
        borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f9fafb'
      }}>
        <div>
          <label htmlFor="statusFilter" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Statut :</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
          >
            <option value="">Tous</option>
            {ORDER_STATUSES.map(status => (
              <option key={status} value={status}>{STATUS_LABELS[status]?.label || status}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dateFromFilter" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Date (De) :</label>
          <input
            type="date"
            id="dateFromFilter"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label htmlFor="dateToFilter" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Date (À) :</label>
          <input
            type="date"
            id="dateToFilter"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={handleResetFilters} className="action-btn" style={{ padding: '10px 16px', cursor: 'pointer' }}>
            🔄 Réinitialiser
          </button>
        </div>
      </div>

      {/* ---------- Raccourcis date ---------- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'today',     label: "Aujourd'hui" },
          { key: 'yesterday', label: 'Hier' },
          { key: '7d',        label: '7 derniers jours' },
          { key: '30d',       label: '30 derniers jours' },
          { key: 'month',     label: 'Ce mois-ci' },
          { key: 'all',       label: 'Tout' },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setDateRange(p.key)}
            className="action-btn"
            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '0.88em' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ---------- Compteur ---------- */}
      <div style={{ marginBottom: '12px', color: '#666', fontSize: '0.9em' }}>
        {searchTerm
          ? `${filteredOrders.length} résultat(s) sur cette page (${totalItems} commandes au total)`
          : `${totalItems} commande(s) au total`}
      </div>

      {error && <p className="error-message">{error}</p>}
      {isLoading && initialLoadAttempted && <p className="loading-indicator">Mise à jour des données...</p>}

      {/* ---------- Tableau ---------- */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>N° Commande</th>
              <th>Client</th>
              <th>Date & Heure</th>
              <th>Pays</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? filteredOrders.map(order => {
              const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: '#374151', bg: '#f3f4f6' };
              const country = getCountry(order);
              const city = getCity(order);

              return (
                <tr key={order.orderId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{order.order_number}</td>
                  <td>
                    <div><strong>{order.userName || 'N/A'}</strong></div>
                    <div style={{ fontSize: '0.8em', color: '#6b7280' }}>{order.userEmail || 'N/A'}</div>
                  </td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <div>{country}</div>
                    {city && <div style={{ fontSize: '0.8em', color: '#6b7280' }}>{city}</div>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{Number(order.total).toLocaleString('fr-FR')} {order.currency || 'F'}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.orderId, e.target.value)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        minWidth: '140px',
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                        fontWeight: 600,
                        fontSize: '0.85em',
                      }}
                      disabled={isLoading}
                    >
                      {ORDER_STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleOpenDetailsModal(order.orderId)}
                      className="action-btn edit-btn"
                      title="Voir Détails"
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  {searchTerm
                    ? '❌ Aucune commande ne correspond à votre recherche sur cette page.'
                    : (filterStatus || filterDateFrom || filterDateTo
                        ? 'Aucune commande ne correspond à vos filtres.'
                        : 'Aucune commande trouvée.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      {totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading}>Précédent</button>
          <span>Page {currentPage} sur {totalPages} ({totalItems} commandes)</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isLoading}>Suivant</button>
        </div>
      )}

      {/* ---------- Modale détails ---------- */}
      {isDetailsModalOpen && selectedOrderId && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          orderId={selectedOrderId}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}

export default OrderManagementPage;
