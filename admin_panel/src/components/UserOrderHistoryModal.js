// admin_panel/src/components/UserOrderHistoryModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

function UserOrderHistoryModal({
  isOpen,
  onClose,
  user,
  apiBaseUrl,
  adminToken,
  onOpenOrderDetails,
}) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchOrders = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get(
          `${apiBaseUrl}/orders/admin/all?user_id=${user.id}&limit=1000`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        setOrders(response.data.orders || []);
      } catch (err) {
        console.error('Erreur chargement commandes user:', err);
        setError(err.response?.data?.message || 'Impossible de charger les commandes.');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isOpen, user, apiBaseUrl, adminToken]);

  if (!isOpen || !user) return null;

  // ---------- Calcul des stats ----------
  const paidOrders = orders.filter(
    (o) => !['cancelled', 'refunded', 'failed'].includes(o.status)
  );
  const totalSpent = paidOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const totalOrders = orders.length;
  const paidCount = paidOrders.length;
  const averageOrder = paidCount > 0 ? totalSpent / paidCount : 0;
  const lastOrder = orders[0];

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

  const formatMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 999 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 6px 0' }}>📜 Historique de {user.name}</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            {user.email}
            {user.phone && ` · ${user.phone}`}
            {user.created_at && ` · Inscrit le ${formatDate(user.created_at)}`}
          </p>
        </div>

        {isLoading && (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
            Chargement des commandes...
          </p>
        )}

        {error && (
          <p style={{ color: '#991b1b', background: '#fee2e2', padding: '10px', borderRadius: '6px' }}>
            {error}
          </p>
        )}

        {!isLoading && !error && (
          <>
            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <StatCard label="Commandes" value={totalOrders} sublabel={`${paidCount} payées`} />
              <StatCard
                label="Total dépensé"
                value={formatMoney(totalSpent)}
                sublabel="hors annulées"
                highlight
              />
              <StatCard label="Panier moyen" value={formatMoney(averageOrder)} />
              <StatCard
                label="Dernière cmd."
                value={lastOrder ? formatDate(lastOrder.createdAt) : '—'}
              />
            </div>

            {/* Tableau */}
            {orders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                Aucune commande pour cet utilisateur.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>N° Commande</th>
                      <th>Date</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const statusInfo = STATUS_LABELS[order.status] || {
                        label: order.status,
                        color: '#374151',
                        bg: '#f3f4f6',
                      };
                      return (
                        <tr key={order.orderId}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                            {order.order_number}
                          </td>
                          <td>{formatDateTime(order.createdAt)}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: '0.82em',
                              fontWeight: 600,
                              color: statusInfo.color,
                              backgroundColor: statusInfo.bg,
                              whiteSpace: 'nowrap',
                            }}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatMoney(order.total)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="action-btn edit-btn"
                              title="Voir détails"
                              onClick={() => {
                                if (onOpenOrderDetails) {
                                  onOpenOrderDetails(order.orderId);
                                }
                              }}
                            >
                              👁️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Bouton fermer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="action-btn" onClick={onClose} style={{ padding: '10px 20px' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Carte de stat ----------
function StatCard({ label, value, sublabel, highlight }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: highlight ? '#eef2ff' : '#f9fafb',
      border: `1px solid ${highlight ? '#c7d2fe' : '#e5e7eb'}`,
      borderRadius: '10px',
    }}>
      <div style={{
        fontSize: '0.78rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.4rem',
        fontWeight: 700,
        color: highlight ? '#3730a3' : '#111827',
        marginTop: '4px',
      }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

export default UserOrderHistoryModal;
