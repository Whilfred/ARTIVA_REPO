// admin_panel/src/pages/OrderManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import OrderDetailsModal from '../components/OrderDetailsModal';
import './ProductManagementPage.css'; // On réutilise les styles généraux et de tableau

const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api'; // Déplacé en haut pour la portée globale du module

// Statuts possibles pour le filtre et le changement de statut
const ORDER_STATUSES = ['pending', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];

function OrderManagementPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Gère tous les états de chargement (fetch initial, actions)
  const [error, setError] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 10; 

  const [filterStatus, setFilterStatus] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // fetchOrders est maintenant mémorisé avec useCallback
  const fetchOrders = useCallback(async (pageToFetch, currentFilterStatus, currentFilterUserId, currentDateFrom, currentDateTo) => {
    console.log(`fetchOrders appelé avec page: ${pageToFetch}, status: ${currentFilterStatus}, user: ${currentFilterUserId}, from: ${currentDateFrom}, to: ${currentDateTo}`);
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
      if (currentFilterUserId) params.append('user_id', currentFilterUserId);
      if (currentDateFrom) params.append('date_from', currentDateFrom);
      if (currentDateTo) params.append('date_to', currentDateTo);
      
      const response = await axios.get(`${API_BASE_URL}/orders/admin/all?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      setOrders(response.data.orders || []);
      // Ne pas mettre à jour currentPage ici si c'est fetchOrders qui est appelé à cause d'un changement de currentPage.
      // La réponse de l'API devrait confirmer la page, mais c'est la source du changement qui prime.
      // Sauf si la pagination backend corrige la page demandée (ex: page > totalPages).
      setCurrentPage(response.data.currentPage || pageToFetch); 
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (err) {
      console.error("Erreur chargement commandes (admin):", err);
      setError(err.response?.data?.message || 'Impossible de charger les commandes.');
      setOrders([]); // Vider en cas d'erreur pour éviter d'afficher des données obsolètes
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate, ITEMS_PER_PAGE]); // ITEMS_PER_PAGE est une constante, donc pas besoin de la mettre si elle est hors du composant

  // useEffect principal pour charger les données quand les filtres ou la page changent
  useEffect(() => {
    console.log("useEffect principal [currentPage, filterStatus, ...] déclenché - Appel de fetchOrders");
    fetchOrders(currentPage, filterStatus, filterUserId, filterDateFrom, filterDateTo);
  }, [currentPage, filterStatus, filterUserId, filterDateFrom, filterDateTo, fetchOrders]);
  // fetchOrders est inclus car sa référence est stable grâce à useCallback.

  // Fonctions pour changer les filtres et réinitialiser la page à 1
  const handleFilterStatusChange = (newStatus) => {
    setFilterStatus(newStatus);
    setCurrentPage(1); 
  };
  const handleFilterUserIdChange = (newUserId) => {
    setFilterUserId(newUserId);
    setCurrentPage(1);
  };
  const handleFilterDateFromChange = (newDateFrom) => {
    setFilterDateFrom(newDateFrom);
    setCurrentPage(1);
  };
  const handleFilterDateToChange = (newDateTo) => {
    setFilterDateTo(newDateTo);
    setCurrentPage(1);
  };

  // L'useEffect avec setTimeout (debounce) a été retiré car il pouvait créer des complexités.
  // Le fetch est maintenant directement déclenché par les changements des états de filtre/page.
  // Si tu constates trop d'appels API pendant la saisie (ex: pour filterUserId), on pourra réintroduire un debounce plus ciblé.

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
        { headers: { 'Authorization': `Bearer ${adminToken}` } }
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short'});
  };

  const handleOpenDetailsModal = (orderId) => {
    setSelectedOrderId(orderId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrderId(null);
  };

  // Gestion du loader initial
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  useEffect(() => {
    // Marquer que le premier chargement a été tenté une fois que isLoading est false
    if (!isLoading && !initialLoadAttempted) {
      setInitialLoadAttempted(true);
    }
  }, [isLoading, initialLoadAttempted]);


  if (isLoading && !initialLoadAttempted) { // Afficher seulement au tout premier chargement
    return <div className="management-page" style={{padding: '20px', textAlign: 'center'}}><p>Chargement des commandes...</p></div>;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Gestion des Commandes</h1>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>
      
      <div className="filters-container" style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '15px', 
          padding: '15px', border: '1px solid #e2e8f0', 
          borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f9fafb' 
      }}>
        <div>
          <label htmlFor="statusFilter" style={{display:'block', marginBottom:'5px', fontSize:'0.9em'}}>Statut :</label>
          <select id="statusFilter" value={filterStatus} onChange={(e) => handleFilterStatusChange(e.target.value)}
            style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px'}}>
            <option value="">Tous</option>
            {ORDER_STATUSES.map(status => (<option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="userIdFilter" style={{display:'block', marginBottom:'5px', fontSize:'0.9em'}}>ID Utilisateur :</label>
          <input type="number" id="userIdFilter" value={filterUserId} onChange={(e) => handleFilterUserIdChange(e.target.value)} 
                 placeholder="ID Client" style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100px'}}/>
        </div>
        <div>
          <label htmlFor="dateFromFilter" style={{display:'block', marginBottom:'5px', fontSize:'0.9em'}}>Date (De) :</label>
          <input type="date" id="dateFromFilter" value={filterDateFrom} onChange={(e) => handleFilterDateFromChange(e.target.value)} 
                 style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}/>
        </div>
        <div>
          <label htmlFor="dateToFilter" style={{display:'block', marginBottom:'5px', fontSize:'0.9em'}}>Date (À) :</label>
          <input type="date" id="dateToFilter" value={filterDateTo} onChange={(e) => handleFilterDateToChange(e.target.value)} 
                 style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}/>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {/* Indicateur de chargement pendant les fetches de filtres/pagination (pas le premier) */}
      {isLoading && initialLoadAttempted && <p className="loading-indicator">Mise à jour des données...</p>}

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th><th>N° Commande</th><th>Client (Email)</th><th>Date</th><th>Total</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? orders.map(order => (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>{order.order_number}</td>
                <td>{order.userName || 'N/A'} <small>({order.userEmail || 'N/A'})</small></td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.total} {order.currency}</td>
                <td>
                  <select 
                    value={order.status} 
                    onChange={(e) => handleStatusChange(order.orderId, e.target.value)}
                    style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '120px'}}
                    disabled={isLoading}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </td>
                <td className="actions-cell">
                  <button onClick={() => handleOpenDetailsModal(order.orderId)} className="action-btn edit-btn" title="Voir Détails">👁️</button>
                </td>
              </tr>
            )) : ( 
              <tr>
                <td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>
                    {/* Afficher le loader ici si isLoading est vrai et que orders est vide après la tentative de chargement initiale */}
                    {isLoading && initialLoadAttempted ? "Chargement..." : 
                     (filterStatus || filterUserId || filterDateFrom || filterDateTo ? "Aucune commande ne correspond à vos filtres." : "Aucune commande trouvée.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading}>Précédent</button>
          <span>Page {currentPage} sur {totalPages} ({totalItems} commandes)</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isLoading}>Suivant</button>
        </div>
      )}

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