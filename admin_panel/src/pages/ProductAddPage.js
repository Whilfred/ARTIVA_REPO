// admin_panel/src/pages/ProductAddPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
// Tu pourrais créer un fichier CSS pour cette page aussi: import './ProductAddPage.css';

const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';

function ProductAddPage() {
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState([]); // Pour lister les catégories existantes
  const [selectedCategories, setSelectedCategories] = useState([]); // IDs des catégories sélectionnées
  const [tags, setTags] = useState([]); // Pour lister les tags existants
  const [selectedTags, setSelectedTags] = useState([]); // IDs des tags sélectionnés
  const [sku, setSku] = useState(''); // Si tu utilises SKU
  const [isPublished, setIsPublished] = useState(false); // Si tu utilises is_published

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les catégories et les tags au montage du composant
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les catégories
        const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`);
        setCategories(categoriesResponse.data || []);

        // Charger les tags (tu devras créer cette API backend)
        // Exemple si l'API existait:
        // const tagsResponse = await axios.get(`${API_BASE_URL}/tags`);
        // setTags(tagsResponse.data || []);
        // Pour l'instant, on peut simuler ou les coder en dur si peu nombreux
        setTags([ // Simulation
          { id: 1, name: 'nouveau' },
          { id: 2, name: 'pour_vous' },
          { id: 3, name: 'populaire' },
        ]);

      } catch (err) {
        console.error("Erreur de chargement catégories/tags:", err);
        setError('Impossible de charger les catégories ou les tags.');
      }
    };
    fetchData();
  }, []);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const handleTagChange = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      setError('Non authentifié. Veuillez vous reconnecter.');
      setIsLoading(false);
      navigate('/login'); // Rediriger si pas de token
      return;
    }

    const productData = {
      name: productName,
      description,
      price: parseFloat(price), // S'assurer que c'est un nombre
      stock: parseInt(stock, 10), // S'assurer que c'est un entier
      image_url: imageUrl,
      category_ids: selectedCategories.map(id => parseInt(id,10)), // S'assurer que ce sont des nombres
      tag_ids: selectedTags.map(id => parseInt(id,10)), // S'assurer que ce sont des nombres
      sku: sku || null, // Envoyer null si vide et que la BDD le permet
      is_published: isPublished,
    };

    try {
      await axios.post(`${API_BASE_URL}/products`, productData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      setSuccess('Produit ajouté avec succès !');
      // Réinitialiser le formulaire (optionnel)
      setProductName(''); setDescription(''); setPrice(''); setStock(''); setImageUrl('');
      setSelectedCategories([]); setSelectedTags([]); setSku(''); setIsPublished(false);
      // navigate('/dashboard'); // Ou vers une liste de produits
    } catch (err) {
      console.error("Erreur d'ajout produit:", err);
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout du produit.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{marginBottom: '20px', display: 'inline-block'}}>← Retour au Tableau de Bord</Link>
      <h1>Ajouter un Nouveau Produit</h1>
      <form onSubmit={handleSubmit}>
        {/* Nom du produit */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="productName">Nom du produit :</label>
          <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} required style={formStyles.input} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="description">Description :</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} style={{...formStyles.input, height: '80px'}} />
        </div>

        {/* Prix */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="price">Prix :</label>
          <input type="number" id="price" value={price} onChange={(e) => setPrice(e.target.value)} required step="0.01" style={formStyles.input} />
        </div>

        {/* Stock */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="stock">Stock :</label>
          <input type="number" id="stock" value={stock} onChange={(e) => setStock(e.target.value)} required step="1" style={formStyles.input} />
        </div>
        
        {/* SKU (Optionnel) */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="sku">SKU (Optionnel) :</label>
          <input type="text" id="sku" value={sku} onChange={(e) => setSku(e.target.value)} style={formStyles.input} />
        </div>

        {/* URL de l'image */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="imageUrl">URL de l'image principale :</label>
          <input type="text" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={formStyles.input} />
        </div>

        {/* Catégories (checkboxes) */}
        <div style={{ marginBottom: '15px' }}>
          <p>Catégories :</p>
          {categories.length > 0 ? categories.map(cat => (
            <div key={cat.id} style={{display: 'flex', alignItems: 'center', marginBottom: '5px'}}>
              <input 
                type="checkbox" 
                id={`cat-${cat.id}`} 
                value={cat.id} 
                checked={selectedCategories.includes(cat.id)} 
                onChange={() => handleCategoryChange(cat.id)}
                style={{marginRight: '8px'}}
              />
              <label htmlFor={`cat-${cat.id}`}>{cat.name}</label>
            </div>
          )) : <p>Chargement des catégories...</p>}
        </div>

        {/* Tags (checkboxes) */}
        <div style={{ marginBottom: '15px' }}>
          <p>Tags (Optionnel: Nouveau, Pour vous, etc.) :</p>
          {tags.map(tag => (
            <div key={tag.id} style={{display: 'flex', alignItems: 'center', marginBottom: '5px'}}>
              <input 
                type="checkbox" 
                id={`tag-${tag.id}`} 
                value={tag.id} 
                checked={selectedTags.includes(tag.id)} 
                onChange={() => handleTagChange(tag.id)}
                style={{marginRight: '8px'}}
              />
              <label htmlFor={`tag-${tag.id}`}>{tag.name}</label>
            </div>
          ))}
        </div>

        {/* Publié ? */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <input 
                type="checkbox" 
                id="isPublished" 
                checked={isPublished} 
                onChange={(e) => setIsPublished(e.target.checked)}
                style={{marginRight: '8px'}} 
            />
            <label htmlFor="isPublished">Publier ce produit ?</label>
        </div>


        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}

        <button type="submit" disabled={isLoading} style={formStyles.button}>
          {isLoading ? 'Ajout en cours...' : 'Ajouter le Produit'}
        </button>
      </form>
    </div>
  );
}

// Styles basiques pour le formulaire
const formStyles = {
    input: {
        width: 'calc(100% - 16px)', // Ajuste pour le padding
        padding: '10px',
        marginTop: '5px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        fontSize: '16px'
    },
    button: {
        padding: '12px 20px',
        backgroundColor: 'green',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        opacity: 1
    },
    // Tu peux ajouter un style pour le bouton désactivé si tu veux:
    // buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' }
};

export default ProductAddPage;