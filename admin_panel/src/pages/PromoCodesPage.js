// admin_panel/src/pages/PromoCodesPage.js
//
// Gestion des codes promotionnels.

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config'; // adresse du backend (locale ou prod) — voir ce fichier
import { Link, useNavigate } from 'react-router-dom';
import './ProductManagementPage.css'; // styles communs aux pages d'administration

// -----------------------------------------------------------------------------
// Utilitaires d'affichage
// -----------------------------------------------------------------------------

const formaterMontant = (v) =>
  v === null || v === undefined || v === '' ? '—' : `${Number(v).toLocaleString('fr-FR')} FCFA`;

const formaterDate = (v) =>
  !v ? '—' : new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Une réduction se lit d'un coup d'œil : « -10 % (max 5 000 FCFA) » ou « -5 000 FCFA ». */
const formaterReduction = (c) =>
  c.discount_type === 'percentage'
    ? `-${Number(c.discount_value)} %${c.max_discount_amount ? ` (max ${Number(c.max_discount_amount).toLocaleString('fr-FR')} FCFA)` : ''}`
    : `-${Number(c.discount_value).toLocaleString('fr-FR')} FCFA`;

/**
 * Le statut est calculé par le serveur, qui seul connaît l'heure de référence.
 * Le recalculer ici donnerait des divergences dès qu'un code expire pendant
 * que la page est ouverte.
 */
const COULEURS_STATUT = {
  actif:    { bg: '#e6f4ea', fg: '#1e7e34' },
  inactif:  { bg: '#f1f3f5', fg: '#6c757d' },
  expiré:   { bg: '#fdecea', fg: '#c0392b' },
  'à venir':{ bg: '#e8f0fe', fg: '#1a56b0' },
  épuisé:   { bg: '#fff4e5', fg: '#a15c00' },
};

const Badge = ({ statut }) => {
  const c = COULEURS_STATUT[statut] || COULEURS_STATUT.inactif;
  return (
    <span style={{
      backgroundColor: c.bg, color: c.fg, padding: '3px 10px',
      borderRadius: 12, fontSize: '0.82em', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {statut}
    </span>
  );
};

/** Les <input type="datetime-local"> n'acceptent pas le format ISO complet. */
const versChampDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// -----------------------------------------------------------------------------
// Formulaire de création / modification
// -----------------------------------------------------------------------------

const FORMULAIRE_VIDE = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  max_discount_amount: '', min_purchase_amount: '', starts_at: '', expires_at: '',
  max_uses: '', max_uses_per_user: '', is_active: true,
};

function PromoFormModal({ isOpen, onClose, onSave, codeToEdit, adminToken }) {
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (codeToEdit && codeToEdit.id) {
      setForm({
        code: codeToEdit.code || '',
        description: codeToEdit.description || '',
        discount_type: codeToEdit.discount_type || 'percentage',
        discount_value: codeToEdit.discount_value ?? '',
        max_discount_amount: codeToEdit.max_discount_amount ?? '',
        min_purchase_amount: codeToEdit.min_purchase_amount ?? '',
        starts_at: versChampDate(codeToEdit.starts_at),
        expires_at: versChampDate(codeToEdit.expires_at),
        max_uses: codeToEdit.max_uses ?? '',
        max_uses_per_user: codeToEdit.max_uses_per_user ?? '',
        is_active: codeToEdit.is_active !== false,
      });
    } else {
      setForm(FORMULAIRE_VIDE);
    }
    setError('');
  }, [codeToEdit, isOpen]);

  const set = (champ) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [champ]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.code.trim()) return setError('Le code est requis.');
    if (!form.discount_value || Number(form.discount_value) <= 0) {
      return setError('La valeur de la réduction doit être supérieure à zéro.');
    }
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) {
      return setError('Un pourcentage ne peut pas dépasser 100.');
    }
    if (form.starts_at && form.expires_at && new Date(form.expires_at) <= new Date(form.starts_at)) {
      return setError("La date d'expiration doit être postérieure à la date de début.");
    }

    setIsSubmitting(true);
    try {
      const entetes = { headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } };
      // Les champs laissés vides partent en null : le serveur les traite comme
      // « pas de limite », ce qui n'est pas la même chose que zéro.
      const payload = { ...form };
      ['max_discount_amount', 'min_purchase_amount', 'starts_at', 'expires_at', 'max_uses', 'max_uses_per_user']
        .forEach((k) => { if (payload[k] === '') payload[k] = null; });

      if (codeToEdit && codeToEdit.id) {
        await axios.put(`${API_BASE_URL}/promo/${codeToEdit.id}`, payload, entetes);
      } else {
        await axios.post(`${API_BASE_URL}/promo`, payload, entetes);
      }
      onSave();
    } catch (err) {
      console.error('Erreur sauvegarde code promo:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const champ = { width: '100%', padding: 9, border: '1px solid #ccc', borderRadius: 4, fontSize: '0.95em', boxSizing: 'border-box' };
  const aide = { fontSize: '0.8em', color: '#6c757d', marginTop: 3, display: 'block' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>{codeToEdit ? 'Modifier le code promo' : 'Nouveau code promo'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="promo-code">Code *</label>
            <input id="promo-code" type="text" value={form.code} onChange={set('code')}
                   style={{ ...champ, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}
                   placeholder="BIENVENUE10" required />
            <small style={aide}>Lettres, chiffres, tiret ou souligné. La casse n'a pas d'importance : le code est enregistré en majuscules.</small>
          </div>

          <div className="form-group">
            <label htmlFor="promo-desc">Description</label>
            <input id="promo-desc" type="text" value={form.description} onChange={set('description')}
                   style={champ} placeholder="À quoi sert ce code, et pour quelle campagne" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="promo-type">Type de réduction *</label>
              <select id="promo-type" value={form.discount_type} onChange={set('discount_type')} style={champ}>
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (FCFA)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="promo-value">
                {form.discount_type === 'percentage' ? 'Pourcentage *' : 'Montant *'}
              </label>
              <input id="promo-value" type="number" min="1" step={form.discount_type === 'percentage' ? '1' : '100'}
                     max={form.discount_type === 'percentage' ? '100' : undefined}
                     value={form.discount_value} onChange={set('discount_value')} style={champ} required />
            </div>
          </div>

          {form.discount_type === 'percentage' && (
            <div className="form-group">
              <label htmlFor="promo-max">Réduction maximale</label>
              <input id="promo-max" type="number" min="1" step="100" value={form.max_discount_amount}
                     onChange={set('max_discount_amount')} style={champ} placeholder="Aucun plafond" />
              <small style={aide}>
                Sans plafond, une remise en pourcentage sur un gros panier peut coûter bien plus que prévu.
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="promo-min">Montant minimum d'achat</label>
            <input id="promo-min" type="number" min="0" step="500" value={form.min_purchase_amount}
                   onChange={set('min_purchase_amount')} style={champ} placeholder="0" />
            <small style={aide}>Calculé sur les produits, hors frais de livraison.</small>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="promo-start">Début de validité</label>
              <input id="promo-start" type="datetime-local" value={form.starts_at} onChange={set('starts_at')} style={champ} />
              <small style={aide}>Vide = immédiat</small>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="promo-end">Expiration</label>
              <input id="promo-end" type="datetime-local" value={form.expires_at} onChange={set('expires_at')} style={champ} />
              <small style={aide}>Vide = sans fin</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="promo-uses">Utilisations totales</label>
              <input id="promo-uses" type="number" min="1" value={form.max_uses} onChange={set('max_uses')}
                     style={champ} placeholder="Illimité" />
              <small style={aide}>Tous clients confondus</small>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="promo-uses-user">Utilisations par client</label>
              <input id="promo-uses-user" type="number" min="1" value={form.max_uses_per_user}
                     onChange={set('max_uses_per_user')} style={champ} placeholder="Illimité" />
              <small style={aide}>1 = une seule fois par personne</small>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={set('is_active')} style={{ width: 16, height: 16 }} />
              Code actif
            </label>
            <small style={aide}>Décocher suspend le code sans le supprimer.</small>
          </div>

          {error && <p className="error-message-form" style={{ color: 'red', marginBottom: 10 }}>{error}</p>}

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting} className="save-btn">
              {isSubmitting ? 'Enregistrement…' : (codeToEdit ? 'Mettre à jour' : 'Créer le code')}
            </button>
            <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

function PromoCodesPage() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const adminToken = localStorage.getItem('adminToken');

  const fetchCodes = useCallback(async () => {
    if (!adminToken) { navigate('/login'); return; }
    setIsLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API_BASE_URL}/promo`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setCodes(data.codes || []);
    } catch (err) {
      console.error('Erreur chargement codes promo:', err);
      setError(err.response?.data?.message || 'Impossible de charger les codes promo.');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, navigate]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleSave = () => {
    setIsModalOpen(false);
    setSelected(null);
    fetchCodes();
  };

  const handleDelete = async (c) => {
    const message = c.utilisations > 0
      ? `Le code « ${c.code} » a déjà été utilisé ${c.utilisations} fois. Il sera désactivé plutôt que supprimé, afin de préserver l'historique des commandes. Continuer ?`
      : `Supprimer définitivement le code « ${c.code} » ?`;
    if (!window.confirm(message)) return;

    try {
      const { data } = await axios.delete(`${API_BASE_URL}/promo/${c.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setInfo(data.message);
      fetchCodes();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <h1>Codes Promo</h1>
        <button onClick={() => { setSelected(null); setIsModalOpen(true); }} className="add-btn">
          + Ajouter un Code
        </button>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      <p style={{ color: '#6c757d', fontSize: '0.9em', margin: '10px 0 18px' }}>
        La réduction s'applique aux produits, hors frais de livraison. Un seul code par commande.
      </p>

      {error && <p className="error-message">{error}</p>}
      {info && (
        <p style={{ background: '#e8f0fe', color: '#1a56b0', padding: '10px 14px',
                    borderRadius: 6, fontSize: '0.9em' }}>
          {info}
        </p>
      )}
      {isLoading && <p className="loading-indicator">Chargement…</p>}

      {!isLoading && codes.length === 0 ? (
        <p style={{ color: '#6c757d' }}>
          Aucun code promo pour l'instant. Créez-en un avec le bouton ci-dessus.
        </p>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Réduction</th>
                <th>Minimum</th>
                <th>Validité</th>
                <th>Utilisations</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>{c.code}</span>
                    {c.description && (
                      <div style={{ color: '#6c757d', fontSize: '0.82em', marginTop: 3, maxWidth: 260 }}>
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formaterReduction(c)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {Number(c.min_purchase_amount) > 0 ? formaterMontant(c.min_purchase_amount) : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.88em' }}>
                    {formaterDate(c.starts_at)} → {formaterDate(c.expires_at)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {c.utilisations}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    {c.max_uses_per_user && (
                      <div style={{ color: '#6c757d', fontSize: '0.8em' }}>
                        {c.max_uses_per_user === 1
                          ? '1 fois par client'
                          : `${c.max_uses_per_user} fois par client`}
                      </div>
                    )}
                  </td>
                  <td><Badge statut={c.statut} /></td>
                  <td className="actions-cell">
                    <button onClick={() => { setSelected(c); setIsModalOpen(true); }}
                            className="action-btn edit-btn" title="Modifier">✎</button>
                    <button onClick={() => handleDelete(c)}
                            className="action-btn delete-btn" title="Supprimer">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PromoFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelected(null); }}
        onSave={handleSave}
        codeToEdit={selected}
        adminToken={adminToken}
      />
    </div>
  );
}

export default PromoCodesPage;
