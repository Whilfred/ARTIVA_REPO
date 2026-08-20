// // admin_panel/src/pages/CategoryManagementPage.js
// import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';
// import { Link } from 'react-router-dom';
// import CategoryFormModal from '../components/CategoryFormModal';
// import './ProductManagementPage.css';

// const API_BASE_URL = 'https://e-artiva-htaw.onrender.com/api';

// function CategoryManagementPage() {
//   const [mainCategories, setMainCategories] = useState([]);
//   const [subCategories, setSubCategories] = useState([]);
//   const [allCategories, setAllCategories] = useState([]); // Pour la liste déroulante dans le modal des sous-catégories
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [isSubCategoryModal, setIsSubCategoryModal] = useState(false); // Pour distinguer les modaux
//   const adminToken = localStorage.getItem('adminToken');

//   const fetchCategories = useCallback(async () => {
//     if (!adminToken) return;
//     setIsLoading(true);
//     setError('');
//     try {
//       const response = await axios.get(`${API_BASE_URL}/categories`);
//       const allCats = response.data || [];

//       //Filtrer directement ici
//       setMainCategories(allCats.filter(cat => !cat.parent_id) || []); // Catégories sans parent
//       setSubCategories(allCats.filter(cat => cat.parent_id) || []); // Catégories avec parent
//       setAllCategories(allCats); // Toutes les catégories (pour le select dans le modal des sous-cat)
      
//     } catch (err) {
//       console.error("Erreur chargement catégories:", err);
//       setError(err.response?.data?.message || 'Impossible de charger les catégories.');
//       setMainCategories([]);
//       setSubCategories([]);
//       setAllCategories([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [adminToken]);

//   useEffect(() => {
//     fetchCategories();
//   }, [fetchCategories]);

//   // Gestion des modaux
//   const handleOpenModalForAddMainCategory = () => {
//     setSelectedCategory(null);
//     setIsSubCategoryModal(false);
//     setIsModalOpen(true);
//   };

//   const handleOpenModalForAddSubCategory = () => {
//     setSelectedCategory(null);
//     setIsSubCategoryModal(true);
//     setIsModalOpen(true);
//   };

//   const handleOpenModalForEditMainCategory = (category) => {
//     setSelectedCategory(category);
//      setIsSubCategoryModal(false);
//     setIsModalOpen(true);
//   };

//   const handleOpenModalForEditSubCategory = (category) => {
//     setSelectedCategory(category);
//     setIsSubCategoryModal(true);
//     setIsModalOpen(true);
//   };

//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedCategory(null);
//     setIsSubCategoryModal(false);
//   };

//   const handleSaveCategory = () => {
//     fetchCategories();
//     handleCloseModal();
//   };

//   const handleDeleteCategory = async (categoryId, categoryName) => {
//     if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ? Cela pourrait affecter les produits liés.`)) {
//       setIsLoading(true);
//       setError('');
//       try {
//         await axios.delete(`${API_BASE_URL}/categories/${categoryId}`, {
//           headers: { 'Authorization': `Bearer ${adminToken}` }
//         });
//         fetchCategories();
//       } catch (err) {
//         console.error("Erreur suppression catégorie:", err);
//         setError(err.response?.data?.message || 'Erreur lors de la suppression de la catégorie.');
//       } finally {
//         setIsLoading(false);
//       }
//     }
//   };

//   if (isLoading && mainCategories.length === 0 && subCategories.length === 0) {
//     return <div className="management-page"><p>Chargement des catégories...</p></div>;
//   }

//   return (
//     <div className="management-page">
//       <div className="page-header">
//         <h1>Gestion des Catégories</h1>
//         <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>
//       </div>

//       {error && <p className="error-message">{error}</p>}
//       {isLoading && <p className="loading-indicator">Opération en cours...</p>}

//       {/* Table des Catégories Principales */}
//       <h2>Catégories Principales <button onClick={handleOpenModalForAddMainCategory} className="add-btn">+ Ajouter Catégorie Principale</button></h2>
//       <div className="table-responsive">
//         <table className="custom-table">
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Nom</th>
//               <th>Slug</th>
//               <th>Ordre</th>
//               <th>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {mainCategories.length > 0 ? mainCategories.map(category => (
//               <tr key={category.id}>
//                 <td>{category.id}</td>
//                 <td>{category.name}</td>
//                 <td>{category.slug || '-'}</td>
//                 <td>{category.display_order}</td>
//                 <td className="actions-cell">
//                   <button onClick={() => handleOpenModalForEditMainCategory(category)} className="action-btn edit-btn" title="Modifier">✎</button>
//                   <button onClick={() => handleDeleteCategory(category.id, category.name)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
//                 </td>
//               </tr>
//             )) : (
//               <tr>
//                 <td colSpan="5" style={{textAlign: 'center'}}>Aucune catégorie principale.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Table des Sous-catégories */}
//       <h2>Sous-catégories <button onClick={handleOpenModalForAddSubCategory} className="add-btn">+ Ajouter Sous-catégorie</button></h2>
//       <div className="table-responsive">
//         <table className="custom-table">
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Nom</th>
//               <th>Slug</th>
//               <th>Parente</th>
//               <th>Ordre</th>
//               <th>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {subCategories.length > 0 ? subCategories.map(category => (
//               <tr key={category.id}>
//                 <td>{category.id}</td>
//                 <td>{category.name}</td>
//                 <td>{category.slug || '-'}</td>
//                 <td>{allCategories.find(c => c.id === category.parent_id)?.name || category.parent_id || '-'}</td>
//                 <td>{category.display_order}</td>
//                 <td className="actions-cell">
//                   <button onClick={() => handleOpenModalForEditSubCategory(category)} className="action-btn edit-btn" title="Modifier">✎</button>
//                   <button onClick={() => handleDeleteCategory(category.id, category.name)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
//                 </td>
//               </tr>
//             )) : (
//               <tr>
//                 <td colSpan="6" style={{textAlign: 'center'}}>Aucune sous-catégorie.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {isModalOpen && (
//         <CategoryFormModal
//           isOpen={isModalOpen}
//           onClose={handleCloseModal}
//           onSave={handleSaveCategory}
//           categoryToEdit={selectedCategory}
//           apiBaseUrl={API_BASE_URL}
//           adminToken={adminToken}
//           isSubCategoryModal={isSubCategoryModal} // Indique si c'est un modal de sous-catégorie
//           allCategories={allCategories} // Pour la liste déroulante des catégories parentes
//         />
//       )}
//     </div>
//   );
// }

// export default CategoryManagementPage;


// admin_panel/src/pages/CategoryManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CategoryFormModal from '../components/CategoryFormModal';
import './ProductManagementPage.css';
import { API_BASE_URL } from '../config'; // adresse du backend (locale ou prod) — voir ce fichier

// --- PRODUCTION (désactivé en local) : adresse désormais centralisée dans src/config.js ---
// const API_BASE_URL = 'https://back-end-purple-log-1280.fly.dev/api';

function CategoryManagementPage() {
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]); // Pour la liste déroulante dans le modal des sous-catégories
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSubCategoryModal, setIsSubCategoryModal] = useState(false); // Pour distinguer les modaux
  const adminToken = localStorage.getItem('adminToken');

  const fetchCategories = useCallback(async () => {
    if (!adminToken) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      const allCats = response.data || [];

      //Filtrer directement ici
      setMainCategories(allCats.filter(cat => !cat.parent_id) || []); // Catégories sans parent
      setSubCategories(allCats.filter(cat => cat.parent_id) || []); // Catégories avec parent
      setAllCategories(allCats); // Toutes les catégories (pour le select dans le modal des sous-cat)
      
    } catch (err) {
      console.error("Erreur chargement catégories:", err);
      setError(err.response?.data?.message || 'Impossible de charger les catégories.');
      setMainCategories([]);
      setSubCategories([]);
      setAllCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Gestion des modaux
  const handleOpenModalForAddMainCategory = () => {
    setSelectedCategory(null);
    setIsSubCategoryModal(false);
    setIsModalOpen(true);
  };

  const handleOpenModalForAddSubCategory = () => {
    setSelectedCategory(null);
    setIsSubCategoryModal(true);
    setIsModalOpen(true);
  };

  const handleOpenModalForEditMainCategory = (category) => {
    setSelectedCategory(category);
     setIsSubCategoryModal(false);
    setIsModalOpen(true);
  };

  const handleOpenModalForEditSubCategory = (category) => {
    setSelectedCategory(category);
    setIsSubCategoryModal(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setIsSubCategoryModal(false);
  };

  const handleSaveCategory = () => {
    fetchCategories();
    handleCloseModal();
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ? Cela pourrait affecter les produits liés.`)) {
      setIsLoading(true);
      setError('');
      try {
        await axios.delete(`${API_BASE_URL}/categories/${categoryId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        fetchCategories();
      } catch (err) {
        console.error("Erreur suppression catégorie:", err);
        setError(err.response?.data?.message || 'Erreur lors de la suppression de la catégorie.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading && mainCategories.length === 0 && subCategories.length === 0) {
    return <div className="management-page"><p>Chargement des catégories...</p></div>;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Gestion des Catégories</h1>
        <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>
      </div>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-indicator">Opération en cours...</p>}

      {/* Table des Catégories Principales */}
      <h2>Catégories Principales <button onClick={handleOpenModalForAddMainCategory} className="add-btn">+ Ajouter Catégorie Principale</button></h2>
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Slug</th>
              <th>Ordre</th>
              <th>Sous-catégories</th> {/* Nouvelle colonne */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mainCategories.length > 0 ? mainCategories.map(category => (
              <tr key={category.id}>
                <td>{category.id}</td>
                <td>{category.name}</td>
                <td>{category.slug || '-'}</td>
                <td>{category.display_order}</td>
                <td>
                  {/* Affichage des sous-catégories liées */}
                  <ul>
                    {subCategories
                      .filter(subCat => subCat.parent_id === category.id)
                      .map(subCat => (
                        <li key={subCat.id}>{subCat.name}</li>
                      ))}
                  </ul>
                </td>
                <td className="actions-cell">
                  <button onClick={() => handleOpenModalForEditMainCategory(category)} className="action-btn edit-btn" title="Modifier">✎</button>
                  <button onClick={() => handleDeleteCategory(category.id, category.name)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{textAlign: 'center'}}>Aucune catégorie principale.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table des Sous-catégories */}
      <h2>Sous-catégories <button onClick={handleOpenModalForAddSubCategory} className="add-btn">+ Ajouter Sous-catégorie</button></h2>
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Slug</th>
              <th>Parente</th>
              <th>Ordre</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subCategories.length > 0 ? subCategories.map(category => (
              <tr key={category.id}>
                <td>{category.id}</td>
                <td>{category.name}</td>
                <td>{category.slug || '-'}</td>
                <td>{allCategories.find(c => c.id === category.parent_id)?.name || category.parent_id || '-'}</td>
                <td>{category.display_order}</td>
                <td className="actions-cell">
                  <button onClick={() => handleOpenModalForEditSubCategory(category)} className="action-btn edit-btn" title="Modifier">✎</button>
                  <button onClick={() => handleDeleteCategory(category.id, category.name)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{textAlign: 'center'}}>Aucune sous-catégorie.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveCategory}
          categoryToEdit={selectedCategory}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
          isSubCategoryModal={isSubCategoryModal} // Indique si c'est un modal de sous-catégorie
          allCategories={allCategories} // Pour la liste déroulante des catégories parentes
        />
      )}
    </div>
  );
}

export default CategoryManagementPage;