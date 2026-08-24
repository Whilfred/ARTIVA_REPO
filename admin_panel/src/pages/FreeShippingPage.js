// admin_panel/src/pages/FreeShippingPage.js
//
// Conditions de la livraison gratuite méritée.
//
// Le seuil, la fenêtre et la durée de validité sont des décisions commerciales :
// elles se règlent ici, sans nouvelle version de l'application mobile.

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import './ProductManagementPage.css'; // structure commune aux pages d'administration
import './FreeShippingPage.css';

const formaterMontant = (v) =>
  v === null || v === undefined || v === '' ? '—' : `${Number(v).toLocaleString('fr-FR')} FCFA`;

const formaterDate = (v) =>
  !v ? '—' : new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Accord du pluriel : « 1 jour » mais « 7 jours ». Détail, mais un panneau
// d'administration qui écrit « 1 jours » perd en crédibilité.
const jours = (n) => `${n} jour${Number(n) > 1 ? 's' : ''}`;

const FreeShippingPage = () => {
  const [reglages, setReglages] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [avantages, setAvantages] = useState([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState(null); // { texte, ok }

  const adminToken = localStorage.getItem('adminToken');
  const entetes = { headers: { Authorization: `Bearer ${adminToken}` } };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      // Les deux appels sont indépendants : les lancer ensemble évite d'attendre
      // deux allers-retours réseau à la suite.
      const [reponseReglages, reponseAvantages] = await Promise.all([
        axios.get(`${API_BASE_URL}/livraison/reglages`, entetes),
        axios.get(`${API_BASE_URL}/livraison/avantages`, entetes),
      ]);
      setReglages(reponseReglages.data.reglages);
      setStatistiques(reponseReglages.data.statistiques);
      setAvantages(reponseAvantages.data);
      setMessage(null);
    } catch (erreur) {
      setMessage({
        texte: erreur.response?.data?.message || 'Impossible de charger les conditions.',
        ok: false,
      });
    } finally {
      setChargement(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  useEffect(() => { charger(); }, [charger]);

  const modifier = (champ, valeur) => {
    setReglages((actuel) => ({ ...actuel, [champ]: valeur }));
    setMessage(null);
  };

  const enregistrer = async () => {
    // Validation avant l'envoi : la base refuserait la valeur, mais avec un
    // message Postgres incompréhensible pour l'administrateur.
    const seuil = Number(reglages.threshold_amount);
    const fenetre = Number(reglages.window_days);
    const validite = Number(reglages.validity_days);

    if (!Number.isFinite(seuil) || seuil <= 0) {
      return setMessage({ texte: 'Le seuil doit être supérieur à 0.', ok: false });
    }
    if (!Number.isInteger(fenetre) || fenetre < 1 || fenetre > 365) {
      return setMessage({ texte: 'La fenêtre doit être un nombre entier de 1 à 365 jours.', ok: false });
    }
    if (!Number.isInteger(validite) || validite < 1 || validite > 365) {
      return setMessage({ texte: 'La validité doit être un nombre entier de 1 à 365 jours.', ok: false });
    }

    setEnregistrement(true);
    try {
      const { data } = await axios.put(
        `${API_BASE_URL}/livraison/reglages`,
        {
          is_active: reglages.is_active,
          threshold_amount: seuil,
          window_days: fenetre,
          validity_days: validite,
        },
        entetes
      );
      setReglages(data.reglages);
      setMessage({ texte: data.message, ok: true });
    } catch (erreur) {
      setMessage({
        texte: erreur.response?.data?.message || "Erreur lors de l'enregistrement.",
        ok: false,
      });
    } finally {
      setEnregistrement(false);
    }
  };

  if (chargement) {
    return (
      <div className="management-page">
        <div className="page-header"><h2>Livraison gratuite</h2></div>
        <p>Chargement…</p>
      </div>
    );
  }

  if (!reglages) {
    return (
      <div className="management-page">
        <div className="page-header"><h2>Livraison gratuite</h2></div>
        <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>
        <p className="error-message">{message?.texte || 'Conditions indisponibles.'}</p>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h2>Livraison gratuite</h2>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {/* Synthèse : un formulaire seul ne dit pas combien d'avantages sont en
          circulation, or c'est ce qui donne du poids à un changement de seuil. */}
      {statistiques && (
        <div className="fs-stats">
          <div className="fs-stat disponibles">
            <div className="fs-stat-valeur">{statistiques.disponibles}</div>
            <div className="fs-stat-libelle">Avantages en cours</div>
          </div>
          <div className="fs-stat">
            <div className="fs-stat-valeur">{statistiques.consommes}</div>
            <div className="fs-stat-libelle">Déjà utilisés</div>
          </div>
          <div className="fs-stat">
            <div className="fs-stat-valeur">{statistiques.expires}</div>
            <div className="fs-stat-libelle">Expirés sans usage</div>
          </div>
          <div className="fs-stat offert">
            <div className="fs-stat-valeur">
              {Number(statistiques.total_offert).toLocaleString('fr-FR')}
            </div>
            <div className="fs-stat-libelle">FCFA de livraison offerts</div>
          </div>
        </div>
      )}

      <div className="fs-carte">
        <h3>Conditions d'obtention</h3>
        <p className="fs-carte-aide">
          Ces règles s'appliquent aux avantages gagnés à partir de maintenant.
        </p>

        <label className="fs-interrupteur">
          <input
            type="checkbox"
            checked={reglages.is_active}
            onChange={(e) => modifier('is_active', e.target.checked)}
          />
          <span>
            <span className="fs-interrupteur-titre">Programme actif</span>
            <span className="fs-interrupteur-aide" style={{ display: 'block' }}>
              Décoché, plus aucun nouvel avantage n'est accordé. Les avantages déjà
              gagnés restent honorés jusqu'à leur expiration : on ne reprend pas un
              droit déjà promis à un client.
            </span>
          </span>
        </label>

        <div className="fs-champs">
          <div className="fs-champ">
            <label htmlFor="seuil">Seuil à atteindre (FCFA)</label>
            <input
              id="seuil"
              type="number"
              min="1"
              step="500"
              value={reglages.threshold_amount}
              onChange={(e) => modifier('threshold_amount', e.target.value)}
            />
            <div className="fs-champ-aide">
              Cumul des produits, après remise promo. Frais de livraison exclus.
            </div>
          </div>

          <div className="fs-champ">
            <label htmlFor="fenetre">Fenêtre de cumul (jours)</label>
            <input
              id="fenetre"
              type="number"
              min="1"
              max="365"
              value={reglages.window_days}
              onChange={(e) => modifier('window_days', e.target.value)}
            />
            <div className="fs-champ-aide">
              Glissante : on regarde toujours les N derniers jours, sans remise à
              zéro à date fixe.
            </div>
          </div>

          <div className="fs-champ">
            <label htmlFor="validite">Validité de l'avantage (jours)</label>
            <input
              id="validite"
              type="number"
              min="1"
              max="365"
              value={reglages.validity_days}
              onChange={(e) => modifier('validity_days', e.target.value)}
            />
            <div className="fs-champ-aide">
              Délai laissé au client pour en profiter, à compter du jour où il le gagne.
            </div>
          </div>
        </div>

        <div className={`fs-resume${reglages.is_active ? '' : ' inactif'}`}>
          {reglages.is_active ? (
            <>
              Un client dont les achats atteignent{' '}
              <b>{formaterMontant(reglages.threshold_amount)}</b> sur{' '}
              <b>{jours(reglages.window_days)}</b> glissants obtient la{' '}
              <b>livraison gratuite</b> sur sa commande suivante, à utiliser dans les{' '}
              <b>{jours(reglages.validity_days)}</b>. Son compteur repart ensuite de zéro.
            </>
          ) : (
            <>Programme désactivé : aucun nouvel avantage ne sera accordé.</>
          )}
        </div>

        <div className="fs-actions">
          <button className="fs-enregistrer" onClick={enregistrer} disabled={enregistrement}>
            {enregistrement ? 'Enregistrement…' : 'Enregistrer les conditions'}
          </button>
          {message && (
            <span className={`fs-message ${message.ok ? 'ok' : 'ko'}`}>{message.texte}</span>
          )}
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Avantages accordés</h3>

      {avantages.length === 0 ? (
        <div className="fs-carte">
          <p className="fs-vide">
            Aucun avantage accordé pour l'instant. La liste se remplira dès qu'un
            client atteindra le seuil.
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Gagné le</th>
                <th>Cumul</th>
                <th>Statut</th>
                <th>Expire le</th>
                <th>Commande d'origine</th>
                <th>Utilisé sur</th>
                <th>Livraison offerte</th>
              </tr>
            </thead>
            <tbody>
              {avantages.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.name || '—'}
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{a.email}</div>
                  </td>
                  <td>{formaterDate(a.earned_at)}</td>
                  <td>{formaterMontant(a.qualifying_amount)}</td>
                  <td>
                    <span
                      className={`fs-pastille ${
                        a.statut === 'consommé'
                          ? 'consomme'
                          : a.statut === 'expiré'
                          ? 'expire'
                          : 'disponible'
                      }`}
                    >
                      {a.statut}
                    </span>
                  </td>
                  <td>{formaterDate(a.expires_at)}</td>
                  <td>{a.commande_declencheuse || '—'}</td>
                  <td>{a.commande_utilisation || '—'}</td>
                  <td>{a.shipping_saved ? formaterMontant(a.shipping_saved) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FreeShippingPage;
