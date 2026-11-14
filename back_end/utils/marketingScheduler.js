// ARTIVA/back_end/utils/marketingScheduler.js
const cron = require('node-cron');
const pool = require('../config/db');
const {
  sendInactiveUserEmail,
  sendNewProductsEmail,
  sendFavoriteCategoryEmail,
  sendSpecialOfferEmail,
} = require('./sendEmail.js');

/**
 * Planificateur marketing.
 * Tourne tous les jours à 10h UTC (11h Bénin).
 * Envoie la séquence de rétention selon l'âge du compte.
 */
function startMarketingScheduler() {
  cron.schedule('0 10 * * *', async () => {
    console.log('[MarketingScheduler] Vérification des emails marketing à envoyer...');

    try {
      // 1. Récupérer les utilisateurs éligibles (inscrits depuis > 1h, non désabonnés)
      const usersResult = await pool.query(`
        SELECT id, name, email, created_at, marketing_step, 
               EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS heures_ecoulees
        FROM users
        WHERE is_active = true 
          AND is_deleted = false
          AND marketing_unsubscribed = false
          AND email IS NOT NULL
          AND marketing_step < 6
        ORDER BY created_at ASC
      `);

      if (usersResult.rows.length === 0) {
        console.log('[MarketingScheduler] Aucun email à envoyer aujourd\'hui.');
        return;
      }

      let envoyes = 0;

      for (const user of usersResult.rows) {
        try {
          const heures = parseFloat(user.heures_ecoulees);
          const jours = Math.floor(heures / 24);
          
          let nextStep = user.marketing_step;
          let emailSent = false;

          // A) J+1h (Inactif)
          if (heures >= 1 && user.marketing_step === 0) {
            const orderCheck = await pool.query('SELECT 1 FROM orders WHERE user_id = $1 LIMIT 1', [user.id]);
            if (orderCheck.rows.length === 0) {
              await sendInactiveUserEmail(user.email, user.name);
              emailSent = true;
              nextStep = 1;
              console.log(`[Marketing] 🛒 Email inactif envoyé à ${user.email}`);
            } else {
              nextStep = 1; // A déjà commandé, on skip mais on avance l'étape
            }
          }
          
          // B) J+6 (Nouveaux produits)
          else if (jours >= 6 && user.marketing_step < 2) {
            // On récupère les 4 derniers produits publiés
            const products = await pool.query('SELECT name, price, image_url FROM products WHERE is_published = true ORDER BY created_at DESC LIMIT 4');
            if (products.rows.length > 0) {
              await sendNewProductsEmail(user.email, user.name, products.rows);
              emailSent = true;
            }
            nextStep = 2;
            console.log(`[Marketing] 🆕 Email nouveautés envoyé à ${user.email}`);
          }

          // C) J+12 (Catégorie préférée) - Optionnel si on a un historique
          else if (jours >= 12 && user.marketing_step < 3) {
            // Logique simple : on prend une catégorie au hasard ou celle du dernier achat
            // (Pour simplifier ici, on prend 3 produits au hasard)
            const products = await pool.query('SELECT name, price, image_url FROM products WHERE is_published = true ORDER BY RANDOM() LIMIT 3');
            if (products.rows.length > 0) {
              await sendFavoriteCategoryEmail(user.email, user.name, "Artisanat", products.rows);
              emailSent = true;
            }
            nextStep = 3;
            console.log(`[Marketing] 💝 Email catégorie envoyé à ${user.email}`);
          }

          // D) J+18 (Catégorie préférée encore) -> Même logique
          else if (jours >= 18 && user.marketing_step < 4) {
            const products = await pool.query('SELECT name, price, image_url FROM products WHERE is_published = true ORDER BY RANDOM() LIMIT 3');
            if (products.rows.length > 0) {
              await sendFavoriteCategoryEmail(user.email, user.name, "Nos best-sellers", products.rows);
              emailSent = true;
            }
            nextStep = 4;
            console.log(`[Marketing] 💝 Email catégorie 2 envoyé à ${user.email}`);
          }

          // E) J+24 (Offre spéciale)
          else if (jours >= 24 && user.marketing_step < 5) {
            await sendSpecialOfferEmail(user.email, user.name);
            emailSent = true;
            nextStep = 5;
            console.log(`[Marketing] 🎁 Email offre envoyé à ${user.email}`);
          }

          // F) J+30 (Dernier message) -> On désabonne
          else if (jours >= 30 && user.marketing_step < 6) {
            nextStep = 6; 
            console.log(`[Marketing] 👋 Fin de séquence pour ${user.email}`);
          }

          // Mise à jour de l'étape en BDD
          if (nextStep !== user.marketing_step) {
            await pool.query(
              'UPDATE users SET marketing_step = $1, marketing_last_sent_at = NOW() WHERE id = $2',
              [nextStep, user.id]
            );
            if (emailSent) envoyes++;
          }

        } catch (userErr) {
          console.error(`[Marketing] ❌ Erreur user ${user.id}:`, userErr.message);
        }
      }

      console.log(`[MarketingScheduler] Terminé : ${envoyes} email(s) envoyé(s).`);
    } catch (error) {
      console.error('[MarketingScheduler Error]', error);
    }
  });

  console.log('[Scheduler] Planificateur marketing démarré avec succès.');
}

module.exports = { startMarketingScheduler };
