// admin_panel/src/pages/ProductManagementPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ProductFormModal from '../components/ProductFormModal';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';
import './ProductManagementFilters.css';

function ProductManagementPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');       // all | published | hidden
  const [stockFilter, setStockFilter] = useState('all');         // all | out | low | in | comfortable
  const [categoryFilter, setCategoryFilter] = useState('all');   // all | <id> | none
  const [datePreset, setDatePreset] = useState('all');           // all | today | yesterday | 7d | 30d | month
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');          // created_desc | created_asc | price_asc | price_desc | stock_asc | stock_desc | name_asc

  // Panneau filtres avancés rétractable
  const [showAdvanced, setShowAdvanced] = useState(false);

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  // ---------- Chargement ----------
  const fetchProducts = useCallback(async () => {
    if (!adminToken) {
      setError('Authentification requise.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const [prodResponse, catResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/products/admin/all`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${API_BASE_URL}/categories`, {}),
      ]);
      setAllProducts(prodResponse.data.products || []);
      setAllCategories(catResponse.data || []);
    } catch (err) {
      console.error('Erreur chargement produits (admin):', err);
      setError(err.response?.data?.message || 'Impossible de charger les produits.');
      setAllProducts([]);
      setAllCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ---------- Filtres + tri ----------
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // Raccourci date → calcul de bornes
    let effFrom = dateFrom ? new Date(dateFrom) : null;
    let effTo = dateTo ? new Date(dateTo) : null;
    if (datePreset !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      if (datePreset === 'today')     { effFrom = today;    effTo = tomorrow; }
      if (datePreset === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); effFrom = y; effTo = today; }
      if (datePreset === '7d')        { const d = new Date(today); d.setDate(d.getDate() - 6); effFrom = d; effTo = tomorrow; }
      if (datePreset === '30d')       { const d = new Date(today); d.setDate(d.getDate() - 29); effFrom = d; effTo = tomorrow; }
      if (datePreset === 'month')     { effFrom = new Date(today.getFullYear(), today.getMonth(), 1); effTo = tomorrow; }
    }

    const pmin = priceMin !== '' ? parseFloat(priceMin) : null;
    const pmax = priceMax !== '' ? parseFloat(priceMax) : null;

    let result = allProducts.filter((p) => {
      // Recherche globale
      if (term) {
        const haystack = [
          String(p.id || ''),
          p.name || '',
          p.sku || '',
          p.description || '',
          (p.categories_names || []).join(' '),
          (p.tags_names || []).join(' '),
        ].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      // Statut
      if (statusFilter === 'published' && !p.is_published) return false;
      if (statusFilter === 'hidden' && p.is_published) return false;

      // Stock
      const stock = Number(p.stock || 0);
      if (stockFilter === 'out'         && stock !== 0) return false;
      if (stockFilter === 'low'         && !(stock > 0 && stock <= 5)) return false;
      if (stockFilter === 'in'          && stock <= 0) return false;
      if (stockFilter === 'comfortable' && stock <= 20) return false;

      // Catégorie
      if (categoryFilter === 'none') {
        if ((p.categories_names || []).length > 0) return false;
      } else if (categoryFilter !== 'all') {
        // On ne connaît que les noms, on cherche par id dans categories_ids si dispo
        const ids = p.categories_ids || p.category_ids || [];
        if (!ids.map(String).includes(String(categoryFilter))) return false;
      }

      // Date
      if (effFrom || effTo) {
        const created = p.created_at ? new Date(p.created_at) : null;
        if (!created) return false;
        if (effFrom && created < effFrom) return false;
        if (effTo && created >= effTo) return false;
      }

      // Prix
      const price = Number(p.price || 0);
      if (pmin !== null && price < pmin) return false;
      if (pmax !== null && price > pmax) return false;

      return true;
    });

    // Tri
    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'created_asc':  return new Date(a.created_at) - new Date(b.created_at);
        case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'price_asc':    return Number(a.price) - Number(b.price);
        case 'price_desc':   return Number(b.price) - Number(a.price);
        case 'stock_asc':    return Number(a.stock) - Number(b.stock);
        case 'stock_desc':   return Number(b.stock) - Number(a.stock);
        case 'name_asc':     return (a.name || '').localeCompare(b.name || '');
        default:             return 0;
      }
    });

    return sorted;
  }, [
    allProducts, searchTerm, statusFilter, stockFilter, categoryFilter,
    datePreset, dateFrom, dateTo, priceMin, priceMax, sortBy,
  ]);

  // ---------- Stats globales ----------
  const stats = useMemo(() => ({
    total: allProducts.length,
    published: allProducts.filter((p) => p.is_published).length,
    hidden: allProducts.filter((p) => !p.is_published).length,
    outOfStock: allProducts.filter((p) => Number(p.stock || 0) === 0).length,
    lowStock: allProducts.filter((p) => { const s = Number(p.stock || 0); return s > 0 && s <= 5; }).length,
  }), [allProducts]);

  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || stockFilter !== 'all' ||
    categoryFilter !== 'all' || datePreset !== 'all' || dateFrom || dateTo ||
    priceMin || priceMax || sortBy !== 'created_desc';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setPriceMin('');
    setPriceMax('');
    setSortBy('created_desc');
  };

  // ---------- Actions ----------
  const handleOpenModalForAdd = () => { setSelectedProduct(null); setIsModalOpen(true); };
  const handleOpenModalForEdit = (product) => { setSelectedProduct(product); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedProduct(null); };
  const handleSaveProduct = () => { fetchProducts(); handleCloseModal(); };

  const handleTogglePublishStatus = async (productId, currentStatus) => {
    const newStatus = !currentStatus;
    setIsLoading(true);
    setError('');
    try {
      await axios.put(
        `${API_BASE_URL}/products/${productId}`,
        { is_published: newStatus },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      // Mise à jour optimiste
      setAllProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_published: newStatus } : p))
      );
    } catch (err) {
      console.error('Erreur changement statut:', err);
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du statut.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Utilitaires ----------
  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
  };

  const getStockBadge = (stock) => {
    const s = Number(stock || 0);
    if (s === 0)  return { label: 'Rupture',     color: '#991b1b', bg: '#fee2e2' };
    if (s <= 5)   return { label: `Stock faible (${s})`, color: '#92400e', bg: '#fef3c7' };
    if (s <= 20)  return { label: `${s} en stock`, color: '#1e40af', bg: '#dbeafe' };
    return { label: `${s} en stock`, color: '#166534', bg: '#dcfce7' };
  };

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="management-page">
        <div className="page-header"><h1>Gestion des Produits</h1></div>
        <p>Chargement des produits…</p>
      </div>
    );
  }

  return (
    <div className="pm-page">
      {/* ---------- Header ---------- */}
      <div className="pm-header">
        <div>
          <h1>📦 Gestion des Produits</h1>
          <p className="pm-subtitle">
            {filteredProducts.length === allProducts.length
              ? `${allProducts.length} produit(s) au total`
              : `${filteredProducts.length} résultat(s) sur ${allProducts.length}`}
          </p>
        </div>
        <button onClick={handleOpenModalForAdd} className="pm-btn-primary">
          + Ajouter un produit
        </button>
      </div>

      <Link to="/dashboard" className="pm-back-link">← Retour au Tableau de Bord</Link>

      {/* ---------- Stats ---------- */}
      <div className="pm-stats">
        <div className="pm-stat-card"><div className="pm-stat-label">Total</div><div className="pm-stat-value">{stats.total}</div></div>
        <div className="pm-stat-card pm-stat-green"><div className="pm-stat-label">Publiés</div><div className="pm-stat-value">{stats.published}</div></div>
        <div className="pm-stat-card pm-stat-gray"><div className="pm-stat-label">Masqués</div><div className="pm-stat-value">{stats.hidden}</div></div>
        <div className="pm-stat-card pm-stat-red"><div className="pm-stat-label">Rupture</div><div className="pm-stat-value">{stats.outOfStock}</div></div>
        <div className="pm-stat-card pm-stat-orange"><div className="pm-stat-label">Stock faible</div><div className="pm-stat-value">{stats.lowStock}</div></div>
      </div>

      {/* ---------- Recherche ---------- */}
      <div className="pm-toolbar">
        <div className="pm-search">
          <span className="pm-search-icon">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, SKU, ID, description, catégorie…"
            className="pm-search-input"
          />
          {searchTerm && (
            <button className="pm-search-clear" onClick={() => setSearchTerm('')} title="Effacer">✕</button>
          )}
        </div>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pm-filter-select">
          <option value="created_desc">Plus récents</option>
          <option value="created_asc">Plus anciens</option>
          <option value="name_asc">Nom (A → Z)</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="stock_asc">Stock croissant</option>
          <option value="stock_desc">Stock décroissant</option>
        </select>

        <button onClick={() => setShowAdvanced((v) => !v)} className="pm-btn-ghost">
          {showAdvanced ? '▲ Masquer les filtres' : '▼ Filtres avancés'}
        </button>

        {hasActiveFilters && (
          <button onClick={handleResetFilters} className="pm-btn-ghost">🔄 Réinitialiser</button>
        )}
      </div>

      {/* ---------- Raccourcis date ---------- */}
      <div className="pm-presets">
        {[
          { key: 'all',       label: 'Tout' },
          { key: 'today',     label: "Aujourd'hui" },
          { key: 'yesterday', label: 'Hier' },
          { key: '7d',        label: '7 derniers jours' },
          { key: '30d',       label: '30 derniers jours' },
          { key: 'month',     label: 'Ce mois-ci' },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => { setDatePreset(p.key); setDateFrom(''); setDateTo(''); }}
            className={`pm-preset-btn ${datePreset === p.key ? 'pm-preset-active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ---------- Filtres avancés ---------- */}
      {showAdvanced && (
        <div className="pm-advanced">
          <div className="pm-filter-group">
            <label>Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tous</option>
              <option value="published">✅ Publiés</option>
              <option value="hidden">👁️ Masqués</option>
            </select>
          </div>

          <div className="pm-filter-group">
            <label>Stock</label>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
              <option value="all">Tous</option>
              <option value="out">🚫 En rupture</option>
              <option value="low">⚠️ Stock faible (≤5)</option>
              <option value="in">✅ En stock</option>
              <option value="comfortable">💪 Confortable (&gt;20)</option>
            </select>
          </div>

          <div className="pm-filter-group">
            <label>Catégorie</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Toutes</option>
              <option value="none">Sans catégorie</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="pm-filter-group">
            <label>Prix min (FCFA)</label>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="Ex: 5000"
              min="0"
            />
          </div>

          <div className="pm-filter-group">
            <label>Prix max (FCFA)</label>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Ex: 50000"
              min="0"
            />
          </div>

          <div className="pm-filter-group">
            <label>Date de (création)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setDatePreset('all'); }}
            />
          </div>

          <div className="pm-filter-group">
            <label>Date à (création)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setDatePreset('all'); }}
            />
          </div>
        </div>
      )}

      {error && <p className="pm-error">{error}</p>}
      {isLoading && <p className="pm-loading-bar">Mise à jour…</p>}

      {/* ---------- Tableau ---------- */}
      <div className="pm-table-wrapper">
        <table className="pm-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Catégories</th>
              <th>Créé le</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" className="pm-empty">
                  {hasActiveFilters
                    ? '❌ Aucun produit ne correspond à vos filtres.'
                    : "Aucun produit. Cliquez sur '+ Ajouter un produit' pour commencer."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const stockBadge = getStockBadge(product.stock);
                const lowStock = Number(product.stock || 0) <= 5;
                return (
                  <tr key={product.id}>
                    {/* Produit : image + nom + SKU */}
                    <td>
                      <div className="pm-product-cell">
                        <img
                          src={product.image_url || 'https://via.placeholder.com/50?text=N/A'}
                          alt={product.name || 'Produit'}
                          className="pm-product-thumb"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=N/A'; }}
                        />
                        <div className="pm-product-info">
                          <div className="pm-product-name">{product.name || 'N/A'}</div>
                          <div className="pm-product-meta">
                            #{product.id}
                            {product.sku && ` · ${product.sku}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Prix */}
                    <td>
                      <span className="pm-price">
                        {Number(product.price || 0).toLocaleString('fr-FR')} F
                      </span>
                    </td>

                    {/* Stock avec badge */}
                    <td>
                      <span
                        className="pm-badge"
                        style={{ color: stockBadge.color, backgroundColor: stockBadge.bg }}
                      >
                        {lowStock && Number(product.stock) === 0 ? '🚫 ' : lowStock ? '⚠️ ' : ''}
                        {stockBadge.label}
                      </span>
                    </td>

                    {/* Catégories */}
                    <td>
                      {(product.categories_names || []).length > 0 ? (
                        <div className="pm-tags">
                          {(product.categories_names || []).slice(0, 2).map((c, i) => (
                            <span key={i} className="pm-tag">{c}</span>
                          ))}
                          {(product.categories_names || []).length > 2 && (
                            <span className="pm-tag-more">
                              +{(product.categories_names || []).length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="pm-muted">—</span>
                      )}
                    </td>

                    {/* Date création */}
                    <td><span className="pm-date">{formatDate(product.created_at)}</span></td>

                    {/* Statut publié/masqué — toggle */}
                    <td>
                      <label className="pm-toggle" title={product.is_published ? 'Cliquer pour masquer' : 'Cliquer pour publier'}>
                        <input
                          type="checkbox"
                          checked={!!product.is_published}
                          onChange={() => handleTogglePublishStatus(product.id, product.is_published)}
                        />
                        <span className="pm-toggle-slider"></span>
                        <span className="pm-toggle-label">
                          {product.is_published ? 'Publié' : 'Masqué'}
                        </span>
                      </label>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenModalForEdit(product)}
                        className="pm-icon-btn"
                        title="Modifier"
                      >
                        ✎
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Modale ---------- */}
      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
          productToEdit={selectedProduct}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
          allCategories={allCategories}
        />
      )}
    </div>
  );
}

export default ProductManagementPage;
