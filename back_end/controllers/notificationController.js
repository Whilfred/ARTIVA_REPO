// ARTIVA/back_end/controllers/notificationController.js
const db = require('../config/db');

// Récupérer les notifications pour l'utilisateur connecté (avec pagination et filtre de lecture)
exports.getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 15, read_status } = req.query;
  const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);

  let query = `
    SELECT id, type, title, message, link_url, is_read, created_at, updated_at 
    FROM notifications
  `;
  const whereClauses = ['user_id = $1'];
  const queryParams = [userId]; // queryParams pour la requête principale
  let paramIndex = 2;

  if (read_status === 'read') {
    whereClauses.push(`is_read = TRUE`);
  } else if (read_status === 'unread') {
    whereClauses.push(`is_read = FALSE`);
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // Requête pour compter le nombre total d'items
  let countQuery = `SELECT COUNT(*) FROM notifications`;
  let countQueryParams = [userId]; // Params pour la requête de comptage

  // Construire la clause WHERE pour countQuery de manière similaire à la requête principale
  // mais en utilisant des placeholders différents si nécessaire (bien que pour COUNT, on peut réutiliser $1, $2 etc. si les valeurs sont les mêmes)
  let countWhereClauses = ['user_id = $1'];
  if (read_status === 'read') {
    countWhereClauses.push(`is_read = TRUE`);
    // countQueryParams.push(true); // Pas besoin si on n'ajoute pas de nouveau placeholder
  } else if (read_status === 'unread') {
    countWhereClauses.push(`is_read = FALSE`);
    // countQueryParams.push(false); // Pas besoin
  }
  
  if (countWhereClauses.length > 0) {
    countQuery += ` WHERE ${countWhereClauses.join(' AND ')}`;
  }
  // Note: Si tu avais plus de filtres complexes, la gestion des queryParams pour countQuery
  // devrait être aussi dynamique que pour la requête principale. Ici, c'est simple.


  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++};`;
  queryParams.push(parseInt(String(limit), 10), offset);
  
  try {
    console.log("Notification Query:", query);
    console.log("Notification Params:", queryParams);
    console.log("Count Query:", countQuery);
    console.log("Count Params:", countQueryParams); // Log pour déboguer countParams

    const { rows: notifications } = await db.query(query, queryParams);
    
    const countResult = await db.query(countQuery, countQueryParams); // Utilise countQueryParams
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / parseInt(String(limit), 10));

    res.status(200).json({
      notifications,
      currentPage: parseInt(String(page), 10),
      totalPages,
      totalItems
    });

  } catch (error) {
    console.error('Erreur récupération notifications utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des notifications.' });
  }
};


// Marquer une notification comme lue
exports.markNotificationAsRead = async (req, res) => {
  const userId = req.user.id;
  const { notificationId } = req.params;

  try {
    // Assumant que la table notifications a une colonne updated_at et un trigger
    const updateQuery = `
      UPDATE notifications 
      SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND user_id = $2 AND is_read = FALSE
      RETURNING *; 
    `; 
    // Le 'AND is_read = FALSE' évite une mise à jour inutile si déjà lue
    
    const { rows } = await db.query(updateQuery, [notificationId, userId]);

    if (rows.length === 0) {
      // Vérifier si la notification existe mais était déjà lue
      const checkAlreadyRead = await db.query('SELECT id, is_read FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
      if (checkAlreadyRead.rows.length > 0 && checkAlreadyRead.rows[0].is_read) {
        return res.status(200).json({ message: 'Notification déjà marquée comme lue.', notification: checkAlreadyRead.rows[0] });
      }
      return res.status(404).json({ message: 'Notification non trouvée, n\'appartient pas à l\'utilisateur, ou déjà lue.' });
    }
    res.status(200).json({ message: 'Notification marquée comme lue.', notification: rows[0] });
  } catch (error) {
    console.error(`Erreur marquage notification ${notificationId} comme lue:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la notification.' });
  }
};

// Marquer toutes les notifications comme lues pour un utilisateur
exports.markAllNotificationsAsRead = async (req, res) => {
    const userId = req.user.id;
    try {
        const updateQuery = `
            UPDATE notifications
            SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING id;`; 

        const result = await db.query(updateQuery, [userId]);
        res.status(200).json({ 
            message: `${result.rowCount} notification(s) marquée(s) comme lue(s).`,
            updatedCount: result.rowCount // Renvoyer le nombre mis à jour
        });
    } catch (error) {
        console.error('Erreur marquage toutes notifications comme lues:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des notifications.' });
    }
};

exports.getUnreadNotificationsCount = async (req, res) => {
  const userId = req.user.id;
  try {
    const query = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE;';
    const result = await db.query(query, [userId]);
    const count = parseInt(result.rows[0].count, 10);
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error('Erreur récupération nombre notifications non lues:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
