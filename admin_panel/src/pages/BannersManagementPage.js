// admin_panel/src/pages/BannersManagementPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';
import './BannersManagementPage.css';

const INITIAL_FORM = {
  image_url: '',
  title: '',
  subtitle: '',
  link_url: '',
  display_order: 0,
  is_active: true,
};

function BannersManagementPage() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Filtres
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [searchTerm, setSearchTerm] = useState('');

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState([]);

  const adminToken = localStorage.getItem('adminToken');

  // ---------- Chargement ----------
  const fetchBanners = useCallback(async () => {
    if (!adminToken) {
      setError('Authentification requise.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/banners`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setBanners(response.data.banners || []);
    } catch (err) {
      console.error('Erreur chargement bannières:', err);
      setError(err.response?.data?.message || 'Impossible de charger les bannières.');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // ---------- Filtrage ----------
  const filteredBanners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return banners.filter((b) => {
      if (statusFilter === 'active' && !b.is_active) return false;
      if (statusFilter === 'inactive' && b.is_active) return false;
      if (!term) return true;
      const haystack = [b.title || '', b.subtitle || '', b.link_url || '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [banners, statusFilter, searchTerm]);

  // ---------- Stats ----------
  const stats = useMemo(() => ({
    total: banners.length,
    actives: banners.filter((b) => b.is_active).length,
    inactives: banners.filter((b) => !b.is_active).length,
  }), [banners]);

  // ---------- Sélection multiple ----------
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredBanners.map((b) => b.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  // ---------- Actions groupées ----------
  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Activer ${selectedIds.length} bannière(s) ?`)) return;
    setIsLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          axios.put(
            `${API_BASE_URL}/admin/banners/${id}`,
            { is_active: true },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          )
        )
      );
      showSuccess(`✅ ${selectedIds.length} bannière(s) activée(s)`);
      clearSelection();
      fetchBanners();
    } catch (err) {
      console.error('Erreur activation groupée:', err);
      setError('Erreur lors de l\'activation groupée.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Désactiver ${selectedIds.length} bannière(s) ?`)) return;
    setIsLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          axios.put(
            `${API_BASE_URL}/admin/banners/${id}`,
            { is_active: false },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          )
        )
      );
      showSuccess(`⏸️ ${selectedIds.length} bannière(s) désactivée(s)`);
      clearSelection();
      fetchBanners();
    } catch (err) {
      console.error('Erreur désactivation groupée:', err);
      setError('Erreur lors de la désactivation groupée.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Supprimer DÉFINITIVEMENT ${selectedIds.length} bannière(s) ?`)) return;
    setIsLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          axios.delete(`${API_BASE_URL}/admin/banners/${id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
        )
      );
      showSuccess(`🗑️ ${selectedIds.length} bannière(s) supprimée(s)`);
      clearSelection();
      fetchBanners();
    } catch (err) {
      console.error('Erreur suppression groupée:', err);
      setError('Erreur lors de la suppression groupée.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Modale création / édition ----------
  const handleOpenModalForAdd = () => {
    setSelectedBanner(null);
    setFormData({
      ...INITIAL_FORM,
      display_order: banners.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (banner) => {
    setSelectedBanner(banner);
    setFormData({
      image_url: banner.image_url || '',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link_url: banner.link_url || '',
      display_order: banner.display_order || 0,
      is_active: banner.is_active,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBanner(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.image_url.trim()) {
      setError("L'URL de l'image est requise.");
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (selectedBanner) {
        await axios.put(
          `${API_BASE_URL}/admin/banners/${selectedBanner.id}`,
          formData,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        showSuccess('✅ Bannière modifiée');
      } else {
        await axios.post(
          `${API_BASE_URL}/admin/banners`,
          formData,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        showSuccess('✅ Bannière ajoutée');
      }
      fetchBanners();
      handleCloseModal();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Actions individuelles ----------
  const handleDelete = async (banner) => {
    if (!window.confirm('Supprimer cette bannière ?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/banners/${banner.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      showSuccess('🗑️ Bannière supprimée');
      fetchBanners();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await axios.put(
        `${API_BASE_URL}/admin/banners/${banner.id}`,
        { is_active: !banner.is_active },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      // Mise à jour locale optimiste
      setBanners((prev) =>
        prev.map((b) =>
          b.id === banner.id ? { ...b, is_active: !b.is_active } : b
        )
      );
      showSuccess(banner.is_active ? '⏸️ Bannière désactivée' : '▶️ Bannière activée');
    } catch (err) {
      console.error('Erreur toggle:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement de statut.');
      fetchBanners();
    }
  };

  // ---------- Rendu ----------
  if (isLoading && banners.length === 0) {
    return (
      <div className="bm-page">
        <div className="bm-header"><h1>🎠 Gestion des Bannières</h1></div>
        <p className="bm-loading">Chargement…</p>
      </div>
    );
  }

  const allVisibleSelected =
    filteredBanners.length > 0 &&
    filteredBanners.every((b) => selectedIds.includes(b.id));

  return (
    <div className="bm-page">
      {/* ---------- Header ---------- */}
      <div className="bm-header">
        <div>
          <h1>🎠 Gestion des Bannières</h1>
          <p className="bm-subtitle">
            Ces bannières s'affichent dans le carrousel de la page d'accueil de l'app mobile.
          </p>
        </div>
        <button onClick={handleOpenModalForAdd} className="bm-btn-primary">
          + Ajouter une bannière
        </button>
      </div>

      <Link to="/dashboard" className="bm-back-link">← Retour au Tableau de Bord</Link>

      {/* ---------- Messages ---------- */}
      {error && <div className="bm-error">{error}</div>}
      {successMessage && <div className="bm-success">{successMessage}</div>}

      {/* ---------- Cartes stats ---------- */}
      <div className="bm-stats">
        <div className="bm-stat-card">
          <div className="bm-stat-label">Total</div>
          <div className="bm-stat-value">{stats.total}</div>
        </div>
        <div className="bm-stat-card bm-stat-active">
          <div className="bm-stat-label">Actives</div>
          <div className="bm-stat-value">{stats.actives}</div>
        </div>
        <div className="bm-stat-card bm-stat-inactive">
          <div className="bm-stat-label">Inactives</div>
          <div className="bm-stat-value">{stats.inactives}</div>
        </div>
      </div>

      {/* ---------- Barre de filtres ---------- */}
      <div className="bm-toolbar">
        <div className="bm-search">
          <span className="bm-search-icon">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par titre, sous-titre ou lien…"
            className="bm-search-input"
          />
          {searchTerm && (
            <button className="bm-search-clear" onClick={() => setSearchTerm('')} title="Effacer">
              ✕
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bm-filter-select"
        >
          <option value="all">Toutes</option>
          <option value="active">✅ Actives</option>
          <option value="inactive">⏸️ Inactives</option>
        </select>

        <button
          onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
          className="bm-btn-ghost"
        >
          🔄 Réinitialiser
        </button>
      </div>

      {/* ---------- Barre d'actions groupées ---------- */}
      {selectedIds.length > 0 && (
        <div className="bm-bulk-bar">
          <div className="bm-bulk-count">
            {selectedIds.length} sélectionnée(s)
          </div>
          <button className="bm-bulk-btn bm-bulk-success" onClick={handleBulkActivate}>
            ✅ Activer
          </button>
          <button className="bm-bulk-btn bm-bulk-warning" onClick={handleBulkDeactivate}>
            ⏸️ Désactiver
          </button>
          <button className="bm-bulk-btn bm-bulk-danger" onClick={handleBulkDelete}>
            🗑️ Supprimer
          </button>
          <button className="bm-bulk-btn bm-bulk-ghost" onClick={clearSelection}>
            Annuler la sélection
          </button>
        </div>
      )}

      {/* ---------- Grille de bannières ---------- */}
      {filteredBanners.length === 0 ? (
        <div className="bm-empty">
          {banners.length === 0
            ? 'Aucune bannière. Cliquez sur "+ Ajouter une bannière" pour en créer une.'
            : 'Aucune bannière ne correspond à votre recherche.'}
        </div>
      ) : (
        <>
          {/* Barre "tout sélectionner" */}
          <div className="bm-select-all">
            <label className="bm-checkbox-label">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
              />
              Tout sélectionner ({filteredBanners.length})
            </label>
          </div>

          <div className="bm-grid">
            {filteredBanners.map((banner) => {
              const isSelected = selectedIds.includes(banner.id);
              return (
                <div
                  key={banner.id}
                  className={`bm-card ${!banner.is_active ? 'bm-card-inactive' : ''} ${isSelected ? 'bm-card-selected' : ''}`}
                >
                  {/* Checkbox de sélection */}
                  <div className="bm-card-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(banner.id)}
                    />
                  </div>

                  {/* Image */}
                  <div className="bm-card-image">
                    <img
                      src={banner.image_url}
                      alt={banner.title || 'Bannière'}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x200?text=Erreur+image';
                      }}
                    />
                    {!banner.is_active && (
                      <span className="bm-inactive-badge">⏸️ Inactive</span>
                    )}
                    <span className="bm-order-badge">#{banner.display_order}</span>
                  </div>

                  {/* Contenu */}
                  <div className="bm-card-body">
                    <h3 className="bm-card-title">{banner.title || <em>Sans titre</em>}</h3>
                    {banner.subtitle && (
                      <p className="bm-card-subtitle">{banner.subtitle}</p>
                    )}
                    {banner.link_url && (
                      <p className="bm-card-link" title={banner.link_url}>
                        🔗 {banner.link_url}
                      </p>
                    )}

                    <div className="bm-card-actions">
                      {/* Toggle actif / inactif */}
                      <label className="bm-toggle" title={banner.is_active ? 'Désactiver' : 'Activer'}>
                        <input
                          type="checkbox"
                          checked={banner.is_active}
                          onChange={() => handleToggleActive(banner)}
                        />
                        <span className="bm-toggle-slider"></span>
                        <span className="bm-toggle-label">
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </label>

                      <div className="bm-card-buttons">
                        <button
                          onClick={() => handleOpenModalForEdit(banner)}
                          className="bm-icon-btn"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(banner)}
                          className="bm-icon-btn bm-icon-btn-danger"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ---------- Modale ---------- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            <h2>{selectedBanner ? '✏️ Modifier la bannière' : '➕ Nouvelle bannière'}</h2>

            <div className="bm-form-group">
              <label>URL de l'image *</label>
              <input
                type="text"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="https://exemple.com/image.jpg"
              />
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Aperçu"
                  className="bm-preview"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

            <div className="bm-form-group">
              <label>Titre (optionnel)</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Soldes d'été"
              />
            </div>

            <div className="bm-form-group">
              <label>Sous-titre (optionnel)</label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                placeholder="Ex: Jusqu'à -50%"
              />
            </div>

            <div className="bm-form-group">
              <label>Lien (optionnel)</label>
              <input
                type="text"
                name="link_url"
                value={formData.link_url}
                onChange={handleChange}
                placeholder="Ex: /tag/Promotion ou /product/49"
              />
            </div>

            <div className="bm-form-group">
              <label>Ordre d'affichage</label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={handleChange}
              />
            </div>

            <div className="bm-form-group">
              <label className="bm-checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                Bannière active (visible sur l'app)
              </label>
            </div>

            {error && <div className="bm-error">{error}</div>}

            <div className="bm-modal-actions">
              <button className="bm-btn-ghost" onClick={handleCloseModal} disabled={isSaving}>
                Annuler
              </button>
              <button className="bm-btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Enregistrement…' : (selectedBanner ? 'Enregistrer' : 'Créer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BannersManagementPage;
