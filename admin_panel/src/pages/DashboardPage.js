// admin_panel/src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Users, Package, UserPlus, Filter, X } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart
} from 'recharts';
import './DashboardPage.css';

const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';
const ORDER_STATUSES = ['pending', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];
const NON_REVENUE_STATUSES = ['cancelled', 'refunded', 'failed'];

const STATUS_LABELS = {
  pending: 'En attente', awaiting_payment: 'Attente paiement', paid: 'Payée',
  processing: 'En traitement', shipped: 'Expédiée', delivered: 'Livrée',
  cancelled: 'Annulée', refunded: 'Remboursée', failed: 'Échouée'
};

const STATUS_COLORS = {
  pending: '#d69e2e', awaiting_payment: '#dd6b20', paid: '#3182ce',
  processing: '#805ad5', shipped: '#2c7a7b', delivered: '#38a169',
  cancelled: '#a0aec0', refunded: '#718096', failed: '#e53e3e'
};

const CATEGORY_COLORS = ['#3182ce', '#38a169', '#d69e2e', '#805ad5', '#dd6b20', '#2c7a7b', '#e53e3e', '#718096'];

function formatDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function isWithinRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd) return false;
  }
  return true;
}

function buildTimeSeries(orders, explicitFrom, explicitTo) {
  let start, end;
  if (explicitFrom && explicitTo) {
    start = new Date(explicitFrom);
    end = new Date(explicitTo);
  } else if (orders.length > 0) {
    const dates = orders.map(o => new Date(o.createdAt));
    start = new Date(Math.min(...dates));
    end = new Date(Math.max(...dates));
  } else {
    return [];
  }

  const spanDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  const groupByMonth = spanDays > 90;
  const dayMs = 86400000;
  const map = {};

  const makeLabel = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  if (!groupByMonth) {
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    for (let d = new Date(startDay); d <= endDay; d = new Date(d.getTime() + dayMs)) {
      const key = formatDateInput(d);
      map[key] = { date: key, label: makeLabel(d), revenue: 0, orders: 0 };
    }
  }

  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = groupByMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : formatDateInput(d);
    if (!map[key]) {
      map[key] = groupByMonth
        ? { date: key, label: key, revenue: 0, orders: 0 }
        : { date: key, label: makeLabel(d), revenue: 0, orders: 0 };
    }
    map[key].orders += 1;
    if (!NON_REVENUE_STATUSES.includes(o.status)) {
      map[key].revenue += parseFloat(o.total) || 0;
    }
  });

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function buildUsersSeries(users, explicitFrom, explicitTo) {
  const filtered = explicitFrom && explicitTo
    ? users.filter(u => isWithinRange(u.created_at, explicitFrom, explicitTo))
    : users;
  if (filtered.length === 0) return [];

  const dates = filtered.map(u => new Date(u.created_at));
  const start = explicitFrom ? new Date(explicitFrom) : new Date(Math.min(...dates));
  const end = explicitTo ? new Date(explicitTo) : new Date(Math.max(...dates));
  const spanDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  const groupByMonth = spanDays > 90;
  const dayMs = 86400000;
  const map = {};

  const makeLabel = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  if (!groupByMonth) {
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    for (let d = new Date(startDay); d <= endDay; d = new Date(d.getTime() + dayMs)) {
      const key = formatDateInput(d);
      map[key] = { date: key, label: makeLabel(d), count: 0 };
    }
  }

  filtered.forEach(u => {
    const d = new Date(u.created_at);
    const key = groupByMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : formatDateInput(d);
    if (!map[key]) {
      map[key] = groupByMonth
        ? { date: key, label: key, count: 0 }
        : { date: key, label: makeLabel(d), count: 0 };
    }
    map[key].count += 1;
  });

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function DashboardPage() {
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('adminToken');

  const [orders, setOrders] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [allProductsList, setAllProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataMayBeIncomplete, setDataMayBeIncomplete] = useState(false);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeQuickRange, setActiveQuickRange] = useState('all');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [topProducts, setTopProducts] = useState([]);
  const [isLoadingTopProducts, setIsLoadingTopProducts] = useState(false);
  const [topProductsError, setTopProductsError] = useState('');
  const [topProductsLoaded, setTopProductsLoaded] = useState(false);

  const fetchDashboardData = useCallback(async (dateFrom, dateTo, status) => {
    if (!adminToken) { navigate('/login'); return; }
    setIsLoading(true);
    setError('');
    setTopProducts([]);
    setTopProductsLoaded(false);
    setTopProductsError('');
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '1000');
      if (status) params.append('status', status);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const [ordersRes, usersRes, productsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/orders/admin/all?${params.toString()}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        axios.get(`${API_BASE_URL}/products/admin/all`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
      ]);

      const fetchedOrders = ordersRes.data.orders || [];
      setOrders(fetchedOrders);
      setDataMayBeIncomplete((ordersRes.data.totalItems || 0) > fetchedOrders.length);

      setUsersList(usersRes.data || []);
      setAllProductsList(productsRes.data.products || []);

    } catch (err) {
      console.error("DashboardPage: erreur chargement données:", err);
      setError(err.response?.data?.message || 'Impossible de charger les données du tableau de bord.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate]);

  useEffect(() => {
    fetchDashboardData('', '', '');
  }, [fetchDashboardData]);

  const applyQuickRange = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromStr = formatDateInput(from);
    const toStr = formatDateInput(to);
    setFilterDateFrom(fromStr);
    setFilterDateTo(toStr);
    setActiveQuickRange(String(days));
    fetchDashboardData(fromStr, toStr, filterStatus);
  };

  const applyAllTime = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setActiveQuickRange('all');
    fetchDashboardData('', '', filterStatus);
  };

  const handleApplyFilters = () => {
    setActiveQuickRange('custom');
    fetchDashboardData(filterDateFrom, filterDateTo, filterStatus);
  };

  const handleResetFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus('');
    setActiveQuickRange('all');
    fetchDashboardData('', '', '');
  };

  const loadTopProducts = async () => {
    if (orders.length === 0) return;
    setIsLoadingTopProducts(true);
    setTopProductsError('');
    try {
      const productMap = {};
      const batchSize = 5;
      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(o =>
            axios.get(`${API_BASE_URL}/orders/admin/${o.orderId}`, {
              headers: { Authorization: `Bearer ${adminToken}` }
            }).catch(err => {
              console.error('Erreur chargement détail commande', o.orderId, err);
              return null;
            })
          )
        );
        results.forEach(res => {
          if (!res || !res.data || !res.data.items) return;
          res.data.items.forEach(item => {
            const key = item.product_name || 'Produit inconnu';
            if (!productMap[key]) productMap[key] = { name: key, quantity: 0, revenue: 0 };
            productMap[key].quantity += item.quantity || 0;
            productMap[key].revenue += parseFloat(item.subtotal) || 0;
          });
        });
      }
      const sorted = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
      setTopProducts(sorted);
      setTopProductsLoaded(true);
    } catch (err) {
      console.error('DashboardPage: erreur chargement top produits', err);
      setTopProductsError('Erreur lors du calcul du classement des produits.');
    } finally {
      setIsLoadingTopProducts(false);
    }
  };

  // --- Calculs KPI ---
  const currency = orders[0]?.currency || 'XOF';
  const revenueOrders = orders.filter(o => !NON_REVENUE_STATUSES.includes(o.status));
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

  const newUsersInRange = useMemo(() => {
    if (filterDateFrom && filterDateTo) {
      return usersList.filter(u => isWithinRange(u.created_at, filterDateFrom, filterDateTo)).length;
    }
    return usersList.length;
  }, [usersList, filterDateFrom, filterDateTo]);

  const statusBreakdown = ORDER_STATUSES.map(status => {
    const ordersForStatus = orders.filter(o => o.status === status);
    return {
      status,
      label: STATUS_LABELS[status] || status,
      count: ordersForStatus.length,
      total: ordersForStatus.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
    };
  }).filter(s => s.count > 0);

  const timeSeries = useMemo(() => buildTimeSeries(orders, filterDateFrom, filterDateTo), [orders, filterDateFrom, filterDateTo]);
  const usersSeries = useMemo(() => buildUsersSeries(usersList, filterDateFrom, filterDateTo), [usersList, filterDateFrom, filterDateTo]);

  const categoryDistribution = useMemo(() => {
    const map = {};
    allProductsList.forEach(p => {
      (p.categories_names || []).forEach(catName => {
        if (!map[catName]) map[catName] = 0;
        map[catName] += 1;
      });
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [allProductsList]);

  const filterSummaryLabel = useMemo(() => {
    let base;
    if (activeQuickRange === '7') base = '7 derniers jours';
    else if (activeQuickRange === '30') base = '30 derniers jours';
    else if (activeQuickRange === '90') base = '90 derniers jours';
    else if (!filterDateFrom && !filterDateTo) base = 'Toutes les données';
    else if (filterDateFrom && filterDateTo) {
      const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      base = `Du ${fmt(filterDateFrom)} au ${fmt(filterDateTo)}`;
    } else {
      base = 'Période personnalisée';
    }
    return filterStatus ? `${base} • ${STATUS_LABELS[filterStatus] || filterStatus}` : base;
  }, [activeQuickRange, filterDateFrom, filterDateTo, filterStatus]);

  const totalProducts = allProductsList.length;
  const publishedProducts = allProductsList.filter(p => p.is_published).length;

  const formatMoney = (value) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;

  return (
    <div className="dashboard-container">
      {/* Header - logo uniquement */}
      <header className="dashboard-header">
        <div className="logo">
          <span className="logo-icon">●</span>
          <span className="logo-text">Admin</span>
        </div>
        <span className="filter-indicator">{filterSummaryLabel}</span>
      </header>

      {/* FILTRES - Version desktop avec boutons bien visibles */}
      <div className="filters-desktop">
        <div className="filters-row">
          <div className="filters-quick">
            <span className="filters-label">Période :</span>
            <button className={activeQuickRange === '7' ? 'active' : ''} onClick={() => applyQuickRange(7)}>7j</button>
            <button className={activeQuickRange === '30' ? 'active' : ''} onClick={() => applyQuickRange(30)}>30j</button>
            <button className={activeQuickRange === '90' ? 'active' : ''} onClick={() => applyQuickRange(90)}>90j</button>
            <button className={activeQuickRange === 'all' ? 'active' : ''} onClick={applyAllTime}>Tout</button>
          </div>
          <div className="filter-actions">
            <button onClick={handleApplyFilters} className="apply-btn">Appliquer</button>
            <button onClick={handleResetFilters} className="reset-btn">Réinitialiser</button>
          </div>
        </div>
        
        <div className="filters-main">
          <div className="filter-group">
            <label>Du</label>
            <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setActiveQuickRange('custom'); }} />
          </div>
          <div className="filter-group">
            <label>Au</label>
            <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setActiveQuickRange('custom'); }} />
          </div>
          <div className="filter-group">
            <label>Statut</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tous</option>
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Barre résumé mobile */}
      <div className="filter-summary-mobile">
        <span className="filter-summary-text">{filterSummaryLabel}</span>
        <button className="filter-summary-btn" onClick={() => setIsMobileFilterOpen(true)}>
          <Filter size={14} />
          Filtrer
        </button>
      </div>

      {/* Modal filtres mobile */}
      {isMobileFilterOpen && (
        <div className="filter-modal-overlay" onClick={() => setIsMobileFilterOpen(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Filtrer</h3>
              <button className="filter-modal-close" onClick={() => setIsMobileFilterOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="filter-modal-body">
              <div className="quick-ranges">
                <button className={activeQuickRange === '7' ? 'active' : ''} onClick={() => { applyQuickRange(7); setIsMobileFilterOpen(false); }}>7j</button>
                <button className={activeQuickRange === '30' ? 'active' : ''} onClick={() => { applyQuickRange(30); setIsMobileFilterOpen(false); }}>30j</button>
                <button className={activeQuickRange === '90' ? 'active' : ''} onClick={() => { applyQuickRange(90); setIsMobileFilterOpen(false); }}>90j</button>
                <button className={activeQuickRange === 'all' ? 'active' : ''} onClick={() => { applyAllTime(); setIsMobileFilterOpen(false); }}>Tout</button>
              </div>
              <div className="filter-group">
                <label>Du</label>
                <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setActiveQuickRange('custom'); }} />
              </div>
              <div className="filter-group">
                <label>Au</label>
                <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setActiveQuickRange('custom'); }} />
              </div>
              <div className="filter-group">
                <label>Statut</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Tous</option>
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
              </div>
              <div className="filter-modal-actions">
                <button onClick={() => { handleApplyFilters(); setIsMobileFilterOpen(false); }} className="apply-btn">Appliquer</button>
                <button onClick={() => { handleResetFilters(); setIsMobileFilterOpen(false); }} className="reset-btn">Réinitialiser</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="loading">Chargement...</div>}
      {dataMayBeIncomplete && !isLoading && (
        <div className="warning">⚠️ Données partielles — certaines commandes peuvent ne pas être incluses.</div>
      )}

      {!isLoading && (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon revenue">
                <TrendingUp size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Chiffre d'affaires</span>
                <span className="kpi-value">{formatMoney(totalRevenue)}</span>
                <span className="kpi-sub">Hors annulées/remboursées</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon avg">
                <ShoppingBag size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Panier moyen</span>
                <span className="kpi-value">{formatMoney(avgOrderValue)}</span>
                <span className="kpi-sub">Commandes valides</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon orders">
                <Package size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Commandes</span>
                <span className="kpi-value">{totalOrdersCount}</span>
                <span className="kpi-sub">Période sélectionnée</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon users">
                <Users size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Utilisateurs</span>
                <span className="kpi-value">{usersList.length}</span>
                <span className="kpi-sub">Total enregistrés</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon new-users">
                <UserPlus size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Nouveaux</span>
                <span className="kpi-value">{newUsersInRange}</span>
                <span className="kpi-sub">Sur la période</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon products">
                <Package size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Produits</span>
                <span className="kpi-value">{totalProducts}</span>
                <span className="kpi-sub">{publishedProducts} publiés</span>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="charts-grid">
            <div className="chart-card full">
              <h3>Évolution CA & Commandes</h3>
              {timeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(value, name) => name === "CA" ? formatMoney(value) : value} />
                    <Legend />
                    <Bar yAxisId="right" dataKey="orders" name="Commandes" fill="#e0e0e0" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="CA" stroke="#000" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <p className="empty-state">Aucune donnée</p>}
            </div>

            <div className="chart-card">
              <h3>Statuts des commandes</h3>
              {statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#ccc'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} cmd — ${formatMoney(props.payload.total)}`, props.payload.label]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="empty-state">Aucune commande</p>}
            </div>

            <div className="chart-card">
              <h3>Catégories de produits</h3>
              {categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryDistribution} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="count" name="Produits" radius={[0, 4, 4, 0]} fill="#000" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="empty-state">Aucune catégorie</p>}
            </div>

            <div className="chart-card full">
              <h3>Nouveaux utilisateurs</h3>
              {usersSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usersSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Inscriptions" fill="#000" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="empty-state">Aucune inscription</p>}
            </div>
          </div>

          {/* Top Produits */}
          <div className="chart-card full">
            <div className="card-header">
              <h3>Top 10 produits</h3>
              {!topProductsLoaded && (
                <button className="load-btn" onClick={loadTopProducts} disabled={isLoadingTopProducts || orders.length === 0}>
                  {isLoadingTopProducts ? 'Chargement...' : 'Charger'}
                </button>
              )}
            </div>
            {orders.length === 0 && <p className="empty-state">Aucune commande</p>}
            {topProductsError && <div className="error-message">{topProductsError}</div>}
            {isLoadingTopProducts && <div className="loading">Analyse des commandes...</div>}
            {topProductsLoaded && topProducts.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={Math.max(180, topProducts.length * 36)}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                    <Tooltip formatter={(value, name) => name === 'Revenu' ? formatMoney(value) : value} />
                    <Bar dataKey="quantity" name="Quantité" fill="#000" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table className="product-table">
                  <thead>
                    <tr><th>Produit</th><th>Quantité</th><th>Revenu</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.map(p => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td>{p.quantity}</td>
                        <td>{formatMoney(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Détail statuts */}
          <div className="chart-card full">
            <h3>Détail par statut</h3>
            {statusBreakdown.length > 0 ? (
              <div className="status-table">
                <div className="status-row header">
                  <span>Statut</span>
                  <span>Nombre</span>
                  <span>Total</span>
                </div>
                {statusBreakdown.map(s => (
                  <div key={s.status} className="status-row">
                    <span className={`status-label status-${s.status}`}>{s.label}</span>
                    <span>{s.count}</span>
                    <span>{formatMoney(s.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Aucune commande</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;