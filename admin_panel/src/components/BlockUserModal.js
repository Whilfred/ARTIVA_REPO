// admin_panel/src/components/BlockUserModal.js
import React, { useState, useEffect } from 'react';

function BlockUserModal({ isOpen, onClose, onConfirm, user, isLoading }) {
  const [reason, setReason] = useState('');
  const MAX_LENGTH = 500;

  // Reset à chaque ouverture
  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const displayName = user.name || user.email || `Utilisateur #${user.id}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>🚫 Bloquer {displayName}</h2>
        <p className="modal-subtitle">
          L'utilisateur ne pourra plus se connecter. Indique la raison du blocage
          (visible uniquement par les admins).
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            className="modal-textarea"
            placeholder="Ex : Comportement frauduleux, spamming, violation des CGV..."
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_LENGTH))}
            rows={4}
            autoFocus
            required
          />
          <div className="char-counter">
            {reason.length} / {MAX_LENGTH}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="action-btn"
              onClick={onClose}
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="action-btn delete-btn"
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? 'Blocage…' : 'Confirmer le blocage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlockUserModal;
