import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

const FONT_SIZES = [
  { label: 'Petit', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Moyen', value: '4' },
  { label: 'Grand', value: '5' },
  { label: 'Très grand', value: '6' },
];

const LINE_HEIGHTS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
];

function CampaignFormModal({
  isOpen,
  onClose,
  onSaved,
  apiBaseUrl,
  adminToken,
}) {
  const [subject, setSubject] = useState(INITIAL_FORM.subject);

  // Le contenu HTML du corps de l'email (généré par l'éditeur riche)
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
  // ÉDITEUR RICHE (style Word) — style global du document email
  // ============================================================

  const editorRef = useRef(null);

  const [docFontFamily, setDocFontFamily] = useState(
    FONT_FAMILIES[0].value
  );
  const [docLineHeight, setDocLineHeight] = useState(
    LINE_HEIGHTS[1].value
  );
  const [docTextAlign, setDocTextAlign] = useState('left');

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

    setDocFontFamily(FONT_FAMILIES[0].value);
    setDocLineHeight(LINE_HEIGHTS[1].value);
    setDocTextAlign('left');

    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
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
  // OUTILS DE MISE EN FORME (comme Word) SUR LA SÉLECTION
  // ============================================================

  const focusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const applyCommand = (command, value = null) => {
    focusEditor();
    document.execCommand(command, false, value);
    syncBodyFromEditor();
  };

  const syncBodyFromEditor = () => {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const handleBold = () => applyCommand('bold');
  const handleItalic = () => applyCommand('italic');
  const handleUnderline = () => applyCommand('underline');

  const handleFontSizeChange = (e) => {
    applyCommand('fontSize', e.target.value);
  };

  const handleTextColorChange = (e) => {
    applyCommand('foreColor', e.target.value);
  };

  const handleAlign = (align) => {
    const map = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
    };
    applyCommand(map[align]);
  };

  const handleInsertLink = () => {
    const url = window.prompt('URL du lien :', 'https://');
    if (url) {
      applyCommand('createLink', url);
    }
  };

  // ============================================================
  // INSERTION D'IMAGE PAR URL
  // ============================================================

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageWidthInput, setImageWidthInput] = useState('');
  const [showImageTool, setShowImageTool] = useState(false);

  const handleInsertImage = () => {
    const trimmedUrl = imageUrlInput.trim();

    if (!trimmedUrl) {
      setError("Merci d'indiquer une URL d'image valide.");
      return;
    }

    focusEditor();

    // On insère directement une balise <img> pour pouvoir
    // contrôler la largeur (et donc la "distance"/mise en page).
    const widthAttr = imageWidthInput
      ? ` width="${parseInt(imageWidthInput, 10)}"`
      : '';

    const imgHtml = `<img src="${trimmedUrl}"${widthAttr} style="max-width:100%; display:block; margin: 10px auto;" alt="" />`;

    document.execCommand('insertHTML', false, imgHtml);

    syncBodyFromEditor();

    setImageUrlInput('');
    setImageWidthInput('');
    setShowImageTool(false);
    setError('');
  };

  // ============================================================
  // ESPACEMENT / STYLE GLOBAL DU DOCUMENT
  // ============================================================

  const handleDocFontFamilyChange = (e) => {
    setDocFontFamily(e.target.value);
  };

  const handleDocLineHeightChange = (e) => {
    setDocLineHeight(e.target.value);
  };

  // ============================================================
  // ENVOI
  // ============================================================

  const buildFinalBodyHtml = () => {
    // On enveloppe le contenu de l'éditeur dans un conteneur
    // qui porte les réglages de style globaux (police,
    // interlignage, alignement) — comme la mise en page d'un
    // document Word.
    return `<div style="font-family:${docFontFamily}; line-height:${docLineHeight}; text-align:${docTextAlign};">${body}</div>`;
  };

  const handleSubmit = async (mode) => {
    const plainText = editorRef.current
      ? editorRef.current.innerText.trim()
      : '';

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

        body_html: buildFinalBodyHtml(),

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

  const toolbarBtnStyle = {
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 13,
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 800 }}
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
        {/* CONTENU — ÉDITEUR RICHE TYPE WORD */}
        {/* ================================================== */}

        <div className="form-group">
          <label>Contenu :</label>

          {/* --- Réglages globaux du document (style Word) --- */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 6,
              padding: 8,
              background: '#f7f7f7',
              border: '1px solid #eee',
              borderRadius: 6,
            }}
          >
            <label style={{ fontSize: 13, marginBottom: 0 }}>
              Police du document :
              <select
                value={docFontFamily}
                onChange={handleDocFontFamilyChange}
                style={{ marginLeft: 6 }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: 13, marginBottom: 0 }}>
              Interligne (espacement) :
              <select
                value={docLineHeight}
                onChange={handleDocLineHeightChange}
                style={{ marginLeft: 6 }}
              >
                {LINE_HEIGHTS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: 13, marginBottom: 0 }}>
              Alignement du texte :
              <select
                value={docTextAlign}
                onChange={(e) => setDocTextAlign(e.target.value)}
                style={{ marginLeft: 6 }}
              >
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
                <option value="justify">Justifié</option>
              </select>
            </label>
          </div>

          {/* --- Barre d'outils de mise en forme (sélection) --- */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={handleBold}>
              <b>G</b>
            </button>

            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={handleItalic}>
              <i>I</i>
            </button>

            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={handleUnderline}>
              <u>S</u>
            </button>

            <select
              defaultValue="3"
              onMouseDown={(e) => e.preventDefault()}
              onChange={handleFontSizeChange}
              style={{ ...toolbarBtnStyle, cursor: 'pointer' }}
            >
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <input
              type="color"
              title="Couleur du texte"
              onMouseDown={(e) => e.preventDefault()}
              onChange={handleTextColorChange}
              style={{ width: 32, height: 30, padding: 0, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
            />

            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={() => handleAlign('left')}>
              ⇤
            </button>

            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={() => handleAlign('center')}>
              ↔
            </button>

            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={() => handleAlign('right')}>
              ⇥
            </button>

            <button type="button" style={toolbarBtnStyle} onMouseDown={(e) => e.preventDefault()} onClick={handleInsertLink}>
              🔗 Lien
            </button>

            <button
              type="button"
              style={toolbarBtnStyle}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowImageTool((v) => !v)}
            >
              🖼️ Image (URL)
            </button>
          </div>

          {/* --- Panneau d'insertion d'image par URL --- */}
          {showImageTool && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: 8,
                border: '1px dashed #bbb',
                borderRadius: 6,
                marginBottom: 6,
              }}
            >
              <input
                type="text"
                placeholder="https://exemple.com/image.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                style={{ flex: '1 1 260px', padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
              />

              <input
                type="number"
                placeholder="Largeur px (optionnel)"
                value={imageWidthInput}
                onChange={(e) => setImageWidthInput(e.target.value)}
                style={{ width: 160, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
              />

              <button type="button" className="action-btn" onClick={handleInsertImage}>
                Insérer
              </button>
            </div>
          )}

          {/* --- Zone d'édition (contentEditable) --- */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncBodyFromEditor}
            data-placeholder="Écrivez votre message ici..."
            style={{
              width: '100%',
              minHeight: 260,
              padding: 12,
              border: '1px solid #ccc',
              borderRadius: 6,
              fontFamily: docFontFamily,
              lineHeight: docLineHeight,
              textAlign: docTextAlign,
              fontSize: 15,
              boxSizing: 'border-box',
              outline: 'none',
              overflowY: 'auto',
              background: '#fff',
            }}
          />

          <small
            style={{
              display: 'block',
              marginTop: 5,
              color: '#666',
            }}
          >
            Sélectionnez du texte pour appliquer une mise en forme (gras, italique, couleur...).
            Les images sont ajoutées par URL — elles ne sont pas hébergées ici.
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
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignFormModal;