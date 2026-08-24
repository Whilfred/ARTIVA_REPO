// admin_panel/src/pages/ShippingZonesPage.js
//
// Zones et tarifs de livraison.
//
// La grille vivait en dur dans deux fichiers — back_end/utils/shipping.js pour
// la facturation, front_end/app/checkout.tsx pour l'affichage. Elle est
// maintenant en base et se règle ici ; les deux côtés la lisent.

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import './ProductManagementPage.css'; // structure commune aux pages d'administration
import './ShippingZonesPage.css';

const formaterMontant = (v) => `${Number(v || 0).toLocaleString('fr-FR')} FCFA`;

const ZONE_VIDE = {
  name: '',
  label: '',
  country: '',
  cost: '',
  is_country_default: false,
  is_global_fallback: false,
  is_active: true,
  sort_order: 0,
  cities: [],
};

// -----------------------------------------------------------------------------
// Fenêtre de création / modification
// -----------------------------------------------------------------------------
const FenetreZone = ({ ouverte, zone, onFermer, onEnregistre }) => {
  const [valeurs, setValeurs] = useState(ZONE_VIDE);
  const [villeEnCours, setVilleEnCours] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouverte) return;
    setValeurs(zone ? { ...ZONE_VIDE, ...zone, cost: String(zone.cost) } : ZONE_VIDE);
    setVilleEnCours('');
    setErreur(null);
  }, [ouverte, zone]);

  if (!ouverte) return null;

  const modifier = (champ, valeur) => {
    setValeurs((v) => ({ ...v, [champ]: valeur }));
    setErreur(null);
  };

  const ajouterVille = () => {
    const propre = villeEnCours.trim();
    if (!propre) return;
    // Comparaison insensible à la casse : sans elle, « Cotonou » et « cotonou »
    // s'ajouteraient tous les deux, et la base refuserait ensuite l'ensemble.
    const existe = valeurs.cities.some(
      (v) => v.toLowerCase() === propre.toLowerCase()
    );
    if (!existe) modifier('cities', [...valeurs.cities, propre]);
    setVilleEnCours('');
  };

  const retirerVille = (ville) =>
    modifier('cities', valeurs.cities.filter((v) => v !== ville));

  const enregistrer = async () => {
    if (!valeurs.name.trim())    return setErreur('Le nom de la zone est obligatoire.');
    if (!valeurs.label.trim())   return setErreur("Le libellé montré au client est obligatoire.");
    if (!valeurs.country.trim()) return setErreur('Le pays est obligatoire.');
    const cout = Number(valeurs.cost);
    if (!Number.isFinite(cout) || cout < 0) {
      return setErreur('Le tarif doit être un montant positif ou nul.');
    }

    setEnvoi(true);
    try {
      const entetes = {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      };
      const charge = {
        name: valeurs.name.trim(),
        label: valeurs.label.trim(),
        country: valeurs.country.trim(),
        cost: cout,
        is_country_default: valeurs.is_country_default,
        is_global_fallback: valeurs.is_global_fallback,
        is_active: valeurs.is_active,
        sort_order: Number(valeurs.sort_order) || 0,
        cities: valeurs.cities,
      };
      if (zone) await axios.put(`${API_BASE_URL}/livraison/zones/${zone.id}`, charge, entetes);
      else      await axios.post(`${API_BASE_URL}/livraison/zones`, charge, entetes);
      onEnregistre();
    } catch (e) {
      setErreur(e.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onFermer}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h3 style={{ marginTop: 0 }}>
          {zone ? `Modifier « ${zone.name} »` : 'Nouvelle zone de livraison'}
        </h3>

        {erreur && <div className="sz-erreur">{erreur}</div>}

        <div className="sz-champs">
          <div className="sz-champ">
            <label>Nom de la zone</label>
            <input
              type="text"
              value={valeurs.name}
              onChange={(e) => modifier('name', e.target.value)}
              placeholder="Sud Bénin"
            />
            <div className="sz-aide">Usage interne, pour vous y retrouver.</div>
          </div>

          <div className="sz-champ">
            <label>Pays</label>
            <input
              type="text"
              value={valeurs.country}
              onChange={(e) => modifier('country', e.target.value)}
              placeholder="Bénin"
            />
            <div className="sz-aide">Apparaît tel quel dans le sélecteur de l'application.</div>
          </div>

          <div className="sz-champ large">
            <label>Libellé montré au client</label>
            <input
              type="text"
              value={valeurs.label}
              onChange={(e) => modifier('label', e.target.value)}
              placeholder="📍 Zone Sud Bénin"
            />
            <div className="sz-aide">
              Affiché au moment du paiement et repris dans les emails. Les émojis sont acceptés.
            </div>
          </div>

          <div className="sz-champ">
            <label>Tarif (FCFA)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={valeurs.cost}
              onChange={(e) => modifier('cost', e.target.value)}
              placeholder="1500"
            />
          </div>

          <div className="sz-champ">
            <label>Ordre d'affichage</label>
            <input
              type="number"
              value={valeurs.sort_order}
              onChange={(e) => modifier('sort_order', e.target.value)}
            />
            <div className="sz-aide">Les plus petits nombres passent en premier.</div>
          </div>
        </div>

        <div className="sz-champ" style={{ marginBottom: 18 }}>
          <label>Villes desservies</label>
          <div className="sz-villes-boite">
            {valeurs.cities.map((ville) => (
              <span className="sz-pastille-ville" key={ville}>
                {ville}
                <button type="button" onClick={() => retirerVille(ville)} title="Retirer">
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={villeEnCours}
              onChange={(e) => setVilleEnCours(e.target.value)}
              onKeyDown={(e) => {
                // Entrée et virgule valident la saisie. Le preventDefault évite
                // qu'Entrée déclenche la soumission de la fenêtre.
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  ajouterVille();
                }
              }}
              onBlur={ajouterVille}
              placeholder={valeurs.cities.length ? 'Ajouter une ville…' : 'Cotonou, Porto-Novo…'}
            />
          </div>
          <div className="sz-aide">
            Entrée ou virgule pour valider. Laisser vide si la zone couvre tout le
            pays. Une ville ne peut appartenir qu'à une seule zone : son tarif
            serait sinon ambigu.
          </div>
        </div>

        <label className="sz-case">
          <input
            type="checkbox"
            checked={valeurs.is_country_default}
            onChange={(e) => modifier('is_country_default', e.target.checked)}
          />
          <span>
            <span className="sz-case-titre">Tarif par défaut de ce pays</span>
            <span className="sz-case-aide">
              S'applique aux villes du pays qui ne sont listées dans aucune zone.
              C'est ce qui permet d'avoir un tarif unique pour tout un pays sans
              énumérer ses villes. Une seule zone par pays peut porter ce rôle.
            </span>
          </span>
        </label>

        <label className="sz-case">
          <input
            type="checkbox"
            checked={valeurs.is_global_fallback}
            onChange={(e) => modifier('is_global_fallback', e.target.checked)}
          />
          <span>
            <span className="sz-case-titre">Zone de repli générale</span>
            <span className="sz-case-aide">
              Utilisée quand même le pays est inconnu. Une seule zone au total
              peut jouer ce rôle, et elle ne peut être ni désactivée ni supprimée
              tant qu'aucune autre ne la remplace.
            </span>
          </span>
        </label>

        <label className="sz-case">
          <input
            type="checkbox"
            checked={valeurs.is_active}
            onChange={(e) => modifier('is_active', e.target.checked)}
          />
          <span>
            <span className="sz-case-titre">Zone active</span>
            <span className="sz-case-aide">
              Désactivée, elle disparaît du sélecteur de l'application et n'est
              plus facturable.
            </span>
          </span>
        </label>

        <div className="sz-actions">
          <button className="sz-btn secondaire" onClick={onFermer}>Annuler</button>
          <button className="sz-btn principal" onClick={enregistrer} disabled={envoi}>
            {envoi ? 'Enregistrement…' : zone ? 'Enregistrer' : 'Créer la zone'}
          </button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
const ShippingZonesPage = () => {
  const [zones, setZones] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [fenetreOuverte, setFenetreOuverte] = useState(false);
  const [zoneChoisie, setZoneChoisie] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/livraison/zones/admin`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      setZones(data);
      setErreur(null);
    } catch (e) {
      setErreur(e.response?.data?.message || 'Impossible de charger les zones.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const supprimer = async (zone) => {
    const avertissement = zone.cities.length
      ? `\n\nSes ${zone.cities.length} ville(s) seront détachées et retomberont sur le tarif par défaut.`
      : '';
    if (!window.confirm(`Supprimer la zone « ${zone.name} » ?${avertissement}`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/livraison/zones/${zone.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      charger();
    } catch (e) {
      // Le serveur refuse par exemple la suppression de la zone de repli :
      // son message explique pourquoi, mieux qu'un « erreur » générique.
      alert(e.response?.data?.message || 'Suppression impossible.');
    }
  };

  const ouvrir = (zone) => { setZoneChoisie(zone); setFenetreOuverte(true); };

  return (
    <div className="management-page">
      <div className="page-header">
        <h2>Zones de livraison</h2>
        <button className="add-btn" onClick={() => ouvrir(null)}>+ Nouvelle zone</button>
      </div>
      <Link to="/dashboard" className="back-link">← Retour au Tableau de Bord</Link>

      <p className="sz-intro">
        Le tarif d'une commande est déterminé en trois temps : la ville de
        livraison si elle est rattachée à une zone, sinon le tarif par défaut de
        son pays, sinon la zone de repli générale. Toute modification s'applique
        aux commandes suivantes — les commandes déjà passées gardent le tarif
        qui leur a été facturé.
      </p>

      {erreur && <p className="error-message">{erreur}</p>}

      {chargement ? (
        <p>Chargement…</p>
      ) : zones.length === 0 ? (
        <p className="sz-vide">Aucune zone définie.</p>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Pays</th>
                <th>Tarif</th>
                <th>Villes desservies</th>
                <th>Rôles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} style={{ opacity: z.is_active ? 1 : 0.55 }}>
                  <td>
                    <strong>{z.name}</strong>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{z.label}</div>
                  </td>
                  <td>{z.country}</td>
                  <td className="sz-tarif">{formaterMontant(z.cost)}</td>
                  <td className="sz-villes">
                    {z.cities.length === 0 ? (
                      <em>Tout le pays</em>
                    ) : (
                      <>
                        <strong>{z.cities.length}</strong>{' '}
                        {/* Aperçu limité : afficher douze noms écraserait la ligne. */}
                        — {z.cities.slice(0, 4).join(', ')}
                        {z.cities.length > 4 ? `… (+${z.cities.length - 4})` : ''}
                      </>
                    )}
                  </td>
                  <td>
                    {z.is_country_default && <span className="sz-marqueur defaut">défaut pays</span>}
                    {z.is_global_fallback && <span className="sz-marqueur repli">repli</span>}
                    <span className={`sz-marqueur ${z.is_active ? 'actif' : 'eteint'}`}>
                      {z.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit-btn" onClick={() => ouvrir(z)} title="Modifier">✎</button>
                    <button className="action-btn delete-btn" onClick={() => supprimer(z)} title="Supprimer">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FenetreZone
        ouverte={fenetreOuverte}
        zone={zoneChoisie}
        onFermer={() => setFenetreOuverte(false)}
        onEnregistre={() => { setFenetreOuverte(false); charger(); }}
      />
    </div>
  );
};

export default ShippingZonesPage;
