// admin_panel/src/components/CampaignFormModal.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'react-quill-new/dist/quill.snow.css';
import './ProductFormModal.css';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

function CampaignFormModal({ isOpen, onClose, onSaved, apiBaseUrl, adminToken }) {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [targetType, setTargetType] = useState('all'); // 'all' | 'manual' | 'filter'

  const [neverOrdered, setNeverOrdered] = useState(false);
  const [inactiveDays, setInactiveDays] = useState('');
  const [abandonedCartHours, setAbandonedCartHours] = useState('');

  const [allUsers, setAllUsers] = useState([]);
  const [manualUserIds, setManualUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const [preview, setPreview] = useState(null); // { count, sample }
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setSubject('');
    setBodyHtml('');
    setTargetType('all');
    setNeverOrdered(false);
    setInactiveDays('');
    setAbandonedCartHours('');
    setManualUserIds([]);
    setUserSearch('');
    setScheduleEnabled(false);
    setScheduledAt('');
    setPreview(null);
    setError('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    // Charger la liste des utilisateurs pour la sélection manuelle.
    axios
      .get(`${apiBaseUrl}/users`, { headers: { Authorization: `Bearer ${adminToken}` } })
      .then((res) => setAllUsers(res.data || []))
      .catch((err) => console.error('Erreur chargement utilisateurs pour campagne:', err));
  }, [isOpen, apiBaseUrl, adminToken]);

  const buildTargetPayload = useCallback(() => {
    const target_filter = {};
    if (neverOrdered) target_filter.never_ordered = true;
    if (inactiveDays) target_filter.inactive_days = parseInt(inactiveDays, 10);
    if (abandonedCartHours) target_filter.abandoned_cart_hours = parseInt(abandonedCartHours, 10);

    return {
      target_type: targetType,
      target_filter: targetType === 'filter' ? target_filter : undefined,
      manual_user_ids: (targetType === 'manual' || targetType === 'filter') ? manualUserIds : undefined,
    };
  }, [targetType, neverOrdered, inactiveDays, abandonedCartHours, manualUserIds]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/campaigns/preview`, buildTargetPayload(), {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setPreview(res.data);
    } catch (err) {
      console.error('Erreur aperçu destinataires:', err);
      setError(err.response?.data?.message || "Impossible de calculer les destinataires.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async (mode) => {
    // mode: 'draft' | 'schedule' | 'now'
    if (!subject.trim() || !bodyHtml.trim() || bodyHtml === '<p><br></p>') {
      setError('Le sujet et le contenu sont requis.');
      return;
    }
    if (mode === 'schedule' && !scheduledAt) {
      setError('Choisissez une date/heure de programmation.');
      return;
    }
    if ((targetType === 'manual') && manualUserIds.length === 0) {
      setError('Sélectionnez au moins un utilisateur.');
      return;
    }
    if (mode !== 'draft' && !window.confirm(
      mode === 'now'
        ? `Envoyer cette campagne maintenant à ${preview?.count ?? '?'} destinataire(s) ?`
        : `Programmer cet envoi pour le ${new Date(scheduledAt).toLocaleString('fr-FR')} ?`
    )) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        subject,
        body_html: bodyHtml,
        ...buildTargetPayload(),
        scheduled_at: mode === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
        send_now: mode === 'now',
      };
      await axios.post(`${apiBaseUrl}/campaigns`, payload, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Erreur création campagne:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création de la campagne.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = allUsers.filter((u) =>
    !userSearch.trim() ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleManualUser = (id) => {
    setManualUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <h2>Nouvelle campagne email</h2>

        <div className="form-group">
          <label htmlFor="campaign-subject">Sujet :</label>
          <input
            type="text"
            id="campaign-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: {nom}, une offre rien que pour vous 🎁"
          />
          <small style={{ color: '#666' }}>{'{nom}'} sera remplacé par le nom de chaque destinataire.</small>
        </div>

        <div className="form-group">
          <label>Contenu :</label>
          {isOpen && (
            <ReactQuill 
              theme="snow" 
              value={bodyHtml} 
              onChange={setBodyHtml} 
              modules={QUILL_MODULES} 
            />
          )}
        </div>

        <div className="form-group">
          <label>Destinataires :</label>
          <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
            {[
              { value: 'all', label: 'Tous les utilisateurs actifs' },
              { value: 'manual', label: 'Sélection manuelle' },
              { value: 'filter', label: 'Filtres automatiques' },
            ].map((opt) => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'normal' }}>
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === opt.value}
                  onChange={() => { setTargetType(opt.value); setPreview(null); }}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {targetType === 'filter' && (
            <div style={{ border: '1px solid #eee', borderRadius: 4, padding: 10, marginBottom: 10 }}>
              <div className="checkbox-item">
                <input type="checkbox" checked={neverOrdered} onChange={(e) => { setNeverOrdered(e.target.checked); setPreview(null); }} id="filter-never-ordered" />
                <label htmlFor="filter-never-ordered">N'a jamais commandé</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <label style={{ marginBottom: 0 }}>Inactif depuis (jours, aucune commande) :</label>
                <input
                  type="number" min="1" style={{ width: 80 }}
                  value={inactiveDays}
                  onChange={(e) => { setInactiveDays(e.target.value); setPreview(null); }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ marginBottom: 0 }}>Panier abandonné depuis (heures) :</label>
                <input
                  type="number" min="1" style={{ width: 80 }}
                  value={abandonedCartHours}
                  onChange={(e) => { setAbandonedCartHours(e.target.value); setPreview(null); }}
                />
              </div>
            </div>
          )}

          {(targetType === 'manual' || targetType === 'filter') && (
            <div>
              <p style={{ margin: '5px 0', fontSize: '0.85em', color: '#666' }}>
                {targetType === 'filter'
                  ? 'Ajouter des utilisateurs en plus du filtre (optionnel) :'
                  : 'Choisir les destinataires :'}
              </p>
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4 }}
              />
              <div className="checkbox-group">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={manualUserIds.includes(u.id)}
                      onChange={() => { toggleManualUser(u.id); setPreview(null); }}
                      id={`manual-user-${u.id}`}
                    />
                    <label htmlFor={`manual-user-${u.id}`}>{u.name} — {u.email}</label>
                  </div>
                ))}
                {filteredUsers.length === 0 && <p style={{ margin: 0, fontSize: '0.85em' }}>Aucun utilisateur trouvé.</p>}
              </div>
            </div>
          )}

          <button type="button" onClick={handlePreview} disabled={isPreviewing} className="action-btn" style={{ marginTop: 10 }}>
            {isPreviewing ? 'Calcul...' : "🔍 Aperçu du nombre de destinataires"}
          </button>
          {preview && (
            <p style={{ marginTop: 8 }}>
              <b>{preview.count}</b> destinataire{preview.count > 1 ? 's' : ''}
              {preview.sample.length > 0 && (
                <span style={{ color: '#666' }}> (ex : {preview.sample.slice(0, 3).map((u) => u.name).join(', ')}{preview.count > 3 ? '...' : ''})</span>
              )}
            </p>
          )}
        </div>

        <div className="form-group checkbox-item">
          <input
            type="checkbox"
            id="schedule-enabled"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
          />
          <label htmlFor="schedule-enabled">Programmer l'envoi à une date/heure précise</label>
        </div>
        {scheduleEnabled && (
          <div className="form-group">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        )}

        {error && <p className="error-message-form">{error}</p>}

        <div className="form-actions" style={{ flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleSubmit('draft')} disabled={isSaving} className="cancel-btn">
            Enregistrer en brouillon
          </button>
          {scheduleEnabled ? (
            <button type="button" onClick={() => handleSubmit('schedule')} disabled={isSaving} className="save-btn">
              Programmer
            </button>
          ) : (
            <button type="button" onClick={() => handleSubmit('now')} disabled={isSaving} className="save-btn">
              {isSaving ? 'Envoi...' : 'Envoyer maintenant'}
            </button>
          )}
          <button type="button" onClick={onClose} className="cancel-btn" disabled={isSaving}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default CampaignFormModal;
