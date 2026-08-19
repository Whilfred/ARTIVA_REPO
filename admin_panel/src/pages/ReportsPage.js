// admin_panel/src/pages/ReportsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import reportService from '../services/reportService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { 
  Download, TrendingUp, Users, DollarSign, ShoppingCart,
  Calendar, Filter, Loader2
} from 'lucide-react';
import '../styles/ReportsPage.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [period, setPeriod] = useState('month');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        salesRes,
        topProductsRes,
        revenueRes,
        ordersRes,
        customerRes
      ] = await Promise.all([
        reportService.getDashboardMetrics(),
        reportService.getSalesData(period),
        reportService.getTopProducts(),
        reportService.getRevenueByCategory(),
        reportService.getRecentOrders(),
        reportService.getCustomerStats()
      ]);

      setMetrics(metricsRes);
      setSalesData(salesRes);
      setTopProducts(topProductsRes);
      setRevenueByCategory(revenueRes);
      setRecentOrders(ordersRes);
      setCustomerStats(customerRes);
    } catch (error) {
      console.error('Erreur chargement des données:', error);
      // Données de démonstration si l'API n'est pas prête
      setDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Données de démonstration pour tester l'interface
  const setDemoData = () => {
    setMetrics({
      totalRevenue: 456789,
      totalOrders: 1256,
      totalCustomers: 892,
      averageOrderValue: 363.68,
      revenueGrowth: 23.5,
      ordersGrowth: 15.2,
      customersGrowth: 8.7
    });

    setSalesData([
      { name: 'Jan', ventes: 45000 },
      { name: 'Fév', ventes: 52000 },
      { name: 'Mar', ventes: 48000 },
      { name: 'Avr', ventes: 61000 },
      { name: 'Mai', ventes: 55000 },
      { name: 'Juin', ventes: 67000 },
      { name: 'Juil', ventes: 72000 }
    ]);

    setTopProducts([
      { name: 'Tableau Moderne', sales: 156, revenue: 23400 },
      { name: 'Sculpture Bronze', sales: 89, revenue: 17800 },
      { name: 'Aquarelle Fleurs', sales: 234, revenue: 11700 },
      { name: 'Photographie Noir & Blanc', sales: 167, revenue: 8350 },
      { name: 'Céramique Artisanale', sales: 98, revenue: 4900 }
    ]);

    setRevenueByCategory([
      { name: 'Peintures', value: 45000 },
      { name: 'Sculptures', value: 28000 },
      { name: 'Photographies', value: 15000 },
      { name: 'Arts Graphiques', value: 12000 },
      { name: 'Céramiques', value: 8000 }
    ]);

    setRecentOrders([
      { id: 1, customer: 'Jean Dupont', amount: 450, status: 'completed', date: '2024-01-15' },
      { id: 2, customer: 'Marie Claire', amount: 230, status: 'pending', date: '2024-01-14' },
      { id: 3, customer: 'Pierre Martin', amount: 780, status: 'processing', date: '2024-01-14' }
    ]);

    setCustomerStats({
      newCustomers: 45,
      returningCustomers: 234,
      averagePurchase: 3.2
    });
  };

  const handleExport = async (type) => {
    setExportLoading(true);
    try {
      const response = await reportService.exportReport(type, 'csv');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${type}_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export des données');
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <Loader2 className="spinner" />
        <p>Chargement des rapports...</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>📊 Rapports & Finance</h1>
        <div className="header-actions">
          <div className="period-selector">
            <button 
              className={period === 'week' ? 'active' : ''}
              onClick={() => setPeriod('week')}
            >
              Semaine
            </button>
            <button 
              className={period === 'month' ? 'active' : ''}
              onClick={() => setPeriod('month')}
            >
              Mois
            </button>
            <button 
              className={period === 'year' ? 'active' : ''}
              onClick={() => setPeriod('year')}
            >
              Année
            </button>
          </div>
          <button className="export-btn" onClick={() => handleExport('sales')}>
            {exportLoading ? <Loader2 className="spinner" /> : <Download size={18} />}
            Exporter
          </button>
        </div>
      </div>

      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Chiffre d'affaires</span>
            <span className="kpi-value">{formatCurrency(metrics.totalRevenue)}</span>
            <span className="kpi-change positive">↑ {metrics.revenueGrowth}%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orders">
            <ShoppingCart size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Commandes</span>
            <span className="kpi-value">{metrics.totalOrders}</span>
            <span className="kpi-change positive">↑ {metrics.ordersGrowth}%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon customers">
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Clients</span>
            <span className="kpi-value">{metrics.totalCustomers}</span>
            <span className="kpi-change positive">↑ {metrics.customersGrowth}%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon average">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Panier moyen</span>
            <span className="kpi-value">{formatCurrency(metrics.averageOrderValue)}</span>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Ventes par période</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="ventes" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top 5 produits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Revenus par catégorie</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {revenueByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Statistiques clients</h3>
          <div className="customer-stats">
            <div className="stat-item">
              <span className="stat-label">Nouveaux clients</span>
              <span className="stat-value">{customerStats.newCustomers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Clients fidèles</span>
              <span className="stat-value">{customerStats.returningCustomers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Achats moyen</span>
              <span className="stat-value">{customerStats.averagePurchase} articles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="recent-orders">
        <h3>Commandes récentes</h3>
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.customer}</td>
                  <td>{formatCurrency(order.amount)}</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status === 'completed' ? '✅ Terminée' :
                       order.status === 'pending' ? '⏳ En attente' :
                       '🔄 En cours'}
                    </span>
                  </td>
                  <td>{new Date(order.date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;