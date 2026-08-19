// admin_panel/src/pages/ProductTagsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // useNavigate peut être utile
import './ProductManagementPage.css'; // Réutiliser certains styles généraux

// Modal pour le formulaire d'ajout/modification de tag
function TagFormModal({ isOpen, onClose, onSave, tagToEdit, apiBaseUrl, adminToken }) {
  const [tagName, setTagName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tagToEdit && tagToEdit.id) {
      setTagName(tagToEdit.name || '');
    } else {
      setTagName(''); // Mode ajout
    }
  }, [tagToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tagName.trim()) {
      setError('Le nom du tag est requis.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      if (tagToEdit && tagToEdit.id) { // Mode Édition
        await axios.put(`${apiBaseUrl}/product-tags/${tagToEdit.id}`, 
          { name: tagName },
          { headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' } }
        );
      } else { // Mode Ajout
        await axios.post(`${apiBaseUrl}/product-tags`, 
          { name: tagName },
          { headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' } }
        );
      }
      onSave(); // Recharger la liste et fermer
    } catch (err) {
      console.error("Erreur sauvegarde tag:", err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du tag.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}> {/* Clic sur l'overlay pour fermer */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Empêche la fermeture si on clique dans le modal */}
        <h2>{tagToEdit ? 'Modifier le Tag' : 'Ajouter un Nouveau Tag'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tag-name">Nom du Tag :</label>
            <input
              type="text"
              id="tag-name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              required
              style={{ width: 'calc(100% - 22px)', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' }}
            />
          </div>
          {error && <p className="error-message-form" style={{color: 'red', marginBottom: '10px'}}>{error}</p>}
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="save-btn">
              {isSubmitting ? 'Sauvegarde...' : (tagToEdit ? 'Mettre à Jour' : 'Ajouter Tag')}
            </button>
            <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Page principale pour la gestion des Tags
function ProductTagsPage() {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null); // Pour l'ajout ou la modification

  const adminToken = localStorage.getItem('adminToken');
  const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api'; // Assure-toi que c'est correct

  const fetchTags = useCallback(async () => {
    if (!adminToken) {
      navigate('/login'); // Rediriger si pas de token (normalement géré par ProtectedRoute)
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/product-tags`, {
        // headers: { 'Authorization': `Bearer ${adminToken}` } // La route GET est publique
      });
      setTags(response.data || []);
    } catch (err) {
      console.error("Erreur chargement tags:", err);
      setError(err.response?.data?.message || 'Impossible de charger les tags.');
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleOpenModalForAdd = () => {
    setSelectedTag(null); // Mode ajout
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (tag) => {
    setSelectedTag(tag); // Mode édition
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTag(null);
    setError(''); // Nettoyer l'erreur du modal
  };

  const handleSaveTag = () => {
    fetchTags(); // Recharger la liste des tags
    handleCloseModal();
  };

  const handleDeleteTag = async (tagId, tagName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le tag "${tagName}" ? Les produits ne seront plus associés à ce tag.`)) {
      setIsLoading(true); // Indiquer une action en cours
      setError('');
      try {
        await axios.delete(`${API_BASE_URL}/product-tags/${tagId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        fetchTags(); // Recharger la liste
      } catch (err) {
        console.error("Erreur suppression tag:", err);
        setError(err.response?.data?.message || 'Erreur lors de la suppression du tag.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading && tags.length === 0) {
    return <div className="management-page"><p>Chargement des tags...</p></div>;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Gestion des Tags de Produits</h1>
        <button onClick={handleOpenModalForAdd} className="add-btn">+ Ajouter Tag</button>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-indicator">Opération en cours...</p>}


      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom du Tag</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.length > 0 ? tags.map(tag => (
              <tr key={tag.id}>
                <td>{tag.id}</td>
                <td>{tag.name}</td>
                <td className="actions-cell">
                  <button onClick={() => handleOpenModalForEdit(tag)} className="action-btn edit-btn" title="Modifier">✎</button>
                  <button onClick={() => handleDeleteTag(tag.id, tag.name)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" style={{textAlign: 'center'}}>Aucun tag trouvé.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TagFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTag}
        tagToEdit={selectedTag}
        apiBaseUrl={API_BASE_URL}
        adminToken={adminToken}
      />
    </div>
  );
}

export default ProductTagsPage;