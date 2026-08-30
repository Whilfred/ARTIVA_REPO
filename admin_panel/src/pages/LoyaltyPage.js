// admin_panel/src/pages/LoyaltyPage.js
//
// Programme de fidélité : réglages et suivi.
//
// Le client accumule des points à chaque achat (1 point = 1 FCFA de produits).
// Au seuil, un bon nominatif lui est attribué automatiquement et son solde
// repart de zéro. La valeur du bon est le cumul converti divisé par le
// diviseur, borné entre un minimum et un maximum.

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import './ProductManagementPage.css';
import './LoyaltyPage.css';

const fcfa = (v) => `${Number(v || 0).toLocaleString('fr-FR')} FCFA`;
const nombre = (v) => Number(v || 0).toLocaleString('fr-FR');

const entetes = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

const LoyaltyPage = () => {
  const [reglages, setReglages] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [clients, setClients] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [statut, liste] = await Promise.all([
        axios.get(`${API_BASE_URL}/fidelite/admin`, entetes()),
        axios.get(`${API_BASE_URL}/fidelite/admin/clients`, entetes()),
      ]);
      setReglages(statut.data.reglages);
      setStatistiques(statut.data.statistiques);
      setClients(liste.data);
      setErreur(null);
    } catch (e) {
      setErreur(e.response?.data?.message || 'Impossible de charger le programme de fidélité.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const modifier = (champ, valeur) => {
    setReglages((r) => ({ ...r, [champ]: valeur }));
    setMessage(null);
    setErreur(null);
  };

  const enregistrer = async () => {
    // Contrôles côté navigateur pour un retour immédiat. La base les refait de
    // toute façon : c'est elle qui fait autorité, ceci n'est qu'un confort.
    if (Number(reglages.voucher_min) > Number(reglages.voucher_max)) {
      return setErreur("Le montant minimum du bon ne peut pas dépasser le maximum.");
    }
    if (Number(reglages.value_divisor) <= 0) {
      return setErreur('Le diviseur doit être supérieur à zéro.');
    }

    setEnregistrement(true);
    try {
      const { data } = await axios.put(
        `${API_BASE_URL}/fidelite/admin`,
        {
          is_active: reglages.is_active,
          threshold_points: Number(reglages.threshold_points),
          value_divisor: Number(reglages.value_divisor),
          voucher_min: Number(reglages.voucher_min),
          voucher_max: Number(reglages.voucher_max),
          validity_days: Number(reglages.validity_days),
        },
        entetes()
      );
      setMessage(data.message);
      setErreur(null);
      charger();
    } catch (e) {
      setErreur(e.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  };

  if (chargement) {
    return (
      <div className="management-page">
        <div className="page-header"><h2>Programme de fidélité</h2></div>
        <p>Chargement…</p>
      </div>
    );
  }

  if (!reglages) {
    return (
      <div className="management-page">
        <div className="page-header"><h2>Programme de fidélité</h2></div>
        <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>
        <p className="error-message">{erreur}</p>
      </div>
    );
  }

  // Ce que vaudrait un bon émis pile au seuil, avec les réglages affichés.
  // Montrer le résultat évite à l'administrateur de faire la division de tête
  // pour comprendre l'effet de ce qu'il est en train de changer.
  const valeurAuSeuil = Math.round(
    Math.min(
      Math.max(reglages.threshold_points / (reglages.value_divisor || 1), reglages.voucher_min),
      reglages.voucher_max
    )
  );

  return (
    <div className="management-page">
      <div className="page-header"><h2>Programme de fidélité</h2></div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      {/* --- Compteurs ---------------------------------------------------- */}
      <div className="fid-stats">
        <div className="fid-stat points">
          <div className="fid-stat-valeur">{nombre(statistiques.points_en_circulation)}</div>
          <div className="fid-stat-libelle">
            Points en circulation<br />
            <small>{statistiques.clients_avec_points} client(s)</small>
          </div>
        </div>
        <div className="fid-stat emis">
          <div className="fid-stat-valeur">{statistiques.bons_emis}</div>
          <div className="fid-stat-libelle">Bons émis</div>
        </div>
        <div className="fid-stat utilise">
          <div className="fid-stat-valeur">{statistiques.bons_utilises}</div>
          <div className="fid-stat-libelle">Bons utilisés</div>
        </div>
        <div className="fid-stat expire">
          <div className="fid-stat-valeur">{statistiques.bons_expires}</div>
          <div className="fid-stat-libelle">Expirés sans usage</div>
        </div>
      </div>

      {/* --- Réglages ------------------------------------------------------ */}
      <div className="fid-carte">
        <h3>Réglages</h3>
        <p className="fid-carte-aide">
          Ces valeurs s'appliquent aux commandes suivantes. Les bons déjà émis
          gardent leur montant et leur date d'expiration : ils ont été promis au
          client, les modifier après coup ne serait pas tenable.
        </p>

        <label className="fid-interrupteur">
          <input
            type="checkbox"
            checked={reglages.is_active}
            onChange={(e) => modifier('is_active', e.target.checked)}
          />
          <span>
            <span className="fid-interrupteur-titre">Programme actif</span>
            <span className="fid-interrupteur-aide">
              Désactivé, plus aucun point n'est accordé. Les points déjà acquis
              et les bons en cours restent valables — on ne reprend pas ce qui a
              été gagné.
            </span>
          </span>
        </label>

        <div className="fid-champs">
          <div className="fid-champ">
            <label>Seuil de déclenchement (points)</label>
            <input
              type="number" min="1" step="1000"
              value={reglages.threshold_points}
              onChange={(e) => modifier('threshold_points', e.target.value)}
            />
            <div className="fid-champ-aide">1 point = 1 FCFA de produits, hors livraison.</div>
          </div>

          <div className="fid-champ">
            <label>Diviseur</label>
            <input
              type="number" min="1" step="1"
              value={reglages.value_divisor}
              onChange={(e) => modifier('value_divisor', e.target.value)}
            />
            <div className="fid-champ-aide">
              Le cumul converti est divisé par ce nombre pour obtenir la valeur du bon.
            </div>
          </div>

          <div className="fid-champ">
            <label>Bon minimum (FCFA)</label>
            <input
              type="number" min="1" step="50"
              value={reglages.voucher_min}
              onChange={(e) => modifier('voucher_min', e.target.value)}
            />
          </div>

          <div className="fid-champ">
            <label>Bon maximum (FCFA)</label>
            <input
              type="number" min="1" step="50"
              value={reglages.voucher_max}
              onChange={(e) => modifier('voucher_max', e.target.value)}
            />
            <div className="fid-champ-aide">
              Sans plafond, une commande exceptionnelle produirait un bon hors de
              toute proportion.
            </div>
          </div>

          <div className="fid-champ">
            <label>Validité du bon (jours)</label>
            <input
              type="number" min="1" max="365" step="1"
              value={reglages.validity_days}
              onChange={(e) => modifier('validity_days', e.target.value)}
            />
          </div>
        </div>

        <div className="fid-resume">
          Un client qui atteint <strong>{nombre(reglages.threshold_points)} points</strong> reçoit
          automatiquement un bon de <strong>{fcfa(valeurAuSeuil)}</strong>
          {' '}({nombre(reglages.threshold_points)} ÷ {reglages.value_divisor}), valable{' '}
          <strong>{reglages.validity_days} jours</strong>. Son solde repart de zéro.
          Le bon est nominatif et utilisable une seule fois.
        </div>

        {message && <div className="fid-message">{message}</div>}
        {erreur && <p className="error-message">{erreur}</p>}

        <div className="fid-actions">
          <button className="fid-enregistrer" onClick={enregistrer} disabled={enregistrement}>
            {enregistrement ? 'Enregistrement…' : 'Enregistrer les réglages'}
          </button>
        </div>
      </div>

      {/* --- Clients ------------------------------------------------------- */}
      <div className="fid-carte">
        <h3>Clients</h3>
        {clients.length === 0 ? (
          <p className="fid-vide">Aucun client n'a encore accumulé de points.</p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Points</th>
                  <th>Progression</th>
                  <th>Bons reçus</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const pourcentage = Math.min(
                    100,
                    Math.round((c.loyalty_points / (reglages.threshold_points || 1)) * 100)
                  );
                  return (
                    <tr key={c.id}>
                      <td>{c.name || '—'}</td>
                      <td>{c.email}</td>
                      <td className="fid-points">{nombre(c.loyalty_points)}</td>
                      <td>
                        {pourcentage} %
                        <div className="fid-progression">
                          <span style={{ width: `${pourcentage}%` }} />
                        </div>
                      </td>
                      <td>{c.bons_recus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyPage;
