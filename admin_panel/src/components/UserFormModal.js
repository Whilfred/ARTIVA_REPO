// admin_panel/src/components/UserFormModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductFormModal.css'; // Gardons le même style pour l'instant

function UserFormModal({ isOpen, onClose, onSave, userToEdit, apiBaseUrl, adminToken }) {
  // Utilisation d'un seul useState pour les données et pour s'assurer de la cohérence
  const [formData, setFormData] = useState({
    id: null, // Important pour savoir si on est en mode ajout ou édition
    name: '',
    email: '',
    address: '',
    phone: '',
    role: 'customer',
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableRoles = ['customer', 'vendor', 'editor'];

  // Charger les données de l'utilisateur à éditer (ou réinitialiser le formulaire)
  useEffect(() => {
    if (isOpen && userToEdit) {
      // Si on ouvre le modal en mode édition, on clone l'objet userToEdit
      // pour ne pas modifier l'état de UserManagementPage directement
      setFormData({
        id: userToEdit.id,
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        address: userToEdit.address || '',
        phone: userToEdit.phone || '',
        role: userToEdit.role || 'customer',
        is_active: userToEdit.is_active !== undefined ? userToEdit.is_active : true,
      });
    } else {
      // Si on ferme le modal ou si on est en mode ajout, on réinitialise
      setFormData({
        id: null,
        name: '',
        email: '',
        address: '',
        phone: '',
        role: 'customer',
        is_active: true,
      });
    }
  }, [userToEdit, isOpen]); // Dépendances: userToEdit et isOpen

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      email: formData.email,
      address: formData.address,
      phone: formData.phone,
      role: formData.role,
      is_active: formData.is_active,
    };

    try {
      if (formData.id) { // Mode édition
        const response = await axios.put(`${apiBaseUrl}/users/${formData.id}`, payload, {
          headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        });
         // Si la requête réussit, appeler onSave avec les données mises à jour
        onSave(response.data.user);
      } else {
        setError("Ce formulaire est uniquement pour la modification.");
        setIsSubmitting(false);
        return;
      }
      onClose(); // Ferme le modal en cas de succès
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de l'utilisateur:", err);
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde de l'utilisateur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si le modal est fermé, on ne retourne rien
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Modifier l'Utilisateur</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user-name">Nom :</label>
            <input type="text" name="name" id="user-name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="user-email">Email :</label>
            <input type="email" name="email" id="user-email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="user-address">Adresse :</label>
            <textarea name="address" id="user-address" value={formData.address} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="user-phone">Téléphone :</label>
            <input type="tel" name="phone" id="user-phone" value={formData.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="user-role">Rôle :</label>
            <select
              name="role"
              id="user-role"
              value={formData.role}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' }}
            >
              {availableRoles.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Actif/Désactivé */}
          <div className="form-group checkbox-item">
            <input
              type="checkbox"
              name="is_active"
              id="user-is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            <label htmlFor="user-is_active">Compte Actif ?</label>
          </div>

          {error && <p className="error-message-form">{error}</p>}
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="save-btn">
              {isSubmitting ? 'Sauvegarde...' : 'Mettre à Jour Utilisateur'}
            </button>
            <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;