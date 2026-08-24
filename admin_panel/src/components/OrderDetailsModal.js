// admin_panel/src/components/OrderDetailsModal.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './ProductFormModal.css';
import './OrderDetailsModal.css';

function OrderDetailsModal({ isOpen, onClose, orderId, apiBaseUrl, adminToken }) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // { images: string[], alt, currentIndex }
  const [lightbox, setLightbox] = useState(null);
  const [imageAnimKey, setImageAnimKey] = useState(0); // force le rejeu de l'animation à chaque changement d'image

  // Cache des images par produit, chargées automatiquement dès que la commande est affichée.
  // Forme: { [product_id]: { images: string[], loading: bool, error: bool } }
  const [productImages, setProductImages] = useState({});

  const touchStartX = useRef(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!isOpen || !orderId || !adminToken) {
      setOrderDetails(null);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${apiBaseUrl}/orders/admin/${orderId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      setOrderDetails(response.data);
    } catch (err) {
      console.error("OrderDetailsModal: Erreur chargement détails commande:", err);
      setError(err.response?.data?.message || 'Impossible de charger les détails de la commande.');
      setOrderDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, orderId, apiBaseUrl, adminToken]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Réinitialiser le cache d'images à chaque fermeture/changement de commande,
  // pour ne pas garder les images d'une commande précédente en mémoire.
  useEffect(() => {
    if (!isOpen) {
      setProductImages({});
      setLightbox(null);
    }
  }, [isOpen]);

  // Dès que les détails de la commande arrivent, on précharge en parallèle
  // toutes les images de chaque produit (une seule requête par produit unique).
  useEffect(() => {
    if (!orderDetails?.items || !adminToken) return;

    const uniqueProductIds = [...new Set(
      orderDetails.items.filter(i => i.product_id).map(i => i.product_id)
    )];
    if (uniqueProductIds.length === 0) return;

    setProductImages(prev => {
      const next = { ...prev };
      uniqueProductIds.forEach(pid => {
        if (!next[pid]) next[pid] = { images: [], loading: true, error: false };
      });
      return next;
    });

    uniqueProductIds.forEach(async (pid) => {
      try {
        const res = await axios.get(`${apiBaseUrl}/products/${pid}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        let imgs = [];
        if (Array.isArray(res.data.images) && res.data.images.length > 0) {
          imgs = res.data.images
            .slice()
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            .map(img => img.image_url)
            .filter(Boolean);
        }
        if (imgs.length === 0 && res.data.image_url) imgs = [res.data.image_url];

        setProductImages(prev => ({
          ...prev,
          [pid]: { images: imgs, loading: false, error: imgs.length === 0 }
        }));
      } catch (err) {
        console.error('OrderDetailsModal: erreur chargement images produit', pid, err);
        setProductImages(prev => ({
          ...prev,
          [pid]: { images: [], loading: false, error: true }
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDetails, apiBaseUrl, adminToken]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const renderAddress = (addressString) => {
    if (!addressString) return <p>Non spécifiée</p>;
    try {
      const addressObj = typeof addressString === 'string' ? JSON.parse(addressString) : addressString;
      return (
        <>
          {addressObj.name && <p>{addressObj.name}</p>}
          {addressObj.line1 && <p>{addressObj.line1}</p>}
          {addressObj.line2 && <p>{addressObj.line2}</p>}
          <p>{addressObj.city}{addressObj.postal_code && `, ${addressObj.postal_code}`}</p>
          {addressObj.country && <p>{addressObj.country}</p>}
          {addressObj.phone && <p>Tél: {addressObj.phone}</p>}
        </>
      );
    } catch (e) {
      return <p>{String(addressString)}</p>;
    }
  };

  // Récupère la liste des images connues pour un article : d'abord le cache produit
  // (potentiellement plusieurs images), sinon l'image unique déjà présente sur l'item.
  const getImagesForItem = useCallback((item) => {
    if (item.product_id && productImages[item.product_id]?.images?.length > 0) {
      return productImages[item.product_id].images;
    }
    if (item.image_url) return [item.image_url];
    return [];
  }, [productImages]);

  const isLoadingImagesForItem = (item) => {
    return Boolean(item.product_id && productImages[item.product_id]?.loading);
  };

  const openImageViewer = (item) => {
    const images = getImagesForItem(item);
    if (images.length === 0) return;
    setImageAnimKey(k => k + 1);
    setLightbox({ images, alt: item.product_name, currentIndex: 0 });
  };

  const goToPrevImage = useCallback(() => {
    setImageAnimKey(k => k + 1);
    setLightbox(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length } : prev);
  }, []);

  const goToNextImage = useCallback(() => {
    setImageAnimKey(k => k + 1);
    setLightbox(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length } : prev);
  }, []);

  const goToImage = (idx) => {
    setImageAnimKey(k => k + 1);
    setLightbox(prev => prev ? { ...prev, currentIndex: idx } : prev);
  };

  // Navigation clavier : ← → pour changer d'image, Échap pour fermer
  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrevImage();
      else if (e.key === 'ArrowRight') goToNextImage();
      else if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox, goToPrevImage, goToNextImage]);

  // Défilement tactile (swipe) sur mobile
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goToPrevImage(); else goToNextImage();
    }
    touchStartX.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content order-details-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Détails de la Commande</h2>

        {isLoading && <p>Chargement des détails...</p>}
        {error && <p className="error-message-form" style={{color: 'red'}}>{error}</p>}

        {orderDetails && !isLoading && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="order-section">
              <h4>Informations Générales</h4>
              <p><strong>N° Commande :</strong> {orderDetails.order_number}</p>
              <p><strong>ID Commande :</strong> {orderDetails.orderId}</p>
              <p><strong>Date :</strong> {formatDate(orderDetails.createdAt)}</p>
              <p><strong>Statut :</strong> <span className={`status-${orderDetails.status}`}>{orderDetails.status}</span></p>
              <p><strong>Total :</strong> {orderDetails.total} {orderDetails.currency}</p>
              {orderDetails.promo_code && (
                <p style={{ color: '#1e7e34' }}>
                  <strong>Code promo :</strong> {orderDetails.promo_code}
                  {' '}(remise de {Number(orderDetails.discount_amount).toLocaleString('fr-FR')} {orderDetails.currency})
                </p>
              )}
            </div>

            <div className="order-section">
              <h4>Client</h4>
              <p><strong>Nom :</strong> {orderDetails.userName || 'N/A'}</p>
              <p><strong>Email :</strong> {orderDetails.userEmail || 'N/A'}</p>
              <p><strong>Numéro de Téléphone :</strong> {orderDetails.userPhone || 'N/A'}</p>
            </div>

            <div className="order-section">
              <h4>Adresse de Livraison</h4>
              <div className="address-details">{renderAddress(orderDetails.shipping_address)}</div>
            </div>

            {orderDetails.billing_address && (
              <div className="order-section">
                <h4>Adresse de Facturation</h4>
                <div className="address-details">{renderAddress(orderDetails.billing_address)}</div>
              </div>
            )}

            <div className="order-section">
              <h4>Articles Commandés ({orderDetails.items?.length || 0})</h4>
              {orderDetails.items && orderDetails.items.length > 0 ? (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>SKU</th>
                      <th>Qté</th>
                      <th>Prix Unit.</th>
                      <th>Sous-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails.items.map(item => {
                      const images = getImagesForItem(item);
                      const loading = isLoadingImagesForItem(item);
                      return (
                        <tr key={item.itemId || item.product_id}>
                          <td>
                            <button
                              type="button"
                              className="product-name-link odm-product-link"
                              onClick={() => openImageViewer(item)}
                              disabled={images.length === 0}
                              title={images.length > 0 ? `Voir ${images.length} image(s)` : 'Aucune image'}
                            >
                              <span className="product-name-link-icon">🖼️</span>
                              {item.product_name}
                              {loading && <span className="odm-badge odm-badge-loading">…</span>}
                              {!loading && images.length > 1 && (
                                <span className="odm-badge odm-badge-count">{images.length}</span>
                              )}
                            </button>
                          </td>
                          <td>{item.sku || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit_price} {orderDetails.currency}</td>
                          <td>{item.subtotal} {orderDetails.currency}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p>Aucun article trouvé pour cette commande.</p>
              )}
            </div>

            {orderDetails.shipping_method && (
                <div className="order-section">
                    <h4>Livraison</h4>
                    <p><strong>Méthode :</strong> {orderDetails.shipping_method}</p>
                    <p><strong>Coût :</strong> {orderDetails.shipping_cost} {orderDetails.currency}</p>
                </div>
            )}

            {orderDetails.notes && (
              <div className="order-section">
                <h4>Notes de la Commande</h4>
                <p>{orderDetails.notes}</p>
              </div>
            )}

          </div>
        )}
        <div className="form-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between'}}>
          <button type="button" onClick={() => alert(`Imprimer facture pour commande ${orderDetails?.order_number} (à implémenter)`)} className="action-btn print-btn" disabled={!orderDetails || isLoading}>
            🖨️ Imprimer Facture
          </button>
          <button type="button" onClick={onClose} className="cancel-btn">Fermer</button>
        </div>

        {lightbox && (
          <div className="odm-viewer-overlay" onClick={() => setLightbox(null)}>
            <div
              className="odm-viewer"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="odm-viewer-header">
                <span className="odm-viewer-title">{lightbox.alt}</span>
                {lightbox.images.length > 1 && (
                  <span className="odm-viewer-counter">{lightbox.currentIndex + 1} / {lightbox.images.length}</span>
                )}
                <button className="odm-viewer-close" onClick={() => setLightbox(null)} aria-label="Fermer">✕</button>
              </div>

              <div className="odm-viewer-stage">
                {lightbox.images.length > 1 && (
                  <button className="odm-viewer-arrow odm-viewer-arrow-left" onClick={goToPrevImage} aria-label="Image précédente">‹</button>
                )}

                <div className="odm-viewer-image-wrap">
                  <img
                    key={imageAnimKey}
                    src={lightbox.images[lightbox.currentIndex]}
                    alt={`${lightbox.alt} ${lightbox.currentIndex + 1}`}
                    className="odm-viewer-image"
                  />
                </div>

                {lightbox.images.length > 1 && (
                  <button className="odm-viewer-arrow odm-viewer-arrow-right" onClick={goToNextImage} aria-label="Image suivante">›</button>
                )}
              </div>

              {lightbox.images.length > 1 && (
                <div className="odm-viewer-thumbs">
                  {lightbox.images.map((url, idx) => (
                    <button
                      key={idx}
                      className={`odm-viewer-thumb ${idx === lightbox.currentIndex ? 'active' : ''}`}
                      onClick={() => goToImage(idx)}
                    >
                      <img src={url} alt={`miniature ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Styles de la visionneuse d'images — carrousel plein écran */}
      <style>{`
        .odm-product-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .odm-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
        }
        .odm-badge-count {
          background: #eef2ff;
          color: #4338ca;
        }
        .odm-badge-loading {
          background: #f1f3f5;
          color: #868e96;
        }

        .odm-viewer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 14, 0.92);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 24px;
          animation: odm-fade-in 0.18s ease-out;
        }

        .odm-viewer {
          width: 100%;
          max-width: 960px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: odm-scale-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
        }

        .odm-viewer-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 14px;
          padding: 0 48px;
        }
        .odm-viewer-title {
          color: #f5f5f7;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.2px;
          text-align: center;
          max-width: 70%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .odm-viewer-counter {
          position: absolute;
          right: 48px;
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          background: rgba(255,255,255,0.08);
          padding: 3px 10px;
          border-radius: 999px;
        }
        .odm-viewer-close {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.08);
          border: none;
          color: #fff;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-size: 15px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .odm-viewer-close:hover {
          background: rgba(255,255,255,0.18);
          transform: translateY(-50%) scale(1.06);
        }

        .odm-viewer-stage {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .odm-viewer-image-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          max-height: 68vh;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255,255,255,0.03);
        }
        .odm-viewer-image {
          max-width: 100%;
          max-height: 68vh;
          object-fit: contain;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.55);
          animation: odm-image-fade 0.25s ease-out;
        }

        .odm-viewer-arrow {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .odm-viewer-arrow:hover {
          background: rgba(255,255,255,0.22);
          transform: scale(1.08);
        }
        .odm-viewer-arrow:active {
          transform: scale(0.96);
        }

        .odm-viewer-thumbs {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          max-width: 100%;
          overflow-x: auto;
          padding: 4px 2px 8px;
        }
        .odm-viewer-thumb {
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          padding: 0;
          border-radius: 8px;
          border: 2px solid transparent;
          background: rgba(255,255,255,0.06);
          cursor: pointer;
          overflow: hidden;
          opacity: 0.55;
          transition: opacity 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .odm-viewer-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .odm-viewer-thumb:hover {
          opacity: 0.85;
          transform: translateY(-2px);
        }
        .odm-viewer-thumb.active {
          opacity: 1;
          border-color: #6366f1;
        }

        @keyframes odm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes odm-scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes odm-image-fade {
          from { opacity: 0; transform: scale(0.985); }
          to { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 640px) {
          .odm-viewer-stage { gap: 6px; }
          .odm-viewer-arrow { width: 38px; height: 38px; font-size: 20px; }
          .odm-viewer-header { padding: 0 40px; }
        }
      `}</style>
    </div>
  );
}

export default OrderDetailsModal;