// ARTIVA/back_end/controllers/campaignController.js
//
// Campagnes email : composition (admin), résolution des destinataires,
// et envoi (immédiat ou programmé).
//
// Règle : les destinataires sont résolus et figés (snapshot dans
// email_campaign_recipients) au moment de l'ENVOI, pas à la création.
// Une campagne programmée pour dans 3 jours doit cibler les utilisateurs
// tels qu'ils sont dans 3 jours, pas tels qu'ils étaient à la création.

const db = require('../config/db');
const { sendCampaignEmail } = require('../utils/sendEmail.js');

// -----------------------------------------------------------------------------
// Résolution des destinataires à partir du ciblage choisi
// -----------------------------------------------------------------------------

async function resolveTargetUsers(client, { target_type, target_filter, manual_user_ids }) {
  const manualIds = Array.isArray(manual_user_ids)
    ? manual_user_ids.map((n) => parseInt(n, 10)).filter(Number.isInteger)
    : [];

  if (target_type === 'manual') {
    if (manualIds.length === 0) return [];
    const { rows } = await client.query(
      `SELECT id, email, name FROM users WHERE id = ANY($1::int[]) AND email IS NOT NULL AND is_active = TRUE`,
      [manualIds]
    );
    return rows;
  }

  if (target_type === 'all') {
    const { rows } = await client.query(
      `SELECT id, email, name FROM users WHERE is_active = TRUE AND email IS NOT NULL`
    );
    return rows;
  }

  if (target_type === 'filter') {
    const filtre = target_filter || {};
    const conditions = ['u.is_active = TRUE', 'u.email IS NOT NULL'];
    const params = [];
    let paramIndex = 1;

    if (filtre.never_ordered) {
      conditions.push(`NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)`);
    }

    if (filtre.inactive_days) {
      const jours = parseInt(filtre.inactive_days, 10);
      if (Number.isInteger(jours) && jours > 0) {
        conditions.push(`
          NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o.user_id = u.id AND o.created_at > NOW() - ($${paramIndex}::text || ' days')::interval
          )
        `);
        params.push(jours);
        paramIndex++;
      }
    }

    if (filtre.abandoned_cart_hours) {
      const heures = parseInt(filtre.abandoned_cart_hours, 10);
      if (Number.isInteger(heures) && heures > 0) {
        conditions.push(`
          EXISTS (
            SELECT 1 FROM carts c
            JOIN cart_items ci ON ci.cart_id = c.id
            WHERE c.user_id = u.id
              AND ci.added_at < NOW() - ($${paramIndex}::text || ' hours')::interval
              AND NOT EXISTS (
                SELECT 1 FROM orders o
                WHERE o.user_id = u.id AND o.created_at > ci.added_at
              )
          )
        `);
        params.push(heures);
        paramIndex++;
      }
    }

    const query = `SELECT u.id, u.email, u.name FROM users u WHERE ${conditions.join(' AND ')}`;
    const { rows: filtered } = await client.query(query, params);

    if (manualIds.length === 0) return filtered;

    // Ajout manuel par-dessus le filtre : union sans doublon.
    const { rows: manuels } = await client.query(
      `SELECT id, email, name FROM users WHERE id = ANY($1::int[]) AND email IS NOT NULL AND is_active = TRUE`,
      [manualIds]
    );
    const dejaPresents = new Set(filtered.map((u) => u.id));
    return [...filtered, ...manuels.filter((u) => !dejaPresents.has(u.id))];
  }

  return [];
}

// -----------------------------------------------------------------------------
// Substitution de variables simples dans le sujet/corps ({nom})
// -----------------------------------------------------------------------------

function substituer(texte, user) {
  return (texte || '').replace(/\{nom\}/gi, user.name || 'cher client');
}

// =============================================================================
// POST /api/campaigns/preview — compter/lister les destinataires avant d'envoyer
// =============================================================================

exports.previewRecipients = async (req, res) => {
  try {
    const users = await resolveTargetUsers(db, req.body);
    return res.status(200).json({
      count: users.length,
      sample: users.slice(0, 20).map((u) => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (error) {
    console.error('Erreur preview destinataires campagne:', error);
    res.status(500).json({ message: 'Erreur serveur lors du calcul des destinataires.' });
  }
};

// =============================================================================
// POST /api/campaigns — créer (brouillon, programmée, ou envoi immédiat)
// =============================================================================

exports.createCampaign = async (req, res) => {
  const { subject, body_html, target_type, target_filter, manual_user_ids, scheduled_at, send_now } = req.body;

  if (!subject || !body_html) {
    return res.status(400).json({ message: 'Le sujet et le contenu sont requis.' });
  }
  if (!['all', 'manual', 'filter'].includes(target_type)) {
    return res.status(400).json({ message: 'Ciblage invalide.' });
  }

  let status = 'draft';
  if (scheduled_at) {
    if (new Date(scheduled_at) <= new Date()) {
      return res.status(400).json({ message: 'La date programmée doit être dans le futur.' });
    }
    status = 'scheduled';
  } else if (send_now) {
    status = 'sending';
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO email_campaigns
        (subject, body_html, target_type, target_filter, manual_user_ids, status, scheduled_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        subject,
        body_html,
        target_type,
        target_filter ? JSON.stringify(target_filter) : null,
        Array.isArray(manual_user_ids) ? manual_user_ids : null,
        status,
        scheduled_at || null,
        req.user.id,
      ]
    );
    const campaign = rows[0];

    if (status === 'sending') {
      // Réponse immédiate à l'admin ; l'envoi se fait en tâche de fond et ne
      // doit pas faire attendre la requête HTTP (peut prendre du temps selon
      // le nombre de destinataires).
      res.status(201).json({ message: 'Campagne créée, envoi en cours.', campaign });
      executeCampaignSend(campaign.id).catch((err) =>
        console.error(`Erreur envoi campagne ${campaign.id}:`, err)
      );
      return;
    }

    res.status(201).json({
      message: status === 'scheduled' ? 'Campagne programmée.' : 'Brouillon enregistré.',
      campaign,
    });
  } catch (error) {
    console.error('Erreur création campagne:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la campagne.' });
  }
};

// =============================================================================
// GET /api/campaigns — liste avec compteurs de destinataires
// =============================================================================

exports.listCampaigns = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM email_campaign_recipients r WHERE r.campaign_id = c.id) AS total_destinataires,
        (SELECT COUNT(*)::int FROM email_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'sent') AS envoyes,
        (SELECT COUNT(*)::int FROM email_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'failed') AS echoues
      FROM email_campaigns c
      ORDER BY c.created_at DESC
    `);
    res.status(200).json({ campaigns: rows });
  } catch (error) {
    console.error('Erreur liste campagnes:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// =============================================================================
// GET /api/campaigns/:id — détail + destinataires
// =============================================================================

exports.getCampaignDetails = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Campagne introuvable.' });
    }
    const { rows: destinataires } = await db.query(
      `SELECT id, user_id, email, name, status, error, sent_at
       FROM email_campaign_recipients WHERE campaign_id = $1 ORDER BY id`,
      [req.params.id]
    );
    res.status(200).json({ campaign: rows[0], destinataires });
  } catch (error) {
    console.error('Erreur détail campagne:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// =============================================================================
// POST /api/campaigns/:id/send — déclencher l'envoi d'un brouillon ou d'une
// campagne programmée, manuellement ("envoyer maintenant")
// =============================================================================

exports.sendCampaignNow = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      `UPDATE email_campaigns SET status = 'sending', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('draft', 'scheduled') RETURNING *`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Cette campagne ne peut pas être envoyée (déjà envoyée ou en cours).' });
    }

    res.status(200).json({ message: 'Envoi lancé.', campaign: rows[0] });
    executeCampaignSend(id).catch((err) => console.error(`Erreur envoi campagne ${id}:`, err));
  } catch (error) {
    console.error(`Erreur déclenchement envoi campagne ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// =============================================================================
// DELETE /api/campaigns/:id — supprimer un brouillon ou annuler une
// campagne programmée (jamais une campagne déjà envoyée : l'historique reste)
// =============================================================================

exports.deleteCampaign = async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM email_campaigns WHERE id = $1 AND status IN ('draft', 'scheduled') RETURNING id`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Seuls les brouillons et campagnes programmées peuvent être supprimés.' });
    }
    res.status(200).json({ message: 'Campagne supprimée.' });
  } catch (error) {
    console.error('Erreur suppression campagne:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// =============================================================================
// Exécution réelle de l'envoi — appelée en tâche de fond, jamais directement
// depuis une route (pas de req/res ici).
// =============================================================================

async function executeCampaignSend(campaignId) {
  const { rows } = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [campaignId]);
  if (rows.length === 0) return;
  const campaign = rows[0];

  const destinataires = await resolveTargetUsers(db, campaign);

  if (destinataires.length === 0) {
    await db.query(
      `UPDATE email_campaigns SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [campaignId]
    );
    console.log(`[Campaign ${campaignId}] Aucun destinataire, campagne marquée envoyée sans envoi.`);
    return;
  }

  // Snapshot des destinataires : permet de suivre qui a reçu quoi, même si
  // le ciblage (ex: filtre) change de résultat après coup.
  for (const u of destinataires) {
    await db.query(
      `INSERT INTO email_campaign_recipients (campaign_id, user_id, email, name)
       VALUES ($1, $2, $3, $4)`,
      [campaignId, u.id, u.email, u.name]
    );
  }

  const { rows: pendingRecipients } = await db.query(
    `SELECT id, email, name FROM email_campaign_recipients WHERE campaign_id = $1 AND status = 'pending'`,
    [campaignId]
  );

  console.log(`[Campaign ${campaignId}] Envoi à ${pendingRecipients.length} destinataire(s)...`);

  let echoues = 0;
  for (const recipient of pendingRecipients) {
    try {
      await sendCampaignEmail(recipient.email, {
        subject: substituer(campaign.subject, recipient),
        html: substituer(campaign.body_html, recipient),
      });
      await db.query(
        `UPDATE email_campaign_recipients SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [recipient.id]
      );
    } catch (error) {
      echoues++;
      await db.query(
        `UPDATE email_campaign_recipients SET status = 'failed', error = $1 WHERE id = $2`,
        [String(error.message || error).slice(0, 500), recipient.id]
      );
    }
    // Petite pause entre chaque envoi pour rester sous les limites de débit
    // de l'API Brevo, surtout utile sur de grandes listes.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  await db.query(
    `UPDATE email_campaigns SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [echoues === pendingRecipients.length ? 'failed' : 'sent', campaignId]
  );

  console.log(`[Campaign ${campaignId}] Terminé : ${pendingRecipients.length - echoues} envoyés, ${echoues} échecs.`);
}

// Exposée pour le scheduler (utils/campaignScheduler.js)
exports.executeCampaignSend = executeCampaignSend;
