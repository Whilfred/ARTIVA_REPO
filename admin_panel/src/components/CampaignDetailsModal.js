// admin_panel/src/components/CampaignDetailsModal.js
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const STATUT_LABELS = {
  draft:     { label: 'Brouillon',   color: '#6b7280', bg: '#f3f4f6' },
  scheduled: { label: 'Programmée',  color: '#1e40af', bg: '#dbeafe' },
  sending:   { label: 'Envoi en cours…', color: '#92400e', bg: '#fef3c7' },
  sent:      { label: 'Envoyée',     color: '#166534', bg: '#dcfce7' },
  failed:    { label: 'Échec',       color: '#991b1b', bg: '#fee2e2' },
};

const RECIPIENT_STATUS = {
  pending: { label: 'En attente', color: '#92400e', bg: '#fef3c7' },
  sent:    { label: 'Envoyé',     color: '#166534', bg: '#dcfce7' },
  failed:  { label: 'Échec',      color: '#991b1b', bg: '#fee2e2' },
};

function CampaignDetailsModal({ isOpen, onClose, campaignId, apiBaseUrl, adminToken }) {
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtres destinataires
  const [recipientFilter, setRecipientFilter] = useState('all'); // all | sent | failed | pending
  const [recipientSearch, setRecipientSearch] = useState('');

  // Onglet principal
  const [activeTab, setActiveTab] = useState('content'); // content | recipients

  useEffect(() => {
    if (!isOpen || !campaignId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await axios.get(`${apiBaseUrl}/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        setCampaign(res.data.campaign);
        setRecipients(res.data.destinataires || []);
      } catch (err) {
        console.error('Erreur chargement détails campagne:', err);
        setError(err.response?.data?.message || 'Impossible de charger les détails.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, campaignId, apiBaseUrl, adminToken]);

  // Réinitialise les filtres quand on change de campagne
  useEffect(() => {
    if (isOpen) {
      setRecipientFilter('all');
      setRecipientSearch('');
      setActiveTab('content');
    }
  }, [isOpen, campaignId]);

  // ---------- Filtrage destinataires ----------
  const filteredRecipients = useMemo(() => {
    const term = recipientSearch.trim().toLowerCase();

    return recipients.filter((r) => {
      if (recipientFilter !== 'all' && r.status !== recipientFilter) return false;
      if (!term) return true;

      const haystack = [r.email || '', r.name || ''].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [recipients, recipientFilter, recipientSearch]);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total   = recipients.length;
    const sent    = recipients.filter((r) => r.status === 'sent').length;
    const failed  = recipients.filter((r) => r.status === 'failed').length;
    const pending = recipients.filter((r) => r.status === 'pending').length;
    return { total, sent, failed, pending };
  }, [recipients]);

  if (!isOpen) return null;

  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const statut = campaign ? (STATUT_LABELS[campaign.status] || { label: campaign.status, color: '#6b7280', bg: '#f3f4f6' }) : null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 1000, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {isLoading && (
          <p style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Chargement…
          </p>
        )}

        {error && (
          <p style={{ color: '#991b1b', background: '#fee2e2', padding: 12, borderRadius: 8 }}>
            {error}
          </p>
        )}

        {campaign && !isLoading && (
          <>
            {/* ---------- Header ---------- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: '0 0 6px 0', wordBreak: 'break-word' }}>
                  📧 {campaign.subject}
                </h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', color: '#6b7280', fontSize: '0.88rem' }}>
                  {statut && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: '0.78rem', fontWeight: 600,
                      color: statut.color, backgroundColor: statut.bg,
                    }}>
                      {statut.label}
                    </span>
                  )}
                  {campaign.sent_at && <span>📅 Envoyée le {formatDateTime(campaign.sent_at)}</span>}
                  {campaign.scheduled_at && campaign.status === 'scheduled' && (
                    <span>⏰ Programmée pour {formatDateTime(campaign.scheduled_at)}</span>
                  )}
                  {campaign.created_at && <span>Créée le {formatDateTime(campaign.created_at)}</span>}
                </div>
              </div>
            </div>

            {/* ---------- Stats ---------- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10, marginBottom: 20,
            }}>
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Envoyés" value={stats.sent} color="#166534" bg="#f0fdf4" />
              <StatCard label="Échoués" value={stats.failed} color="#991b1b" bg="#fef2f2" />
              <StatCard label="En attente" value={stats.pending} color="#92400e" bg="#fffbeb" />
            </div>

            {/* ---------- Onglets ---------- */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
              <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
                📄 Contenu
              </TabButton>
              <TabButton active={activeTab === 'recipients'} onClick={() => setActiveTab('recipients')}>
                👥 Destinataires ({recipients.length})
              </TabButton>
            </div>

            {/* ---------- Onglet Contenu ---------- */}
            {activeTab === 'content' && (
              <div>
                <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Aperçu de l'email
                </h3>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#fff',
                }}>
                  <iframe
                    title="Aperçu campagne"
                    srcDoc={campaign.body_html || '<p style="padding:20px;color:#999;">(Aucun contenu)</p>'}
                    style={{
                      width: '100%',
                      minHeight: 400,
                      border: 'none',
                      display: 'block',
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>

                <div style={{ marginTop: 16, fontSize: '0.85rem', color: '#6b7280' }}>
                  <b>Ciblage :</b>{' '}
                  {campaign.target_type === 'all' && 'Tous les utilisateurs actifs'}
                  {campaign.target_type === 'manual' && `Sélection manuelle (${(campaign.manual_user_ids || []).length} utilisateur(s) pré-sélectionné(s))`}
                  {campaign.target_type === 'filter' && (
                    <>
                      Filtres automatiques
                      {campaign.target_filter && (
                        <ul style={{ margin: '4px 0 0 20px' }}>
                          {campaign.target_filter.never_ordered && <li>N'a jamais commandé</li>}
                          {campaign.target_filter.inactive_days && (
                            <li>Inactif depuis {campaign.target_filter.inactive_days} jour(s)</li>
                          )}
                          {campaign.target_filter.abandoned_cart_hours && (
                            <li>Panier abandonné depuis {campaign.target_filter.abandoned_cart_hours} heure(s)</li>
                          )}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ---------- Onglet Destinataires ---------- */}
            {activeTab === 'recipients' && (
              <div>
                {/* Recherche + filtres */}
                <div style={{
                  display: 'flex', gap: 10, flexWrap: 'wrap',
                  marginBottom: 12, alignItems: 'center',
                }}>
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="🔍 Rechercher par email ou nom…"
                    style={{
                      flex: '1 1 240px',
                      padding: '9px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { key: 'all',     label: `Tous (${stats.total})` },
                      { key: 'sent',    label: `✅ Envoyés (${stats.sent})` },
                      { key: 'failed',  label: `❌ Échoués (${stats.failed})` },
                      { key: 'pending', label: `⏳ En attente (${stats.pending})` },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setRecipientFilter(f.key)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid ' + (recipientFilter === f.key ? '#6366f1' : '#d1d5db'),
                          background: recipientFilter === f.key ? '#eef2ff' : '#fff',
                          color: recipientFilter === f.key ? '#3730a3' : '#374151',
                          fontWeight: recipientFilter === f.key ? 600 : 400,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRecipients.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontStyle: 'italic' }}>
                    {recipientSearch || recipientFilter !== 'all'
                      ? 'Aucun destinataire ne correspond à votre filtre.'
                      : 'Aucun destinataire enregistré pour cette campagne.'}
                  </p>
                ) : (
                  <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                        <tr>
                          <th style={thStyle}>Nom</th>
                          <th style={thStyle}>Email</th>
                          <th style={thStyle}>Statut</th>
                          <th style={thStyle}>Envoyé le</th>
                          <th style={thStyle}>Erreur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecipients.map((r) => {
                          const rs = RECIPIENT_STATUS[r.status] || { label: r.status, color: '#374151', bg: '#f3f4f6' };
                          return (
                            <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={tdStyle}>{r.name || '—'}</td>
                              <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                {r.email}
                              </td>
                              <td style={tdStyle}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: rs.color,
                                  backgroundColor: rs.bg,
                                }}>
                                  {rs.label}
                                </span>
                              </td>
                              <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.82rem' }}>
                                {formatDateTime(r.sent_at)}
                              </td>
                              <td style={{ ...tdStyle, color: '#991b1b', fontSize: '0.78rem', maxWidth: 200 }}>
                                {r.error ? (
                                  <span title={r.error} style={{ display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                    {r.error}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {(recipientSearch || recipientFilter !== 'all') && (
                  <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#6b7280', textAlign: 'right' }}>
                    {filteredRecipients.length} résultat(s) sur {recipients.length}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ---------- Fermer ---------- */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Petits composants ----------
function StatCard({ label, value, color = '#111827', bg = '#f9fafb' }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: bg,
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        border: 'none',
        background: 'transparent',
        borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
        color: active ? '#3730a3' : '#6b7280',
        fontWeight: active ? 600 : 500,
        fontSize: '0.9rem',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#6b7280',
  fontWeight: 600,
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle = {
  padding: '10px 14px',
  verticalAlign: 'middle',
};

export default CampaignDetailsModal;
