// admin_panel/src/pages/BannersManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';

function BannersManagementPage() {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    subtitle: '',
    link_url: '',
    display_order: 0,
    is_active: true,
  });

  const adminToken = localStorage.getItem('adminToken');

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

  const handleOpenModalForAdd = () => {
    setSelectedBanner(null);
    setFormData({
      image_url: '',
      title: '',
      subtitle: '',
      link_url: '',
      display_order: banners.length + 1,
      is_active: true,
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

  const handleSave = async () => {
    if (!formData.image_url.trim()) {
      setError("L'URL de l'image est requise.");
      return;
    }

    try {
      if (selectedBanner) {
        // Modifier
        await axios.put(
          `${API_BASE_URL}/admin/banners/${selectedBanner.id}`,
          formData,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        showSuccess('✅ Bannière modifiée');
      } else {
        // Créer
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
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Supprimer cette bannière ?`)) return;

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
      showSuccess(banner.is_active ? '⏸️ Bannière désactivée' : '▶️ Bannière activée');
      fetchBanners();
    } catch (err) {
      console.error('Erreur toggle:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  if (isLoading && banners.length === 0) {
    return (
      <div className="product-management-page">
        <div className="page-header"><h1>Gestion des Bannières</h1></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="product-management-page">
      <div className="page-header">
        <h1>🎠 Gestion des Bannières</h1>
        <button onClick={handleOpenModalForAdd} className="add-product-btn">
          + Ajouter Bannière
        </button>
      </div>

      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {error && <p className="error-message">{error}</p>}
      {successMessage && (
        <p style={{ color: '#2E7D32', background: '#E8F5E9', padding: 10, borderRadius: 5, marginBottom: 15 }}>
          {successMessage}
        </p>
      )}

      <p style={{ color: '#666', marginBottom: 15 }}>
        💡 Ces bannières s'affichent dans le carrousel de la page d'accueil de l'app mobile.
      </p>

      <div className="table-responsive">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Aperçu</th>
              <th>Titre / Sous-titre</th>
              <th>Lien</th>
              <th>Ordre</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.length > 0 ? (
              banners.map((banner) => (
                <tr key={banner.id} style={!banner.is_active ? { opacity: 0.5 } : undefined}>
                  <td>{banner.id}</td>
                  <td>
                    <img
                      src={banner.image_url}
                      alt="Bannière"
                      className="product-thumbnail"
                      style={{ width: 100, height: 60, objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100x60?text=Erreur';
                      }}
                    />
                  </td>
                  <td>
                    <b>{banner.title || '-'}</b>
                    <br />
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {banner.subtitle || '-'}
                    </span>
                  </td>
                  <td>
                    {banner.link_url ? (
                      <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                        {banner.link_url.length > 30
                          ? banner.link_url.substring(0, 30) + '...'
                          : banner.link_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{banner.display_order}</td>
                  <td>
                    <span
                      className={banner.is_active ? 'status-active' : 'status-inactive'}
                      onClick={() => handleToggleActive(banner)}
                      style={{ cursor: 'pointer' }}
                      title={banner.is_active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                    >
                      {banner.is_active ? '✅ Active' : '⏸️ Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleOpenModalForEdit(banner)}
                      className="action-btn edit-btn"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      className="action-btn"
                      style={{ background: '#dc3545', color: 'white' }}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 30 }}>
                  Aucune bannière. Cliquez sur "+ Ajouter Bannière" pour en créer une.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            <h2>{selectedBanner ? 'Modifier la bannière' : 'Nouvelle bannière'}</h2>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                URL de l'image *
              </label>
              <input
                type="text"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="https://exemple.com/image.jpg"
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }}
              />
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Aperçu"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    maxHeight: 150,
                    objectFit: 'cover',
                    borderRadius: 5,
                    border: '1px solid #eee',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Titre (optionnel)
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Soldes d'été"
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Sous-titre (optionnel)
              </label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                placeholder="Ex: Jusqu'à -50%"
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Lien (optionnel)
              </label>
              <input
                type="text"
                name="link_url"
                value={formData.link_url}
                onChange={handleChange}
                placeholder="Ex: /tag/Promotion ou /product/49"
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Ordre d'affichage
              </label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={handleChange}
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                <span style={{ fontWeight: 'bold' }}>Bannière active (visible sur l'app)</span>
              </label>
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="cancel-btn"
                style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 5, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="save-btn"
                style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
              >
                {selectedBanner ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BannersManagementPage;
