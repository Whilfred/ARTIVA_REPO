// admin_panel/src/components/UserCartModal.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ProductFormModal.css';

function UserCartModal({ isOpen, onClose, user, apiBaseUrl, adminToken }) {
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCart = useCallback(async () => {
    if (!isOpen || !user || !adminToken) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${apiBaseUrl}/cart/admin/${user.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setCart(response.data);
    } catch (err) {
      console.error('Erreur chargement panier utilisateur:', err);
      setError(err.response?.data?.message || 'Impossible de charger le panier.');
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, user, apiBaseUrl, adminToken]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <h2>Panier de {user?.name || user?.email}</h2>

        {isLoading && <p>Chargement...</p>}
        {error && <p className="error-message-form">{error}</p>}

        {!isLoading && !error && cart && (
          cart.items.length === 0 ? (
            <p>Ce panier est vide.</p>
          ) : (
            <>
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Stock actuel</th>
                    <th>Ajouté le</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.cartItemId}>
                      <td>
                        {item.name}
                        {!item.is_published && (
                          <span style={{ color: '#c0392b', fontSize: '0.8em', marginLeft: 6 }}>
                            (dépublié)
                          </span>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{Number(item.price).toLocaleString('fr-FR')} FCFA</td>
                      <td style={{ color: item.stock <= 0 ? '#c0392b' : 'inherit' }}>{item.stock}</td>
                      <td>{new Date(item.addedAt).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: 15, fontWeight: 'bold', textAlign: 'right' }}>
                Total : {cart.totalAmount.toLocaleString('fr-FR')} FCFA ({cart.totalItems} article
                {cart.totalItems > 1 ? 's' : ''})
              </p>
            </>
          )
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default UserCartModal;
