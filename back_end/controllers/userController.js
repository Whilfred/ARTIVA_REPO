// ARTIVA/back_end/controllers/userController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendPasswordChangedEmail } = require("../utils/sendEmail.js");

// --- Récupérer le profil de l'utilisateur actuellement connecté ---
exports.getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let queryText;
    if (userRole === 'admin' || userRole === 'super_admin') {
      queryText = 'SELECT id, name, email, role, created_at, updated_at FROM admin WHERE id = $1';
    } else {
      queryText = 'SELECT id, name, email, address, phone, role, created_at, updated_at FROM users WHERE id = $1';
    }
    const { rows } = await db.query(queryText, [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erreur récupération profil utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur récupération profil.' });
  }
};

// --- (Admin) : Lister tous les utilisateurs ---
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, name, email, address, phone, role, 
        is_active, is_deleted,
        blocked_reason, blocked_at,
        created_at, updated_at, last_login_at
      FROM users 
      WHERE is_deleted = FALSE
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération de tous les utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
  }
};

// --- (Admin) : Récupérer un utilisateur spécifique par son ID ---
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        id, name, email, address, phone, role, 
        is_active, is_deleted, blocked_reason, blocked_at,
        created_at, updated_at, last_login_at
      FROM users 
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur.' });
  }
};

// --- (Admin) : Mettre à jour un utilisateur ---
exports.updateUserByAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, email, address, phone, role, is_active, blocked_reason } = req.body;

  // Validation : Au moins un champ doit être fourni pour la mise à jour
  if (
    name === undefined &&
    email === undefined &&
    address === undefined &&
    phone === undefined &&
    role === undefined &&
    is_active === undefined &&
    blocked_reason === undefined
  ) {
    return res.status(400).json({ message: 'Aucun champ fourni pour la mise à jour.' });
  }

  // Construire la requête de mise à jour dynamiquement
  const fieldsToUpdate = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) { fieldsToUpdate.push(`name = $${paramIndex++}`); values.push(name); }
  if (email !== undefined) { fieldsToUpdate.push(`email = $${paramIndex++}`); values.push(email); }
  if (address !== undefined) { fieldsToUpdate.push(`address = $${paramIndex++}`); values.push(address); }
  if (phone !== undefined) { fieldsToUpdate.push(`phone = $${paramIndex++}`); values.push(phone); }
  if (role !== undefined) {
    if (!['customer', 'vendor'].includes(role)) {
      return res.status(400).json({ message: 'Rôle utilisateur invalide.' });
    }
    fieldsToUpdate.push(`role = $${paramIndex++}`); values.push(role);
  }

  // Gérer le champ is_active + blocked_reason + blocked_at
  if (is_active !== undefined) {
    fieldsToUpdate.push(`is_active = $${paramIndex++}`);
    values.push(is_active);

    if (is_active === false) {
      // Blocage : enregistrer la raison + la date
      fieldsToUpdate.push(`blocked_reason = $${paramIndex++}`);
      values.push(blocked_reason || 'Bloqué par admin');

      fieldsToUpdate.push(`blocked_at = $${paramIndex++}`);
      values.push(new Date());
    } else if (is_active === true) {
      // Déblocage : nettoyer les champs de blocage
      fieldsToUpdate.push(`blocked_reason = $${paramIndex++}`);
      values.push(null);

      fieldsToUpdate.push(`blocked_at = $${paramIndex++}`);
      values.push(null);
    }
  }

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ message: 'Aucun champ valide fourni pour la mise à jour.' });
  }

  fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE users 
    SET ${fieldsToUpdate.join(', ')} 
    WHERE id = $${paramIndex}
    RETURNING id, name, email, address, phone, role, is_active, 
              blocked_reason, blocked_at, created_at, updated_at;
  `;
  values.push(id);

  try {
    if (email !== undefined) {
      const emailCheckQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
      const emailCheckResult = await db.query(emailCheckQuery, [email, id]);
      if (emailCheckResult.rows.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé par un autre compte.' });
      }
    }

    const { rows } = await db.query(updateQuery, values);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé pour la mise à jour.' });
    }
    res.status(200).json({ message: 'Utilisateur mis à jour avec succès!', user: rows[0] });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de l'utilisateur ${id}:`, error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Conflit de données (ex: email déjà existant).', detail: error.detail });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur.' });
  }
};

// --- (Admin) : Supprimer définitivement un utilisateur ---
exports.deleteUserByAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const userCheck = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const ordersCheck = await db.query('SELECT COUNT(*)::int AS n FROM orders WHERE user_id = $1', [id]);
    if (ordersCheck.rows[0].n > 0) {
      return res.status(409).json({
        message: `Cet utilisateur a ${ordersCheck.rows[0].n} commande(s) : la suppression définitive effacerait cet historique. Utilisez plutôt l'anonymisation.`,
        hasOrders: true,
      });
    }

    const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role;';
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé pour la suppression.' });
    }
    res.status(200).json({ message: 'Utilisateur supprimé avec succès.', user: result.rows[0] });
  } catch (error) {
    console.error(`Erreur lors de la suppression de l'utilisateur ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur.' });
  }
};

// --- (Admin) : Anonymiser un utilisateur ---
exports.anonymizeUserByAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const userCheck = await db.query('SELECT id, is_deleted FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    if (userCheck.rows[0].is_deleted) {
      return res.status(400).json({ message: 'Cet utilisateur est déjà anonymisé.' });
    }

    const placeholderEmail = `utilisateur-supprime-${id}@artiva.local`;

    const query = `
      UPDATE users SET
        name = 'Utilisateur supprimé',
        email = $1,
        phone = NULL,
        address = NULL,
        google_id = NULL,
        picture = NULL,
        password_hash = '',
        is_active = FALSE,
        is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, is_deleted, deleted_at;
    `;
    const { rows } = await db.query(query, [placeholderEmail, id]);

    res.status(200).json({
      message: 'Compte anonymisé : les informations personnelles ont été effacées, l\'historique de commandes est conservé.',
      user: rows[0],
    });
  } catch (error) {
    console.error(`Erreur anonymisation utilisateur ${id}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'anonymisation.' });
  }
};

// --- Mettre à jour le profil de l'utilisateur connecté (CLIENT) ---
exports.updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, address, phone, current_password, new_password } = req.body;

  const fieldsToUpdate = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) { fieldsToUpdate.push(`name = $${paramIndex++}`); values.push(name.trim() === '' ? null : name); }
  if (address !== undefined) { fieldsToUpdate.push(`address = $${paramIndex++}`); values.push(address.trim() === '' ? null : address); }
  if (phone !== undefined) { fieldsToUpdate.push(`phone = $${paramIndex++}`); values.push(phone.trim() === '' ? null : phone); }

  if (new_password && current_password) {
    try {
      const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }
      const user = userResult.rows[0];
      const isPasswordMatch = await bcrypt.compare(current_password, user.password_hash);
      if (!isPasswordMatch) {
        return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
      }
      const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10');
      const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);
      fieldsToUpdate.push(`password_hash = $${paramIndex++}`);
      values.push(hashedNewPassword);
    } catch (bcryptError) {
      console.error("Erreur bcrypt changement mot de passe:", bcryptError);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.' });
    }
  } else if (new_password && !current_password) {
    return res.status(400).json({ message: 'Le mot de passe actuel est requis pour définir un nouveau mot de passe.' });
  }

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ message: 'Aucun champ fourni pour la mise à jour.' });
  }

  fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE users 
    SET ${fieldsToUpdate.join(', ')} 
    WHERE id = $${paramIndex}
    RETURNING id, name, email, address, phone, role, created_at, updated_at;
  `;
  values.push(userId);

  try {
    const { rows } = await db.query(updateQuery, values);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé pour la mise à jour.' });
    }
    const { password_hash, ...updatedUser } = rows[0];
    res.status(200).json({ message: 'Profil mis à jour avec succès!', user: updatedUser });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du profil utilisateur ${userId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil.' });
  }
};

// --- Désactiver son propre compte ---
exports.deactivateMyAccount = async (req, res) => {
  const userId = req.user.id;
  console.log(`Backend: Tentative de désactivation pour userId: ${userId}`);

  try {
    const updateQuery = `
      UPDATE users 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND is_active = TRUE 
      RETURNING id, name, email, is_active;`;
      
    const result = await db.query(updateQuery, [userId]);

    if (result.rowCount === 0) {
      const checkUser = await db.query('SELECT id, is_active FROM users WHERE id = $1', [userId]);
      if (checkUser.rows.length > 0 && !checkUser.rows[0].is_active) {
        console.log(`Backend: Compte userId: ${userId} déjà désactivé.`);
        return res.status(200).json({ message: 'Votre compte est déjà désactivé.' });
      }
      console.log(`Backend: Utilisateur userId: ${userId} non trouvé ou déjà inactif pour la mise à jour.`);
      return res.status(404).json({ message: 'Utilisateur non trouvé ou action déjà effectuée.' });
    }
    
    console.log(`Backend: Compte userId: ${userId} désactivé avec succès. Utilisateur retourné:`, result.rows[0]);
    res.status(200).json({ 
      message: 'Votre compte a été désactivé avec succès. Vous allez être déconnecté.',
      user: result.rows[0] 
    });
  } catch (error) {
    console.error(`Backend: Erreur désactivation compte utilisateur ${userId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la désactivation du compte.' });
  }
};

// --- Changer son propre mot de passe ---
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: 'Veuillez fournir le mot de passe actuel, le nouveau mot de passe et la confirmation.' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent du mot de passe actuel.' });
  }

  let userRecord;
  const tableName = userRole === 'admin' || userRole === 'super_admin' ? 'admin' : 'users';

  try {
    const userResult = await db.query(
      `SELECT id, password_hash, email, name FROM ${tableName} WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    userRecord = userResult.rows[0];

    const isCurrentPasswordMatch = await bcrypt.compare(currentPassword, userRecord.password_hash);
    if (!isCurrentPasswordMatch) {
      return res.status(401).json({ message: 'Le mot de passe actuel est incorrect.' });
    }

    const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10');
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatePasswordQuery = `
      UPDATE ${tableName} 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2;
    `;
    await db.query(updatePasswordQuery, [hashedNewPassword, userId]);

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès !' });

    try {
      if (userRecord.email) {
        await sendPasswordChangedEmail(userRecord.email, userRecord.name);
      }
    } catch (emailError) {
      console.error('Erreur envoi email confirmation mot de passe:', emailError);
    }

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe.' });
  }
};

// =============================================================================
// FCM TOKEN - Enregistrer le token de notifications push
// =============================================================================

exports.saveFcmToken = async (req, res) => {
  const userId = req.user.id;
  const { fcmToken, platform, deviceId } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ message: 'Token FCM requis' });
  }

  try {
    const result = await db.query(
      `UPDATE users 
       SET fcm_token = $1, 
           fcm_platform = $2,
           fcm_updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, fcm_token, fcm_platform`,
      [fcmToken, platform || 'unknown', userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    console.log(`✅ Token FCM enregistré pour user ${userId} (${platform}):`, fcmToken);

    res.status(200).json({
      message: 'Token FCM enregistré avec succès',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Erreur enregistrement token FCM:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du token' });
  }
};

// =============================================================================
// FCM TOKEN - Supprimer le token (à la déconnexion)
// =============================================================================

exports.removeFcmToken = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(
      `UPDATE users 
       SET fcm_token = NULL, 
           fcm_platform = NULL,
           fcm_updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    console.log(`🗑️ Token FCM supprimé pour user ${userId}`);
    res.status(200).json({ message: 'Token FCM supprimé' });
  } catch (error) {
    console.error('❌ Erreur suppression token FCM:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
