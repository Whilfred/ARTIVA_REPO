// admin_panel/src/components/CategoryFormModal.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ProductFormModal.css';

function CategoryFormModal({ isOpen, onClose, onSave, categoryToEdit, apiBaseUrl, adminToken, isSubCategoryModal, allCategories }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        slug: '',
        parent_id: '',
        display_order: '0',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (categoryToEdit) {
            setFormData({
                name: categoryToEdit.name || '',
                description: categoryToEdit.description || '',
                image_url: categoryToEdit.image_url || '',
                slug: categoryToEdit.slug || '',
                parent_id: categoryToEdit.parent_id ? String(categoryToEdit.parent_id) : '',
                display_order: categoryToEdit.display_order !== undefined ? String(categoryToEdit.display_order) : '0',
            });
        } else {
            setFormData({ name: '', description: '', image_url: '', slug: '', parent_id: '', display_order: '0' });
        }
    }, [categoryToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const payload = {
            ...formData,
            display_order: formData.display_order ? parseInt(formData.display_order, 10) : 0,
        };

        if (isSubCategoryModal) {
            payload.parent_id = formData.parent_id ? parseInt(formData.parent_id, 10) : null;
        }
        
        if (payload.slug === '') delete payload.slug; // Pour autogénération par le backend
        if (payload.image_url === '') delete payload.image_url;
        if (payload.description === '') delete payload.description;

        try {
            if (categoryToEdit && categoryToEdit.id) {
                await axios.put(`${apiBaseUrl}/categories/${categoryToEdit.id}`, payload, {
                    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
                });
            } else {
                await axios.post(`${apiBaseUrl}/categories`, payload, {
                    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
                });
            }
            onSave();
        } catch (err) {
            console.error("Erreur sauvegarde catégorie:", err);
            setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de la catégorie.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{categoryToEdit ? 'Modifier la Catégorie' : 'Ajouter une Nouvelle Catégorie'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="cat-name">Nom :</label>
                        <input type="text" name="name" id="cat-name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="cat-description">Description :</label>
                        <textarea name="description" id="cat-description" value={formData.description} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="cat-image_url">URL Image :</label>
                        <input type="text" name="image_url" id="cat-image_url" value={formData.image_url} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="cat-slug">Slug (optionnel, sera auto-généré si vide) :</label>
                        <input type="text" name="slug" id="cat-slug" value={formData.slug} onChange={handleChange} />
                    </div>

                    {/* Afficher la liste déroulante des catégories parentes SEULEMENT si c'est un modal de sous-catégorie */}
                    {isSubCategoryModal && (
                        <div className="form-group">
                            <label htmlFor="cat-parent_id">Catégorie Parente :</label>
                            <select
                                name="parent_id"
                                id="cat-parent_id"
                                value={formData.parent_id}
                                onChange={handleChange}
                                required  //Optionnel: Rend le champ obligatoire si c'est une sous-catégorie
                                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' }}
                            >
                                <option value="">-- Aucune --</option>
                                {allCategories.filter(cat => !cat.parent_id).map(cat => ( // Afficher uniquement les catégories principales
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="cat-display_order">Ordre d'affichage :</label>
                        <input type="number" name="display_order" id="cat-display_order" value={formData.display_order} onChange={handleChange} step="1" />
                    </div>

                    {error && <p className="error-message-form">{error}</p>}
                    <div className="form-actions">
                        <button type="submit" disabled={isLoading} className="save-btn">
                            {isLoading ? 'Sauvegarde...' : (categoryToEdit ? 'Mettre à Jour' : 'Ajouter Catégorie')}
                        </button>
                        <button type="button" onClick={onClose} className="cancel-btn" disabled={isLoading}>Annuler</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CategoryFormModal;