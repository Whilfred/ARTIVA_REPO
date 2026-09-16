// ARTIVA/back_end/utils/activityBatchScheduler.js
// Envoie un résumé d'activité groupé à UN SEUL email : artiva.app@gmail.com
// Toutes les 5 minutes.

const cron = require('node-cron');
const pool = require('../config/db');
const { sendActivityBatchEmail } = require('../utils/sendEmail.js');

// ✅ Email destinataire unique (configurable via variable d'env sur Render)
const ACTIVITY_EMAIL = process.env.ACTIVITY_EMAIL || 'artiva.app@gmail.com';

function startActivityBatchScheduler() {
  // Toutes les 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[ActivityBatch] Vérification des activités...');

    try {
      // Chercher les activités non encore envoyées
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

      // ✅ Envoi à UN SEUL destinataire : artiva.app@gmail.com
      try {
        await sendActivityBatchEmail(ACTIVITY_EMAIL, {
          activities: result.rows,
          period: `5 dernières minutes (${result.rows.length} action${result.rows.length > 1 ? 's' : ''})`,
        });
        console.log(`[ActivityBatch] ✅ Résumé envoyé à ${ACTIVITY_EMAIL}`);
      } catch (emailErr) {
        console.error(`[ActivityBatch] ❌ Erreur email ${ACTIVITY_EMAIL}:`, emailErr.message);
      }

      // Marquer comme envoyées
      const ids = result.rows.map((r) => r.id);
      await pool.query(
        `UPDATE activity_log 
         SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"batch_sent": true}'::jsonb
         WHERE id = ANY($1::int[])`,
        [ids]
      );

      console.log(`[ActivityBatch] ✅ ${result.rows.length} activité(s) marquée(s) comme envoyées.`);
    } catch (error) {
      console.error('[ActivityBatch Error]:', error);
    }
  });

  console.log(`[Scheduler] Planificateur de résumé d'activité démarré (destinataire : ${ACTIVITY_EMAIL}).`);
}

module.exports = { startActivityBatchScheduler };
