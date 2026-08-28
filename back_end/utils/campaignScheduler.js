const cron = require('node-cron');
// Importez votre pool de connexion ou client de base de données ici (ex: const pool = require('../config/db');)

function startCampaignScheduler() {
    // S'exécute toutes les minutes ('* * * * *')
    cron.schedule('* * * * *', async () => {
        console.log('[Scheduler] Vérification des campagnes à envoyer...');
        try {
            // 1. Vérifions l'heure vue par la base de données
            const timeRes = await pool.query('SELECT NOW() as db_time');
            console.log('[Scheduler Debug] Heure actuelle de la base de données :', timeRes.rows[0].db_time);

            // 2. Récupérons toutes les campagnes avec le statut 'scheduled' pour comparer
            const campaignsRes = await pool.query(
                "SELECT id, subject, status, scheduled_at FROM email_campaigns WHERE status = 'scheduled'"
            );
            console.log('[Scheduler Debug] Campagnes programmées trouvées en BD :', campaignsRes.rows);

            // 3. Votre requête de sélection normale
            const query = `
                SELECT * FROM email_campaigns 
                WHERE status = 'scheduled' 
                  AND scheduled_at <= NOW()
            `;
            const result = await pool.query(query);
            console.log('[Scheduler Debug] Campagnes prêtes à être envoyées (<= NOW()) :', result.rows.length);

            // S'il y a des campagnes prêtes, vous pouvez les traiter ici ou appeler votre logique d'envoi
            for (const campaign of result.rows) {
                console.log(`[Scheduler] Déclenchement de la campagne ID : ${campaign.id}`);
                // Votre logique d'envoi d'e-mail ici...
            }

        } catch (err) {
            console.error('[Scheduler Error] Erreur lors de la vérification des campagnes :', err);
        }
    });

    console.log('[Scheduler] Planificateur de campagnes démarré avec succès.');
}

module.exports = { startCampaignScheduler };