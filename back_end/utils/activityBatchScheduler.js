// ARTIVA/back_end/utils/activityBatchScheduler.js
// Envoie un résumé d'activité groupé aux admins toutes les 5 minutes.

const cron = require('node-cron');
const pool = require('../config/db');
const { sendActivityBatchEmail } = require('../utils/sendEmail.js');

function startActivityBatchScheduler() {
  // Toutes les 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[ActivityBatch] Vérification des activités...');

    try {
      // Chercher les activités non encore envoyées
      // (on utilise metadata->>'batch_sent' pour éviter les doublons)
      const result = await pool.query(`
        SELECT 
          id, user_id, user_name, user_email, 
          event_type, title, description, metadata, created_at
        FROM activity_log
        WHERE (metadata IS NULL OR metadata->>'batch_sent' IS NULL)
          AND created_at > NOW() - INTERVAL '10 minutes'
        ORDER BY created_at ASC
        LIMIT 100
      `);

      if (result.rows.length === 0) {
        console.log('[ActivityBatch] Aucune activité à envoyer.');
        return;
      }

      console.log(`[ActivityBatch] ${result.rows.length} activité(s) à envoyer.`);

      // Récupérer tous les admins
      const admins = await pool.query(
        'SELECT email FROM admin WHERE email IS NOT NULL'
      );

      if (admins.rows.length === 0) {
        console.log('[ActivityBatch] Aucun admin.');
        return;
      }

      // Envoyer à tous les admins
      for (const admin of admins.rows) {
        try {
          await sendActivityBatchEmail(admin.email, {
            activities: result.rows,
            period: `5 dernières minutes (${result.rows.length} action${result.rows.length > 1 ? 's' : ''})`,
          });
        } catch (emailErr) {
          console.error(`[ActivityBatch] Erreur email admin ${admin.email}:`, emailErr.message);
        }
      }

      // Marquer comme envoyées
      const ids = result.rows.map((r) => r.id);
      await pool.query(
        `UPDATE activity_log 
         SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"batch_sent": true}'::jsonb
         WHERE id = ANY($1::int[])`,
        [ids]
      );

      console.log(`[ActivityBatch] ✅ ${result.rows.length} activité(s) envoyée(s) à ${admins.rows.length} admin(s).`);
    } catch (error) {
      console.error('[ActivityBatch Error]:', error);
    }
  });

  console.log('[Scheduler] Planificateur de résumé d\'activité démarré avec succès.');
}

module.exports = { startActivityBatchScheduler };
