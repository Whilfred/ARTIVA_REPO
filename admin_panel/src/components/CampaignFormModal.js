import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ProductFormModal.css';

const INITIAL_FORM = {
  subject: '',
  body: '',
  targetType: 'all',
  neverOrdered: false,
  inactiveDays: '',
  abandonedCartHours: '',
  manualUserIds: [],
  userSearch: '',
  scheduleEnabled: false,
  scheduledAt: '',
};

function CampaignFormModal({
  isOpen,
  onClose,
  onSaved,
  apiBaseUrl,
  adminToken,
}) {
  const [subject, setSubject] = useState(INITIAL_FORM.subject);
  const [body, setBody] = useState(INITIAL_FORM.body);

  const [targetType, setTargetType] = useState(
    INITIAL_FORM.targetType
  );

  const [neverOrdered, setNeverOrdered] = useState(
    INITIAL_FORM.neverOrdered
  );

  const [inactiveDays, setInactiveDays] = useState(
    INITIAL_FORM.inactiveDays
  );

  const [abandonedCartHours, setAbandonedCartHours] = useState(
    INITIAL_FORM.abandonedCartHours
  );

  const [allUsers, setAllUsers] = useState([]);
  const [manualUserIds, setManualUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const [preview, setPreview] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // ============================================================
  // RESET
  // ============================================================

  const resetForm = useCallback(() => {
    setSubject('');
    setBody('');

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
  }, []);

  // ============================================================
  // CHARGEMENT DES UTILISATEURS
  // ============================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    axios
      .get(`${apiBaseUrl}/users`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      .then((res) => {
        setAllUsers(res.data || []);
      })
      .catch((err) => {
        console.error(
          'Erreur chargement utilisateurs pour campagne:',
          err
        );
      });
  }, [isOpen, apiBaseUrl, adminToken]);

  // ============================================================
  // RESET UNIQUEMENT À L'OUVERTURE
  // ============================================================

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // ============================================================
  // DESTINATAIRES
  // ============================================================

  const buildTargetPayload = useCallback(() => {
    const target_filter = {};

    if (neverOrdered) {
      target_filter.never_ordered = true;
    }

    if (inactiveDays) {
      target_filter.inactive_days = parseInt(
        inactiveDays,
        10
      );
    }

    if (abandonedCartHours) {
      target_filter.abandoned_cart_hours = parseInt(
        abandonedCartHours,
        10
      );
    }

    return {
      target_type: targetType,

      target_filter:
        targetType === 'filter'
          ? target_filter
          : undefined,

      manual_user_ids:
        targetType === 'manual' ||
        targetType === 'filter'
          ? manualUserIds
          : undefined,
    };
  }, [
    targetType,
    neverOrdered,
    inactiveDays,
    abandonedCartHours,
    manualUserIds,
  ]);

  // ============================================================
  // APERÇU
  // ============================================================

  const handlePreview = async () => {
    setIsPreviewing(true);
    setError('');

    try {
      const res = await axios.post(
        `${apiBaseUrl}/campaigns/preview`,
        buildTargetPayload(),
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      setPreview(res.data);
    } catch (err) {
      console.error(
        'Erreur aperçu destinataires:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Impossible de calculer les destinataires.'
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  // ============================================================
  // TRANSFORMATION TEXTE -> HTML
  // ============================================================

  const convertTextToHtml = (text) => {
    if (!text) {
      return '';
    }

    const escapeHtml = (value) => {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    return text
      .split(/\n\s*\n/)
      .map((paragraph) => {
        const html = escapeHtml(paragraph)
          .replace(/\n/g, '<br />');

        return `<p>${html}</p>`;
      })
      .join('');
  };

  // ============================================================
  // ENVOI
  // ============================================================

  const handleSubmit = async (mode) => {
    const plainText = body.trim();

    if (!subject.trim() || !plainText) {
      setError('Le sujet et le contenu sont requis.');
      return;
    }

    if (mode === 'schedule' && !scheduledAt) {
      setError(
        "Choisissez une date/heure de programmation."
      );
      return;
    }

    if (
      targetType === 'manual' &&
      manualUserIds.length === 0
    ) {
      setError(
        'Sélectionnez au moins un utilisateur.'
      );
      return;
    }

    if (
      mode !== 'draft' &&
      !window.confirm(
        mode === 'now'
          ? `Envoyer cette campagne maintenant à ${
              preview?.count ?? '?'
            } destinataire(s) ?`
          : `Programmer cet envoi pour le ${new Date(
              scheduledAt
            ).toLocaleString('fr-FR')} ?`
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const payload = {
        subject: subject.trim(),

        body_html: convertTextToHtml(body),

        ...buildTargetPayload(),

        scheduled_at:
          mode === 'schedule'
            ? new Date(
                scheduledAt
              ).toISOString()
            : undefined,

        send_now: mode === 'now',
      };

      await axios.post(
        `${apiBaseUrl}/campaigns`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      onSaved();
      onClose();
    } catch (err) {
      console.error(
        'Erreur création campagne:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Erreur lors de la création de la campagne.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // RECHERCHE UTILISATEURS
  // ============================================================

  const filteredUsers = allUsers.filter((u) => {
    if (!userSearch.trim()) {
      return true;
    }

    const search = userSearch.toLowerCase();

    return (
      u.name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  });

  // ============================================================
  // SÉLECTION UTILISATEUR
  // ============================================================

  const toggleManualUser = (id) => {
    setManualUserIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }

      return [...prev, id];
    });
  };

  // ============================================================
  // MODAL FERMÉ
  // ============================================================

  if (!isOpen) {
    return null;
  }

  // ============================================================
  // INTERFACE
  // ============================================================

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 750 }}
      >
        <h2>Nouvelle campagne email</h2>

        {/* ================================================== */}
        {/* SUJET */}
        {/* ================================================== */}

        <div className="form-group">
          <label htmlFor="campaign-subject">
            Sujet :
          </label>

          <input
            type="text"
            id="campaign-subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setError('');
            }}
            placeholder="Ex: {nom}, une offre rien que pour vous 🎁"
          />

          <small style={{ color: '#666' }}>
            {'{nom}'} sera remplacé par le nom de
            chaque destinataire.
          </small>
        </div>

        {/* ================================================== */}
        {/* CONTENU */}
        {/* ================================================== */}

        <div className="form-group">
          <label htmlFor="campaign-body">
            Contenu :
          </label>

          <textarea
            id="campaign-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setError('');
            }}
            placeholder={`Écrivez votre message ici...

Exemple :

Bonjour {nom},

Nous avons une nouvelle offre pour vous.

Profitez-en dès maintenant !`}
            rows={12}
            style={{
              width: '100%',
              minHeight: 260,
              padding: 12,
              resize: 'vertical',
              border: '1px solid #ccc',
              borderRadius: 6,
              fontFamily: 'Arial, sans-serif',
              fontSize: 15,
              lineHeight: 1.6,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          <small
            style={{
              display: 'block',
              marginTop: 5,
              color: '#666',
            }}
          >
            Vous pouvez utiliser plusieurs paragraphes.
            Les retours à la ligne seront conservés dans
            l'email.
          </small>
        </div>

        {/* ================================================== */}
        {/* DESTINATAIRES */}
        {/* ================================================== */}

        <div className="form-group">
          <label>Destinataires :</label>

          <div
            style={{
              display: 'flex',
              gap: 15,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                value: 'all',
                label:
                  'Tous les utilisateurs actifs',
              },
              {
                value: 'manual',
                label: 'Sélection manuelle',
              },
              {
                value: 'filter',
                label: 'Filtres automatiques',
              },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 'normal',
                }}
              >
                <input
                  type="radio"
                  name="targetType"
                  checked={
                    targetType === opt.value
                  }
                  onChange={() => {
                    setTargetType(opt.value);
                    setPreview(null);
                    setError('');
                  }}
                />

                {opt.label}
              </label>
            ))}
          </div>

          {/* ================================================= */}
          {/* FILTRES */}
          {/* ================================================= */}

          {targetType === 'filter' && (
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 4,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  checked={neverOrdered}
                  onChange={(e) => {
                    setNeverOrdered(
                      e.target.checked
                    );
                    setPreview(null);
                  }}
                  id="filter-never-ordered"
                />

                <label htmlFor="filter-never-ordered">
                  N'a jamais commandé
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <label
                  style={{ marginBottom: 0 }}
                >
                  Inactif depuis (jours, aucune
                  commande) :
                </label>

                <input
                  type="number"
                  min="1"
                  style={{ width: 80 }}
                  value={inactiveDays}
                  onChange={(e) => {
                    setInactiveDays(
                      e.target.value
                    );
                    setPreview(null);
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <label
                  style={{ marginBottom: 0 }}
                >
                  Panier abandonné depuis (heures) :
                </label>

                <input
                  type="number"
                  min="1"
                  style={{ width: 80 }}
                  value={abandonedCartHours}
                  onChange={(e) => {
                    setAbandonedCartHours(
                      e.target.value
                    );
                    setPreview(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* UTILISATEURS MANUELS */}
          {/* ================================================= */}

          {(targetType === 'manual' ||
            targetType === 'filter') && (
            <div>
              <p
                style={{
                  margin: '5px 0',
                  fontSize: '0.85em',
                  color: '#666',
                }}
              >
                {targetType === 'filter'
                  ? 'Ajouter des utilisateurs en plus du filtre (optionnel) :'
                  : 'Choisir les destinataires :'}
              </p>

              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={userSearch}
                onChange={(e) =>
                  setUserSearch(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  padding: 8,
                  marginBottom: 8,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                }}
              />

              <div
                className="checkbox-group"
                style={{
                  maxHeight: 150,
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  padding: 8,
                }}
              >
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="checkbox-item"
                  >
                    <input
                      type="checkbox"
                      checked={manualUserIds.includes(
                        u.id
                      )}
                      onChange={() => {
                        toggleManualUser(u.id);
                        setPreview(null);
                      }}
                      id={`manual-user-${u.id}`}
                    />

                    <label
                      htmlFor={`manual-user-${u.id}`}
                    >
                      {u.name} — {u.email}
                    </label>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85em',
                    }}
                  >
                    Aucun utilisateur trouvé.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* APERÇU */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="action-btn"
            style={{ marginTop: 10 }}
          >
            {isPreviewing
              ? 'Calcul...'
              : '🔍 Aperçu du nombre de destinataires'}
          </button>

          {preview && (
            <p style={{ marginTop: 8 }}>
              <b>{preview.count}</b>{' '}
              destinataire
              {preview.count > 1 ? 's' : ''}

              {preview.sample?.length > 0 && (
                <span
                  style={{ color: '#666' }}
                >
                  {' '}
                  (ex :{' '}
                  {preview.sample
                    .slice(0, 3)
                    .map((u) => u.name)
                    .join(', ')}

                  {preview.count > 3
                    ? '...'
                    : ''}
                  )
                </span>
              )}
            </p>
          )}
        </div>

        {/* ================================================== */}
        {/* PROGRAMMATION */}
        {/* ================================================== */}

        <div className="form-group checkbox-item">
          <input
            type="checkbox"
            id="schedule-enabled"
            checked={scheduleEnabled}
            onChange={(e) => {
              setScheduleEnabled(
                e.target.checked
              );
              setError('');
            }}
          />

          <label htmlFor="schedule-enabled">
            Programmer l'envoi à une date/heure précise
          </label>
        </div>

        {scheduleEnabled && (
          <div className="form-group">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => {
                setScheduledAt(
                  e.target.value
                );
                setError('');
              }}
            />
          </div>
        )}

        {/* ================================================== */}
        {/* ERREUR */}
        {/* ================================================== */}

        {error && (
          <p className="error-message-form">
            {error}
          </p>
        )}

        {/* ================================================== */}
        {/* BOUTONS */}
        {/* ================================================== */}

        <div
          className="form-actions"
          style={{ flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={() =>
              handleSubmit('draft')
            }
            disabled={isSaving}
            className="cancel-btn"
          >
            Enregistrer en brouillon
          </button>

          {scheduleEnabled ? (
            <button
              type="button"
              onClick={() =>
                handleSubmit('schedule')
              }
              disabled={isSaving}
              className="save-btn"
            >
              {isSaving
                ? 'Enregistrement...'
                : 'Programmer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                handleSubmit('now')
              }
              disabled={isSaving}
              className="save-btn"
            >
              {isSaving
                ? 'Envoi...'
                : 'Envoyer maintenant'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="cancel-btn"
            disabled={isSaving}
          >WARNING in ./node_modules/html5-qrcode/esm/utils.js
Module Warning (from ./node_modules/source-map-loader/dist/cjs.js):
Failed to parse source map from 'C:\Users\KMBOMI\ARTIVA_REPO\admin_panel\node_modules\src\utils.ts' file: Error: ENOENT: no such file or directory, open 'C:\Users\KMBOMI\ARTIVA_REPO\admin_panel\node_modules\src\utils.ts'

WARNING in ./node_modules/html5-qrcode/esm/zxing-html5-qrcode-decoder.js
Module Warning (from ./node_modules/source-map-loader/dist/cjs.js):
Failed to parse source map from 'C:\Users\KMBOMI\ARTIVA_REPO\admin_panel\node_modules\src\zxing-html5-qrcode-decoder.ts' file: Error: ENOENT: no such file or directory, open 'C:\Users\KMBOMI\ARTIVA_REPO\admin_panel\node_modules\src\zxing-html5-qrcode-decoder.ts'

WARNING in [eslint] 
src\components\CampaignFormModal.js
  Line 18:10:  'CampaignFormModal' is defined but never used  no-unused-vars

ERROR in ./src/pages/CampaignsPage.js 315:50-67
export 'default' (imported as 'CampaignFormModal') was not found in '../components/CampaignFormModal' (module has no exports)

webpack compiled with 1 error and 24 warnings
Compiling...
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignFormModal;