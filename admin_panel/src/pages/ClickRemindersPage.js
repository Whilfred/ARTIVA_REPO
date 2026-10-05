// admin_panel/src/pages/ClickRemindersPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';
import './ClickRemindersPage.css';

const PERIOD_OPTIONS = [
  { value: '1',  label: "Aujourd'hui" },
  { value: '7',  label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
  { value: '90', label: '3 derniers mois' },
];

function ClickRemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // ---------- Chargement des données ----------
  const fetchData = useCallback(async () => {
    if (!adminToken) {
      navigate('/login');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const [remindersRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/tracking/admin/click-reminders?period=${period}&limit=1000`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_BASE_URL}/tracking/admin/click-reminders/stats?period=${period}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);
      setReminders(remindersRes.data.reminders || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement click reminders:', err);
      setError(err.response?.data?.message || 'Impossible de charger les rappels.');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Filtrage + pagination ----------
  const filteredReminders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return reminders;
    return reminders.filter((r) => {
      const haystack = [
        r.user_name || '',
        r.user_email || '',
        String(r.user_id || ''),
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [reminders, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredReminders.length / ITEMS_PER_PAGE));
  const paginatedReminders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReminders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReminders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, period]);

  // ---------- Utilitaires ----------
  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', {
      dateStyle: 'short', timeStyle: 'short',
    });
  };

  if (isLoading && reminders.length === 0) {
    return (
      <div className="crm-page">
        <div className="crm-header"><h1>📬 Rappels de clics</h1></div>
        <p className="crm-loading">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="crm-page">
      {/* ---------- Header ---------- */}
      <div className="crm-header">
        <div>
          <h1>📬 Rappels de clics produits</h1>
          <p className="crm-subtitle">
            Emails et push envoyés automatiquement 24h après consultation d'un produit
          </p>
        </div>
        <button onClick={fetchData} className="crm-btn-ghost" disabled={isLoading}>
          🔄 Rafraîchir
        </button>
      </div>

      <Link to="/dashboard" className="crm-back-link">← Retour au Tableau de Bord</Link>

      {/* ---------- Stats ---------- */}
      {stats && (
        <div className="crm-stats">
          <div className="crm-stat-card">
            <div className="crm-stat-label">Total rappels</div>
            <div className="crm-stat-value">{stats.overview?.total_reminders || 0}</div>
          </div>
          <div className="crm-stat-card crm-stat-blue">
            <div className="crm-stat-label">Users uniques</div>
            <div className="crm-stat-value">{stats.overview?.unique_users || 0}</div>
          </div>
          <div className="crm-stat-card crm-stat-green">
            <div className="crm-stat-label">📧 Emails envoyés</div>
            <div className="crm-stat-value">{stats.overview?.emails_envoyes || 0}</div>
          </div>
          <div className="crm-stat-card crm-stat-purple">
            <div className="crm-stat-label">📲 Pushs envoyées</div>
            <div className="crm-stat-value">{stats.overview?.pushs_envoyees || 0}</div>
          </div>
          <div className="crm-stat-card crm-stat-orange">
            <div className="crm-stat-label">Moy. produits</div>
            <div className="crm-stat-value">{stats.overview?.avg_products || 0}</div>
          </div>
          {(stats.overview?.erreurs > 0) && (
            <div className="crm-stat-card crm-stat-red">
              <div className="crm-stat-label">⚠️ Erreurs</div>
              <div className="crm-stat-value">{stats.overview.erreurs}</div>
            </div>
          )}
        </div>
      )}

      {/* ---------- Filtres ---------- */}
      <div className="crm-toolbar">
        <div className="crm-search">
          <span className="crm-search-icon">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="crm-search-input"
          />
          {searchTerm && (
            <button className="crm-search-clear" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="crm-filter-select"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* ---------- Compteur ---------- */}
      <div className="crm-counter">
        {filteredReminders.length === reminders.length
          ? `${reminders.length} rappel(s) affiché(s)`
          : `${filteredReminders.length} résultat(s) sur ${reminders.length}`}
      </div>

      {error && <div className="crm-error">{error}</div>}
      {isLoading && <div className="crm-loading-bar">Mise à jour…</div>}

      {/* ---------- Tableau ---------- */}
      <div className="crm-table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Date d'envoi</th>
              <th>Utilisateur</th>
              <th>Produits</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReminders.length === 0 ? (
              <tr>
                <td colSpan="4" className="crm-empty">
                  {searchTerm
                    ? '❌ Aucun rappel ne correspond à votre recherche.'
                    : 'Aucun rappel envoyé sur cette période.'}
                </td>
              </tr>
            ) : (
              paginatedReminders.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="crm-date">{formatDateTime(r.sent_at)}</span>
                  </td>
                  <td>
                    <div className="crm-user">
                      <div className="crm-user-name">{r.user_name || 'Utilisateur supprimé'}</div>
                      {r.user_email && <div className="crm-user-email">{r.user_email}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="crm-badge crm-badge-products">
                      📦 {r.product_count} produit{r.product_count > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <div className="crm-status">
                      {r.email_sent && (
                        <span className="crm-badge crm-badge-email">📧 Email</span>
                      )}
                      {r.push_sent && (
                        <span className="crm-badge crm-badge-push">📲 Push</span>
                      )}
                      {r.error_message && (
                        <span className="crm-badge crm-badge-error" title={r.error_message}>
                          ⚠️ Erreur
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      {totalPages > 1 && (
        <div className="crm-pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </button>
          <span>Page {currentPage} sur {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

export default ClickRemindersPage;
