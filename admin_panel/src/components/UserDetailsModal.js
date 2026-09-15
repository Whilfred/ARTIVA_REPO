// admin_panel/src/components/UserDetailsModal.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ProductFormModal.css';

function UserDetailsModal({ isOpen, onClose, user, apiBaseUrl, adminToken }) {
  const [activeTab, setActiveTab] = useState('cart');
  const [cart, setCart] = useState(null);
  const [wishlist, setWishlist] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!isOpen || !user || !adminToken) return;
    setIsLoading(true);
    setError('');
    try {
      const [cartRes, wishlistRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/cart/admin/${user.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        axios.get(`${apiBaseUrl}/wishlist/admin/${user.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);
      setCart(cartRes.data);
      setWishlist(wishlistRes.data);
    } catch (err) {
      console.error('Erreur chargement détails user:', err);
      setError(err.response?.data?.message || 'Impossible de charger les données.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, user, apiBaseUrl, adminToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('cart');
      setCart(null);
      setWishlist(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cartItems = cart?.items || [];
  const wishlistItems = wishlist?.items || [];
  const totalCart = cart?.totalItems || 0;
  const totalWishlist = wishlistItems.length;

  const renderProductStatus = (item) => {
    const tags = [];
    if (!item.is_published) {
      tags.push(<span key="depub" style={{ color: '#c0392b', fontSize: '0.75em', marginLeft: 6, padding: '2px 6px', borderRadius: 3, background: '#fdecea' }}>Dépublié</span>);
    }
    if (item.stock <= 0) {
      tags.push(<span key="stock" style={{ color: '#e67e22', fontSize: '0.75em', marginLeft: 6, padding: '2px 6px', borderRadius: 3, background: '#fff3e0' }}>Rupture</span>);
    }
    return tags;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <h2>Détails de {user?.name || user?.email}</h2>
        <p style={{ color: '#666', marginTop: -10, marginBottom: 20 }}>{user?.email}</p>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('cart')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'cart' ? '3px solid #4CAF50' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'cart' ? 'bold' : 'normal',
              color: activeTab === 'cart' ? '#4CAF50' : '#666',
              marginBottom: -2,
            }}
          >
            🛒 Panier ({totalCart})
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'wishlist' ? '3px solid #e91e63' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'wishlist' ? 'bold' : 'normal',
              color: activeTab === 'wishlist' ? '#e91e63' : '#666',
              marginBottom: -2,
            }}
          >
            ❤️ Wishlist ({totalWishlist})
          </button>
        </div>

        {/* Contenu */}
        {isLoading && <p>Chargement...</p>}
        {error && <p className="error-message-form">{error}</p>}

        {!isLoading && !error && activeTab === 'cart' && (
          cartItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: 30 }}>🛒 Ce panier est vide.</p>
          ) : (
            <>
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Qté</th>
                    <th>Prix unitaire</th>
                    <th>Stock</th>
                    <th>Ajouté le</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr key={item.cartItemId}>
                      <td>
                        {item.name}
                        {renderProductStatus(item)}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{Number(item.price).toLocaleString('fr-FR')} FCFA</td>
                      <td style={{ color: item.stock <= 0 ? '#c0392b' : 'inherit' }}>{item.stock}</td>
                      <td>{item.addedAt ? new Date(item.addedAt).toLocaleString('fr-FR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: 15, fontWeight: 'bold', textAlign: 'right' }}>
                Total : {Number(cart.totalAmount || 0).toLocaleString('fr-FR')} FCFA ({totalCart} article{totalCart > 1 ? 's' : ''})
              </p>
            </>
          )
        )}

        {!isLoading && !error && activeTab === 'wishlist' && (
          wishlistItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: 30 }}>❤️ Cette wishlist est vide.</p>
          ) : (
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Ajouté le</th>
                </tr>
              </thead>
              <tbody>
                {wishlistItems.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      {item.name}
                      {renderProductStatus(item)}
                    </td>
                    <td>{Number(item.price).toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ color: item.stock <= 0 ? '#c0392b' : 'inherit' }}>{item.stock}</td>
                    <td>{item.addedAt ? new Date(item.addedAt).toLocaleString('fr-FR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;
