// admin_panel/src/pages/CampaignsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import CampaignFormModal from '../components/CampaignFormModal';
import { API_BASE_URL } from '../config';
import './ProductManagementPage.css';

const STATUT_LABELS = {
  draft: { label: 'Brouillon', color: '#666' },
  scheduled: { label: 'Programmée', color: '#2196F3' },
  sending: { label: 'Envoi en cours...', color: '#FF9800' },
  sent: { label: 'Envoyée', color: '#28a745' },
  failed: { label: 'Échec', color: '#dc3545' },
};

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const adminToken = localStorage.getItem('adminToken');
  const navigate = useNavigate();

  const fetchCampaigns = useCallback(async () => {
    if (!adminToken) {
      navigate('/login');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setCampaigns(res.data.campaigns || []);
    } catch (err) {
      console.error('Erreur chargement campagnes:', err);
      setError(err.response?.data?.message || 'Impossible de charger les campagnes.');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Rafraîchit automatiquement pendant qu'une campagne est en cours d'envoi,
  // pour voir les compteurs envoyés/échoués progresser sans recharger la page.
  useEffect(() => {
    const enCours = campaigns.some((c) => c.status === 'sending');
    if (!enCours) return;
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  const handleSendNow = async (id) => {
    if (!window.confirm('Envoyer cette campagne maintenant ?')) return;
    try {
      await axios.post(`${API_BASE_URL}/campaigns/${id}/send`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      fetchCampaigns();
    } catch (err) {
      console.error('Erreur envoi campagne:', err);
      setError(err.response?.data?.message || "Erreur lors de l'envoi.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette campagne (brouillon ou programmation) ?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      fetchCampaigns();
    } catch (err) {
      console.error('Erreur suppression campagne:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Campagnes Email</h1>
        <button className="add-product-btn" onClick={() => setIsModalOpen(true)}>+ Nouvelle campagne</button>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-indicator">Chargement...</p>}

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Sujet</th>
              <th>Statut</th>
              <th>Destinataires</th>
              <th>Envoyés / Échoués</th>
              <th>Programmée / Envoyée le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length > 0 ? campaigns.map((c) => {
              const statut = STATUT_LABELS[c.status] || { label: c.status, color: '#666' };
              return (
                <tr key={c.id}>
                  <td>{c.subject}</td>
                  <td><span style={{ color: statut.color, fontWeight: 'bold' }}>{statut.label}</span></td>
                  <td>{c.total_destinataires}</td>
                  <td>{c.envoyes} / {c.echoues}</td>
                  <td>
                    {c.status === 'scheduled' && c.scheduled_at && new Date(c.scheduled_at).toLocaleString('fr-FR')}
                    {(c.status === 'sent' || c.status === 'failed') && c.sent_at && new Date(c.sent_at).toLocaleString('fr-FR')}
                    {c.status === 'draft' && '-'}
                  </td>
                  <td className="actions-cell">
                    {(c.status === 'draft' || c.status === 'scheduled') && (
                      <>
                        <button onClick={() => handleSendNow(c.id)} className="action-btn" title="Envoyer maintenant">📤</button>
                        <button onClick={() => handleDelete(c.id)} className="action-btn delete-btn" title="Supprimer">🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucune campagne pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CampaignFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={fetchCampaigns}
          apiBaseUrl={API_BASE_URL}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}

export default CampaignsPage;
