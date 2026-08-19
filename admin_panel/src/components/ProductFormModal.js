// admin_panel/src/components/ProductFormModal.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ProductFormModal.css';

function ProductFormModal({ isOpen, onClose, onSave, productToEdit, apiBaseUrl, adminToken, allCategories }) {
  const initialImageState = { image_url: '', alt_text: '', is_primary: false, display_order: 0 };

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', stock: '', image_url: '',
    sku: '', is_published: false, category_ids: [], tag_ids: [],
    images: [{ ...initialImageState, temp_id: `img-0-${Date.now()}` }],
    videos: ['']
  });

  const [allTags, setAllTags] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [relevantCategories, setRelevantCategories] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]); // track images removed that already had ids
  const [isFetchingFullProduct, setIsFetchingFullProduct] = useState(false);

  // Create formData from a full product object (expects product.images array)
const buildFormDataFromFullProduct = useCallback((prod) => {
  const imagesFromProd = (prod.images || []).map((img, idx) => ({
    ...img,
    image_url: img.image_url || '',
    alt_text: img.alt_text || '',
    is_primary: Boolean(img.is_primary),
    display_order: img.display_order !== undefined ? img.display_order : 0,
    temp_id: img.temp_id || `img-${idx}-${Date.now()}`
  }));

  if ((imagesFromProd.length === 0) && prod.image_url) {
    imagesFromProd.push({
      id: undefined,
      image_url: prod.image_url,
      alt_text: '',
      is_primary: true,
      display_order: 0,
      temp_id: `img-0-${Date.now()}`
    });
  }

  return {
    name: prod.name || '',
    description: prod.description || '',
    price: prod.price !== undefined ? String(prod.price) : '',
    stock: prod.stock !== undefined ? String(prod.stock) : '',
    image_url: prod.image_url || '',
    sku: prod.sku || '',
    is_published: prod.is_published || false,
    category_ids: prod.category_ids || [],
    tag_ids: prod.tag_ids || [],
    images: imagesFromProd.length > 0 ? imagesFromProd : [{ ...initialImageState, temp_id: `img-0-${Date.now()}` }],
    videos: (prod.videos && Array.isArray(prod.videos) && prod.videos.length > 0) 
              ? prod.videos 
              : (prod.video_url ? [prod.video_url] : [''])
  };
}, []);

  // fetch tags options
  const fetchTags = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const tagRes = await axios.get(`${apiBaseUrl}/product-tags`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setAllTags(tagRes.data || []);
    } catch (err) {
      console.error('ProductFormModal: fetchTags error', err);
      setError("Impossible de charger les tags.");
      setAllTags([]);
    } finally {
      setIsLoadingOptions(false);
    }
  }, [apiBaseUrl, adminToken]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  // compute relevant categories
  useEffect(() => {
    const relevant = () => {
      const subCats = allCategories.filter(cat => cat.parent_id);
      const mainCatsWithoutSubs = allCategories.filter(cat => {
        if (cat.parent_id) return false;
        return !allCategories.some(subCat => subCat.parent_id === cat.id);
      });
      return [...subCats, ...mainCatsWithoutSubs];
    };
    setRelevantCategories(relevant());
  }, [allCategories]);

  // When modal opens or productToEdit changes, ensure we load full product details if needed
  useEffect(() => {
    const loadProductIfNeeded = async () => {
      setError('');
      setDeletedImageIds([]);
      if (!isOpen) return;

      if (productToEdit && productToEdit.id) {
        const hasImagesArray = Array.isArray(productToEdit.images) && productToEdit.images.length > 0;
        if (!hasImagesArray || (hasImagesArray && productToEdit.images.length === 1 && productToEdit.images[0].image_url === productToEdit.image_url)) {
          try {
            setIsFetchingFullProduct(true);
            console.log('ProductFormModal: Fetching full product details for id', productToEdit.id);
            const res = await axios.get(`${apiBaseUrl}/products/${productToEdit.id}`, {
              headers: { Authorization: `Bearer ${adminToken}` }
            });
            const fullProd = res.data;
            setFormData(buildFormDataFromFullProduct(fullProd));
          } catch (err) {
            console.warn('ProductFormModal: unable to fetch full product, falling back to productToEdit', err);
            setFormData(buildFormDataFromFullProduct(productToEdit));
          } finally {
            setIsFetchingFullProduct(false);
          }
        } else {
          setFormData(buildFormDataFromFullProduct(productToEdit));
        }
      } else {
        setFormData({
          name: '', description: '', price: '', stock: '', image_url: '',
          sku: '', is_published: false, category_ids: [], tag_ids: [],
          images: [{ ...initialImageState, temp_id: `img-0-${Date.now()}` }],
          videos: ['']
        });
      }
    };

    loadProductIfNeeded();
  }, [productToEdit, isOpen, buildFormDataFromFullProduct]);

  const handleImageChange = (index, field, value, type = 'text') => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages[index] = {
        ...newImages[index],
        [field]: type === 'checkbox' ? !newImages[index][field] : value
      };
      if (field === 'is_primary' && value === true) {
        newImages.forEach((img, i) => { if (i !== index) img.is_primary = false; });
      }
      return { ...prev, images: newImages };
    });
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { ...initialImageState, temp_id: `img-${prev.images.length}-${Date.now()}` }]
    }));
  };

  const removeImageField = (index) => {
    setFormData(prev => {
      const imgToRemove = prev.images[index];
      const newImages = prev.images.filter((_, i) => i !== index);
      if (imgToRemove && imgToRemove.id) {
        setDeletedImageIds(prevIds => [...prevIds, imgToRemove.id]);
      }
      return { ...prev, images: newImages };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMultiSelectChange = (type, id) => {
    const idNum = parseInt(id, 10);
    setFormData(prev => {
      const field = type === 'category' ? 'category_ids' : 'tag_ids';
      const curr = prev[field] || [];
      const next = curr.includes(idNum) ? curr.filter(v => v !== idNum) : [...curr, idNum];
      return { ...prev, [field]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const imagesPayload = formData.images
        .map(({ temp_id, id, ...imgData }) => ({
          id: id ?? undefined,
          image_url: imgData.image_url,
          alt_text: imgData.alt_text || null,
          is_primary: Boolean(imgData.is_primary),
          display_order: parseInt(String(imgData.display_order), 10) || 0
        }))
        .filter(img => img.image_url && img.image_url.trim() !== '');

      const videosPayload = formData.videos
        .filter(v => v && v.trim() !== '');

      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock, 10) || 0,
        sku: formData.sku && formData.sku.trim() !== '' ? formData.sku : undefined,
        is_published: Boolean(formData.is_published),
        category_ids: formData.category_ids || [],
        tag_ids: formData.tag_ids || [],
        images: imagesPayload,
        deleted_image_ids: deletedImageIds.length ? deletedImageIds : undefined,
        videos: videosPayload,
        video_url: videosPayload.length > 0 ? videosPayload[0] : null
      };

      const primaryImage = imagesPayload.find(img => img.is_primary);
      if (primaryImage) payload.image_url = primaryImage.image_url;
      else if (imagesPayload.length > 0 && !payload.image_url) payload.image_url = imagesPayload[0].image_url;

      if (productToEdit && productToEdit.id) {
        console.log('ProductFormModal: PUT /products/', productToEdit.id, payload);
        await axios.put(`${apiBaseUrl}/products/${productToEdit.id}`, payload, {
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
        });
      } else {
        console.log('ProductFormModal: POST /products', payload);
        await axios.post(`${apiBaseUrl}/products`, payload, {
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
        });
      }

      onSave();
    } catch (err) {
      console.error('ProductFormModal: save error', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du produit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{productToEdit ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}</h2>

        {(isLoadingOptions || isFetchingFullProduct) && <p>Chargement des options / détails produit...</p>}
        {!isLoadingOptions && error && !isSubmitting && <p className="error-message-form">{error}</p>}

        {!isLoadingOptions && (
          <form onSubmit={handleSubmit}>
            {/* Nom */}
            <div className="form-group">
              <label htmlFor="modal-name">Nom :</label>
              <input type="text" name="name" id="modal-name" value={formData.name} onChange={handleChange} required />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="modal-description">Description :</label>
              <textarea name="description" id="modal-description" value={formData.description} onChange={handleChange} />
            </div>

            {/* Prix & Stock */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="modal-price">Prix (FCFA) :</label>
                <input type="number" name="price" id="modal-price" value={formData.price} onChange={handleChange} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="modal-stock">Stock :</label>
                <input type="number" name="stock" id="modal-stock" value={formData.stock} onChange={handleChange} required />
              </div>
            </div>

            {/* SKU & image_url */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="modal-sku">SKU :</label>
                <input type="text" name="sku" id="modal-sku" value={formData.sku} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="modal-image_url">URL Image :</label>
                <input type="text" name="image_url" id="modal-image_url" value={formData.image_url} onChange={handleChange} />
              </div>
            </div>

            {/* Galerie d'images */}
            <div className="form-group">
              <label>Galerie d'Images (optionnel) :</label>
              {formData.images.map((img, index) => (
                <div key={img.temp_id || index} className="image-entry" style={{ border: '1px dashed #ccc', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                  <div className="form-group">
                    <label>URL Image {index + 1} :</label>
                    <input type="text" value={img.image_url} onChange={e => handleImageChange(index, 'image_url', e.target.value)} placeholder="https://example.com/image.jpg" />
                  </div>

                  <div className="form-group">
                    <label>Texte Alternatif :</label>
                    <input type="text" value={img.alt_text} onChange={e => handleImageChange(index, 'alt_text', e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="checkbox-item">
                      <input type="checkbox" checked={img.is_primary} onChange={e => handleImageChange(index, 'is_primary', e.target.checked, 'checkbox')} />
                      <label>Image Principale ?</label>
                    </div>

                    <div className="form-group" style={{ width: '100px' }}>
                      <label>Ordre :</label>
                      <input type="number" value={img.display_order} onChange={e => handleImageChange(index, 'display_order', e.target.value)} />
                    </div>

                    {formData.images.length > 1 && (
                      <button type="button" onClick={() => removeImageField(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Supprimer
                      </button>
                    )}
                  </div>

                  {img.id && <small style={{ display: 'block', marginTop: '6px' }}>persisted id: {img.id}</small>}
                </div>
              ))}

              <button type="button" onClick={addImageField} style={{ marginTop: '5px', padding: '8px' }}>+ Ajouter une autre image</button>
            </div>

            {/* Vidéos */}
            <div className="form-group">
              <label>Vidéos (optionnel) :</label>

              {formData.videos.map((vid, index) => (
                <div key={index} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder={`URL vidéo ${index + 1}`}
                    value={vid}
                    onChange={(e) => {
                      const copy = [...formData.videos];
                      copy[index] = e.target.value;
                      setFormData(prev => ({ ...prev, videos: copy }));
                    }}
                    style={{ flex: 1 }}
                  />
                  {formData.videos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = formData.videos.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, videos: copy }));
                      }}
                      style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              ))}

              <button type="button"
                onClick={() => setFormData(prev => ({ ...prev, videos: [...prev.videos, ''] }))}
                style={{ marginTop: '5px', padding: '8px' }}
              >
                + Ajouter une autre vidéo
              </button>
            </div>

            {/* Categories */}
            <div className="form-group">
              <label>Catégories :</label>
              <div className="checkbox-group">
                {relevantCategories.length > 0 ? relevantCategories.map(cat => (
                  <div key={`cat-opt-${cat.id}`} className="checkbox-item">
                    <input type="checkbox" id={`modal-cat-${cat.id}`} value={cat.id} checked={formData.category_ids.includes(cat.id)} onChange={() => handleMultiSelectChange('category', cat.id)} />
                    <label htmlFor={`modal-cat-${cat.id}`}>{cat.name}</label>
                  </div>
                )) : <p>Aucune catégorie disponible.</p>}
              </div>
            </div>

            {/* Tags */}
            <div className="form-group">
              <label>Tags :</label>
              <div className="checkbox-group">
                {allTags.length > 0 ? allTags.map(tag => (
                  <div key={`tag-opt-${tag.id}`} className="checkbox-item">
                    <input type="checkbox" id={`modal-tag-${tag.id}`} value={tag.id} checked={formData.tag_ids.includes(tag.id)} onChange={() => handleMultiSelectChange('tag', tag.id)} />
                    <label htmlFor={`modal-tag-${tag.id}`}>{tag.name}</label>
                  </div>
                )) : <p>Aucun tag disponible.</p>}
              </div>
            </div>

            {/* Publish */}
            <div className="form-group checkbox-item" style={{ marginTop: '10px' }}>
              <input type="checkbox" name="is_published" id="modal-is_published" checked={formData.is_published} onChange={handleChange} />
              <label htmlFor="modal-is_published">Publier ce produit ?</label>
            </div>

            {error && isSubmitting && <p className="error-message-form">{error}</p>}

            <div className="form-actions">
              <button type="submit" disabled={isSubmitting || isFetchingFullProduct || isLoadingOptions} className="save-btn">
                {isSubmitting ? 'Sauvegarde...' : (productToEdit ? 'Mettre à Jour' : 'Ajouter Produit')}
              </button>
              <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>Annuler</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProductFormModal;
