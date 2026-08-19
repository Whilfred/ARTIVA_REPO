// admin_panel/src/pages/ProductManagementPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ProductFormModal from '../components/ProductFormModal';
import './ProductManagementPage.css';

const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';

function ProductManagementPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const adminToken = localStorage.getItem('adminToken');

  const fetchProducts = useCallback(async () => {
    if (!adminToken) {
      console.error("Admin non authentifié, impossible de charger les produits.");
      setError("Authentification requise.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const [prodResponse, catResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/products/admin/all`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
        axios.get(`${API_BASE_URL}/categories`, {})
      ]);

      setAllProducts(prodResponse.data.products || []);
      setAllCategories(catResponse.data || []);
      console.log("Produits chargés pour l'admin:", prodResponse.data.products?.length);
      console.log("Catégories chargées pour l'admin:", catResponse.data?.length);
    } catch (err) {
      console.error("Erreur chargement produits (admin):", err);
      setError(err.response?.data?.message || 'Impossible de charger les produits et/ou catégories.');
      setAllProducts([]);
      setAllCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return allProducts;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allProducts.filter(product =>
      (product.name && product.name.toLowerCase().includes(lowerSearchTerm)) ||
      (product.sku && product.sku.toLowerCase().includes(lowerSearchTerm)) ||
      (product.id && String(product.id).toLowerCase().includes(lowerSearchTerm))
    );
  }, [allProducts, searchTerm]);

  const handleOpenModalForAdd = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = () => {
    fetchProducts();
    handleCloseModal();
  };

  const handleTogglePublishStatus = async (productId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? "publier" : "masquer";
    if (window.confirm(`Voulez-vous vraiment ${action} ce produit ?`)) {
      setIsLoading(true);
      setError('');
      try {
        await axios.put(`${API_BASE_URL}/products/${productId}`,
          { is_published: newStatus },
          { headers: { 'Authorization': `Bearer ${adminToken}` } }
        );
        setAllProducts(prevProducts =>
          prevProducts.map(p => p.id === productId ? { ...p, is_published: newStatus } : p)
        );
      } catch (err) {
        console.error(`Erreur lors de la tentative de ${action} le produit:`, err);
        setError(err.response?.data?.message || `Erreur lors de la mise à jour du statut du produit.`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="product-management-page">
        <div className="page-header"><h1>Gestion des Produits</h1></div>
        <p>Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="product-management-page">
      <div className="page-header">
        <h1>Gestion des Produits</h1>
        <button onClick={handleOpenModalForAdd} className="add-product-btn">+ Ajouter Produit</button>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Rechercher par nom, SKU, ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <p className="error-message">{error}</p>}
      {isLoading && searchTerm && <p className="loading-indicator">Recherche en cours...</p>}
      {isLoading && <p className="loading-indicator">Opération en cours...</p>}

      <div className="table-responsive">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Nom</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Catégories</th>
              <th>Tags</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? filteredProducts.map(product => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>
                  <img
                    src={product.image_url || 'https://via.placeholder.com/50?text=N/A'}
                    alt={product.name || 'Produit'}
                    className="product-thumbnail"
                  />
                </td>
                <td>{product.name || 'N/A'}</td>
                <td>{product.price !== undefined ? `${product.price} FCFA` : 'N/A'}</td>
                <td>{product.stock !== undefined ? product.stock : 'N/A'}</td>
                <td>{(product.categories_names || []).join(', ') || '-'}</td>
                <td>{(product.tags_names || []).join(', ') || '-'}</td>
                <td>
                  <span
                    className={product.is_published ? 'status-active' : 'status-inactive'}
                    onClick={() => handleTogglePublishStatus(product.id, product.is_published)}
                    style={{ cursor: 'pointer', padding: '3px 6px', borderRadius: '3px', display: 'inline-block' }}
                    title={product.is_published ? "Publié (cliquer pour masquer)" : "Masqué (cliquer pour publier)"}
                  >
                    {product.is_published ? 'Publié' : 'Masqué'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button onClick={() => handleOpenModalForEdit(product)} className="action-btn edit-btn" title="Modifier">✎</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                  {searchTerm ? "Aucun produit ne correspond à votre recherche." : "Aucun produit à afficher. Cliquez sur '+ Ajouter Produit' pour commencer."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
          productToEdit={selectedProduct}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
          allCategories={allCategories} // Passer toutes les catégories
        />
      )}
    </div>
  );
}

export default ProductManagementPage;