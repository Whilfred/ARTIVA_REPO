const cron = require('node-cron');

function startCampaignScheduler() {
    cron.schedule('0 8 * * *', async () => {
        console.log('[Scheduler] Exécution de la tâche planifiée...');
        // Votre logique ici
    });
    console.log('[Scheduler] Planificateur de campagnes démarré avec succès.');
}

module.exports = { startCampaignScheduler };