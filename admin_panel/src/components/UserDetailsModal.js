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

  // Édition du prix
  const [editingProductId, setEditingProductId] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

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
      setEditingProductId(null);
      setNewPrice('');
    }
  }, [isOpen]);

  // Démarrer l'édition du prix
  const handleStartEdit = (productId, currentPrice) => {
    // Nettoyer le prix (enlever " FCFA" et espaces)
    const cleanPrice = String(currentPrice).replace(/[^\d.]/g, '');
    setEditingProductId(productId);
    setNewPrice(cleanPrice);
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingProductId(null);
    setNewPrice('');
  };

  // Enregistrer le nouveau prix
  const handleSavePrice = async (productId) => {
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Prix invalide');
      return;
    }

    setIsSavingPrice(true);
    try {
      await axios.put(
        `${apiBaseUrl}/products/${productId}`,
        { price: priceNum },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log(`✅ Prix du produit ${productId} mis à jour à ${priceNum}`);
      
      // Rafraîchir les données
      await fetchData();
      
      // Fermer le mode édition
      setEditingProductId(null);
      setNewPrice('');
    } catch (err) {
      console.error('Erreur mise à jour prix:', err);
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour du prix.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  if (!isOpen) return null;

  const cartItems = cart?.items || [];
  const wishlistItems = wishlist?.items || [];
  const totalCart = cart?.totalItems || 0;
  const totalWishlist = wishlistItems.length;

  const renderProductStatus = (item) => {
    const tags = [];
    if (!item.is_published) {
      tags.push(<span key="depub" style={{ color: '#c0392b', fontSize: '0.7em', marginLeft: 6, padding: '2px 6px', borderRadius: 3, background: '#fdecea' }}>Dépublié</span>);
    }
    if (item.stock <= 0) {
      tags.push(<span key="stock" style={{ color: '#e67e22', fontSize: '0.7em', marginLeft: 6, padding: '2px 6px', borderRadius: 3, background: '#fff3e0' }}>Rupture</span>);
    }
    return tags;
  };

  // Rendu du prix avec possibilité d'édition
  const renderPriceCell = (item) => {
    const productId = item.productId || item.id;
    
    // Mode édition
    if (editingProductId === productId) {
      return (
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePrice(productId);
                if (e.key === 'Escape') handleCancelEdit();
              }}
              autoFocus
              disabled={isSavingPrice}
              style={{
                width: 90,
                padding: '4px 6px',
                fontSize: 13,
                border: '2px solid #4CAF50',
                borderRadius: 4,
              }}
            />
            <span style={{ fontSize: 12 }}>FCFA</span>
            <button
              onClick={() => handleSavePrice(productId)}
              disabled={isSavingPrice}
              title="Enregistrer"
              style={{
                padding: '4px 8px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isSavingPrice ? 'wait' : 'pointer',
                fontSize: 12,
              }}
            >
              {isSavingPrice ? '...' : '✅'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingPrice}
              title="Annuler"
              style={{
                padding: '4px 8px',
                background: '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ❌
            </button>
          </div>
        </td>
      );
    }

    // Mode affichage
    return (
      <td>
        <span style={{ marginRight: 6 }}>
          {Number(item.price).toLocaleString('fr-FR')} FCFA
        </span>
        <button
          onClick={() => handleStartEdit(productId, item.price)}
          title="Modifier le prix (s'applique à tous les utilisateurs)"
          style={{
            padding: '2px 6px',
            background: 'transparent',
            border: '1px solid #ddd',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ✏️
        </button>
      </td>
    );
  };

  // Rendu de l'image
  const renderImageCell = (item) => (
    <td style={{ padding: '6px' }}>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{
            width: 50,
            height: 50,
            objectFit: 'cover',
            borderRadius: 6,
            border: '1px solid #eee',
          }}
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/50x50?text=${encodeURIComponent((item.name || 'P').substring(0, 3))}`;
          }}
        />
      ) : (
        <div
          style={{
            width: 50,
            height: 50,
            background: '#f0f0f0',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#999',
          }}
        >
          📦
        </div>
      )}
    </td>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>
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

        {/* Info */}
        <p style={{ fontSize: 12, color: '#888', marginBottom: 15, fontStyle: 'italic' }}>
          💡 Modifier le prix s'applique à <b>tous les utilisateurs</b>, pas seulement à {user?.name || 'ce user'}.
        </p>

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
                    <th style={{ width: 60 }}>Image</th>
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
                      {renderImageCell(item)}
                      <td>
                        {item.name}
                        {renderProductStatus(item)}
                      </td>
                      <td>{item.quantity}</td>
                      {renderPriceCell(item)}
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
                  <th style={{ width: 60 }}>Image</th>
                  <th>Produit</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Ajouté le</th>
                </tr>
              </thead>
              <tbody>
                {wishlistItems.map((item) => (
                  <tr key={item.productId}>
                    {renderImageCell(item)}
                    <td>
                      {item.name}
                      {renderProductStatus(item)}
                    </td>
                    {renderPriceCell(item)}
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
