const cron = require('node-cron');

function startCampaignScheduler() {
// S'exécute toutes les minutes ('* * * * *')
cron.schedule('* * * * *', async () => {
    console.log('[Scheduler] Vérification des campagnes à envoyer...');
    // Votre logique pour chercher les campagnes dont scheduled_at <= maintenant
});
    console.log('[Scheduler] Planificateur de campagnes démarré avec succès.');
}

module.exports = { startCampaignScheduler };