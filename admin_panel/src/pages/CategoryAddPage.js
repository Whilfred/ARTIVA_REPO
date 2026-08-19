// admin_panel/src/pages/CategoryAddPage.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';

function CategoryAddPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [slug, setSlug] = useState('');
  // Ajoute d'autres champs comme parent_id, display_order si tu veux les gérer ici

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      setError('Non authentifié.');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const categoryData = { name, description, image_url: imageUrl, slug }; // Adapte avec les champs de ton API

    try {
      await axios.post(`${API_BASE_URL}/categories`, categoryData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      setSuccess('Catégorie ajoutée avec succès !');
      setName(''); setDescription(''); setImageUrl(''); setSlug('');
      // navigate('/dashboard'); // Ou vers une liste de catégories
    } catch (err) {
      console.error("Erreur d'ajout catégorie:", err);
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout de la catégorie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <Link to="/dashboard" style={{marginBottom: '20px', display: 'inline-block'}}>← Retour</Link>
      <h1>Ajouter une Nouvelle Catégorie</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="name">Nom de la catégorie :</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required style={{width: '100%', padding: '8px'}}/>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="description">Description :</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} style={{width: '100%', padding: '8px', height: '60px'}}/>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="imageUrl">URL de l'image :</label>
          <input type="text" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{width: '100%', padding: '8px'}} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="slug">Slug (ex: electronique) :</label>
          <input type="text" id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} style={{width: '100%', padding: '8px'}}/>
        </div>
        {/* Ajoute ici les inputs pour parent_id, display_order si besoin */}

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <button type="submit" disabled={isLoading} style={{ padding: '10px', backgroundColor: 'dodgerblue', color: 'white' }}>
          {isLoading ? 'Ajout...' : 'Ajouter Catégorie'}
        </button>
      </form>
    </div>
  );
}
export default CategoryAddPage;