// ARTIVA/back_end/controllers/userController.js
const db = require('../config/db');
// bcrypt sera nécessaire si on permet à l'admin de réinitialiser un mot de passe (non recommandé directement)
const bcrypt = require('bcryptjs'); 

// --- Récupérer le profil de l'utilisateur actuellement connecté ---
exports.getCurrentUserProfile = async (req, res) => {
  // ... (ton code existant, qui fonctionne)
  try {
    const userId = req.user.id; 
    const userRole = req.user.role;
    let queryText;
    if (userRole === 'admin' || userRole === 'super_admin') { // L'admin peut aussi voir son profil via cette route
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

// --- NOUVEAU (Admin) : Lister tous les utilisateurs (clients) ---
exports.getAllUsers = async (req, res) => {
  try {
    // Sélectionne uniquement les clients (ou tous les utilisateurs sauf les admins si tu les as dans la même table)
    // Exclure les mots de passe hashés !
    const query = `
      SELECT id, name, email, address, phone, role, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC; 
      -- Tu pourrais ajouter une clause WHERE pour exclure certains rôles si nécessaire
      -- WHERE role = 'customer' OR role = 'vendor' etc.
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération de tous les utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
  }
};

// --- NOUVEAU (Admin) : Récupérer un utilisateur spécifique par son ID ---
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT id, name, email, address, phone, role, created_at, updated_at 
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

// --- NOUVEAU (Admin) : Mettre à jour un utilisateur (ex: rôle, adresse, téléphone, is_active) ---
exports.updateUserByAdmin = async (req, res) => {
  const { id } = req.params; // ID de l'utilisateur à mettre à jour
  const { name, email, address, phone, role, is_active } = req.body; // Champs modifiables par l'admin, y compris is_active

  // Validation : Au moins un champ doit être fourni pour la mise à jour
  if (name === undefined && email === undefined && address === undefined && phone === undefined && role === undefined && is_active === undefined) {
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
    // Valider le rôle si tu as une liste de rôles permis
    if (!['customer', 'vendor', /* autres rôles valides */].includes(role)) {
        return res.status(400).json({ message: 'Rôle utilisateur invalide.' });
    }
    fieldsToUpdate.push(`role = $${paramIndex++}`); values.push(role); 
  }
  // Ajout : Gérer le champ is_active
  if (is_active !== undefined) {
    fieldsToUpdate.push(`is_active = $${paramIndex++}`);
    values.push(is_active); // Pas de validation ici, on suppose que c'est un booléen
  }

  if (fieldsToUpdate.length === 0) { // Devrait être attrapé par la validation précédente, mais par sécurité
    return res.status(400).json({ message: 'Aucun champ valide fourni pour la mise à jour.' });
  }

  fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`); // Toujours mettre à jour updated_at

  const updateQuery = `
    UPDATE users 
    SET ${fieldsToUpdate.join(', ')} 
    WHERE id = $${paramIndex}
    RETURNING id, name, email, address, phone, role, is_active, created_at, updated_at;
  `;
  values.push(id);

  try {
    // Vérifier si l'email (s'il est modifié) n'est pas déjà pris par un AUTRE utilisateur
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
    if (error.code === '23505') { // Conflit d'unicité (probablement email)
        return res.status(409).json({ message: 'Conflit de données (ex: email déjà existant).', detail: error.detail });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur.' });
  }
};

// --- NOUVEAU (Admin) : Supprimer un utilisateur (CLIENT) ---
// Attention: Réfléchis bien aux implications (commandes associées, etc.)
// ON DELETE SET NULL sur user_id dans orders est une bonne approche.
exports.deleteUserByAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // Vérifier que l'on ne supprime pas un admin via cette route par erreur
    const userCheck = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length > 0 && (userCheck.rows[0].role === 'admin' || userCheck.rows[0].role === 'super_admin')) {
        // Si tes admins sont aussi dans la table 'users'
        // return res.status(403).json({ message: 'Les administrateurs ne peuvent pas être supprimés via cette route.' });
    }

    const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role;';
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé pour la suppression.' });
    }
    res.status(200).json({ message: 'Utilisateur supprimé avec succès.', user: result.rows[0] });
  } catch (error) {
    console.error(`Erreur lors de la suppression de l'utilisateur ${id}:`, error);
    // Gérer les erreurs de clé étrangère si ON DELETE RESTRICT est utilisé ailleurs
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur.' });
  }
};

// NOUVEAU : Mettre à jour le profil de l'utilisateur actuellement connecté (CLIENT)
exports.updateMyProfile = async (req, res) => {
  const userId = req.user.id; // De authMiddleware
  const { name, address, phone, current_password, new_password } = req.body; 
  // On pourrait aussi permettre de changer l'email, mais c'est plus sensible (vérification)

  // Champs modifiables par l'utilisateur lui-même.
  // Ne pas permettre de changer le rôle ici.
  const fieldsToUpdate = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) { fieldsToUpdate.push(`name = $${paramIndex++}`); values.push(name.trim() === '' ? null : name); }
  if (address !== undefined) { fieldsToUpdate.push(`address = $${paramIndex++}`); values.push(address.trim() === '' ? null : address); }
  if (phone !== undefined) { fieldsToUpdate.push(`phone = $${paramIndex++}`); values.push(phone.trim() === '' ? null : phone); }

  // Logique de changement de mot de passe (optionnel ici, peut être une route dédiée)
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
      // Valider la force du nouveau mot de passe ici si besoin
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
    // Si l'email est modifiable, ajouter la vérification d'unicité ici
    const { rows } = await db.query(updateQuery, values);
    if (rows.length === 0) { // Ne devrait pas arriver si le token est valide
      return res.status(404).json({ message: 'Utilisateur non trouvé pour la mise à jour.' });
    }
    // Renvoyer l'utilisateur mis à jour (sans le hash du mot de passe)
    const { password_hash, ...updatedUser } = rows[0];
    res.status(200).json({ message: 'Profil mis à jour avec succès!', user: updatedUser });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du profil utilisateur ${userId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil.' });
  }
};

exports.deactivateMyAccount = async (req, res) => {
  const userId = req.user.id; // Récupéré du token JWT
  console.log(`Backend: Tentative de désactivation pour userId: ${userId}`); // LOG

  try {
    // S'assurer que la table 'users' a 'is_active' et 'updated_at'
    const updateQuery = `
      UPDATE users 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND is_active = TRUE 
      RETURNING id, name, email, is_active;`; // Retourner plus d'infos peut être utile
      
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
// AJOUTER CETTE FONCTION DANS userController.js si elle manque :
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role; // Pour savoir quelle table interroger (users ou admin)
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
  let tableName = userRole === 'admin' || userRole === 'super_admin' ? 'admin' : 'users';

  try {
    const userResult = await db.query(`SELECT id, password_hash FROM ${tableName} WHERE id = $1`, [userId]);
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

    // Assure-toi que tes tables users et admin ont bien updated_at
    const updatePasswordQuery = `
      UPDATE ${tableName} 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2;
    `;
    await db.query(updatePasswordQuery, [hashedNewPassword, userId]);

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès !' });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe.' });
  }
};
