const cron = require('node-cron');
// Importez votre pool de connexion PostgreSQL (vérifiez le chemin exact selon votre arborescence)
const pool = require('../config/db'); // ou require('../db') selon où se trouve votre fichier de connexion

function startCampaignScheduler() {
    // S'exécute toutes les minutes ('* * * * *')
    cron.schedule('* * * * *', async () => {
        console.log('[Scheduler] Vérification des campagnes à envoyer...');
        try {
            // 1. Vérifions l'heure de la base de données
            const timeRes = await pool.query('SELECT NOW() as db_time');
            console.log('[Scheduler Debug] Heure actuelle de la base de données :', timeRes.rows[0].db_time);

            // 2. Voyons toutes les campagnes programmées en base
            const campaignsRes = await pool.query(
                "SELECT id, subject, status, scheduled_at FROM email_campaigns WHERE status = 'scheduled'"
            );
            console.log('[Scheduler Debug] Campagnes programmées en BD :', campaignsRes.rows);

            // 3. Sélection des campagnes dont l'heure est atteinte
            const query = `
                SELECT * FROM email_campaigns 
                WHERE status = 'scheduled' 
                  AND scheduled_at <= NOW()
            `;
            const result = await pool.query(query);
            console.log('[Scheduler Debug] Nombre de campagnes prêtes à l\'envoi (<= NOW()) :', result.rows.length);

            // Si vous avez déjà une fonction d'envoi dans votre projet, vous pouvez l'appeler ici pour les traiter
            for (const campaign of result.rows) {
                console.log(`[Scheduler] Exécution de la campagne ID : ${campaign.id} - ${campaign.subject}`);
                // Mettez ici votre logique d'envoi ou l'appel à votre contrôleur d'envoi
            }

        } catch (err) {
            console.error('[Scheduler Error] Erreur lors de la vérification des campagnes :', err);
        }
    });

    console.log('[Scheduler] Planificateur de campagnes démarré avec succès.');
}

module.exports = { startCampaignScheduler };