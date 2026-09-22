// ARTIVA/back_end/controllers/authController.js
const db = require("../config/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { 
  sendLoginCode, 
  sendResetPasswordCode,
  sendWelcomeEmail,
  sendWouhouGiftEmail,
  sendWelcomeBackEmail,
  sendAdminUserLoginEmail
} = require("../utils/sendEmail.js");
const { sendPushNotification } = require("../services/fcmService");
const { logActivity, EVENT_TYPES } = require("../services/activityLogger");

require('dotenv').config();

// ==========================
// EMAIL ADMIN DE NOTIFICATION (fixe)
// ==========================
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'artiva.app@gmail.com';

// ==========================
// LOGIN ADMIN (sans 2FA)
// ==========================
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  console.log("BODY REÇU :", req.body);
  console.log("EMAIL REÇU :", email);
  console.log("PASSWORD REÇU :", password);

  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  try {
    const adminResult = await db.query("SELECT * FROM admin WHERE email=$1", [email]);
    if (adminResult.rows.length === 0)
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    const admin = adminResult.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password_hash, ...safeAdmin } = admin;

    res.json({ token, admin: safeAdmin, message: "Connexion admin réussie" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ==========================
// UTILITAIRE
// ==========================
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==========================
// NOTIFIER CONNEXION UTILISATEUR
// ==========================
async function notifyUserLogin(userId, userName, userEmail, isFirstLogin) {
  try {
    // 1. Récupérer le token FCM de l'utilisateur
    const userResult = await db.query(
      'SELECT fcm_token FROM users WHERE id = $1',
      [userId]
    );
    const userFcmToken = userResult.rows[0]?.fcm_token;

    // 📝 Logger l'activité de connexion
    try {
      await logActivity({
        userId,
        userName,
        userEmail,
        eventType: EVENT_TYPES.APP_LOGIN,
        title: isFirstLogin ? '🎉 Première connexion' : '👤 Connexion',
        description: `${userName} (${userEmail})`,
        metadata: { isFirstLogin },
      });
    } catch (logErr) {
      console.error('Erreur log app_login:', logErr.message);
    }

    // 2. Push à l'utilisateur
    if (userFcmToken) {
      try {
        await sendPushNotification(userFcmToken, {
          title: isFirstLogin ? '🎉 Bienvenue sur Artiva !' : '👋 Content de vous revoir !',
          body: isFirstLogin
            ? `Ravi de vous accueillir, ${userName} ! Découvrez notre catalogue.`
            : `Bon retour, ${userName} !`,
          data: { screen: 'home' },
        });
        console.log(`📲 Push ${isFirstLogin ? 'bienvenue' : 'bon retour'} envoyée à ${userEmail}`);
      } catch (pushError) {
        console.error(`❌ Erreur push user ${userId}:`, pushError.message);
      }
    } else {
      console.log(`ℹ️ Pas de token FCM pour user ${userId}`);
    }

    // 3. Email à l'utilisateur
    try {
      await sendWelcomeBackEmail(userEmail, userName);
      console.log(`📧 Email de connexion envoyé à ${userEmail}`);
    } catch (emailError) {
      console.error(`❌ Erreur email connexion à ${userEmail}:`, emailError.message);
    }

    // 4. ✅ Notifier UNIQUEMENT artiva.app@gmail.com (email)
    try {
      await sendAdminUserLoginEmail(ADMIN_NOTIFY_EMAIL, {
        name: userName,
        email: userEmail,
        isFirstLogin,
        date: new Date().toISOString(),
      });
      console.log(`📧 Email admin envoyé à ${ADMIN_NOTIFY_EMAIL}`);
    } catch (emailError) {
      console.error(`❌ Erreur email admin ${ADMIN_NOTIFY_EMAIL}:`, emailError.message);
    }

    // 4 bis. Push à artiva.app@gmail.com (si token FCM existe)
    try {
      const notifyUserResult = await db.query(
        'SELECT fcm_token FROM admin WHERE email = $1 AND fcm_token IS NOT NULL',
        [ADMIN_NOTIFY_EMAIL]
      );

      if (notifyUserResult.rows.length > 0) {
        await sendPushNotification(notifyUserResult.rows[0].fcm_token, {
          title: isFirstLogin ? '🎉 Nouvel utilisateur inscrit !' : '👋 Utilisateur connecté',
          body: `${userName} (${userEmail}) vient de se connecter`,
          data: { screen: 'admin' },
        });
        console.log(`📲 Push admin envoyée à ${ADMIN_NOTIFY_EMAIL}`);
      } else {
        console.log(`ℹ️ Pas de token FCM pour ${ADMIN_NOTIFY_EMAIL}`);
      }
    } catch (pushError) {
      console.error(`❌ Erreur push admin ${ADMIN_NOTIFY_EMAIL}:`, pushError.message);
    }

    // 5. Mettre à jour last_login_at
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [userId]
    );

  } catch (error) {
    console.error('❌ Erreur notifyUserLogin:', error.message);
  }
}

// ==========================
// RESET MOT DE PASSE PAR CODE
// ==========================
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email requis" });

  try {
    const userResult = await db.query(
      "SELECT id, email FROM users WHERE email=$1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        message: "Si ce compte existe, un code de réinitialisation a été envoyé."
      });
    }

    const user = userResult.rows[0];
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.query(
      "INSERT INTO password_reset_codes (user_id, code, expires_at) VALUES ($1, $2, $3)",
      [user.id, code, expiresAt]
    );

    await sendResetPasswordCode(user.email, code);

    res.status(200).json({
      message: "Si ce compte existe, un code de réinitialisation a été envoyé."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const resetPasswordWithCode = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword)
    return res.status(400).json({ message: "Email, code et nouveau mot de passe requis." });

  try {
    const userResult = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const user = userResult.rows[0];
    const codeResult = await db.query(
      `SELECT * FROM password_reset_codes
       WHERE user_id=$1 AND code=$2 AND is_used=false AND expires_at > NOW() AT TIME ZONE 'UTC'`,
      [user.id, code]
    );

    if (codeResult.rows.length === 0)
      return res.status(400).json({ message: "Code invalide ou expiré." });

    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.PASSWORD_SALT_ROUNDS || "10"));
    await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hashedPassword, user.id]);
    await db.query("UPDATE password_reset_codes SET is_used=true WHERE id=$1", [codeResult.rows[0].id]);

    res.json({ message: "Mot de passe réinitialisé avec succès." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ==========================
// REGISTER USER
// ==========================
const registerUser = async (req, res) => {
  const { name, email, password, address, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Nom, email et mot de passe requis" });

  try {
    const existingUser = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    if (existingUser.rows.length > 0)
      return res.status(409).json({ message: "Utilisateur déjà existant" });

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.PASSWORD_SALT_ROUNDS || "10"));
    const newUser = await db.query(
      `INSERT INTO users (name, email, password_hash, address, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, address, phone]
    );

    const user = newUser.rows[0];

    // 📝 Logger l'inscription
    try {
      await logActivity({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        eventType: EVENT_TYPES.USER_REGISTER,
        title: `🎊 Nouvelle inscription`,
        description: `${name} (${email})`,
        metadata: { source: 'email' },
      });
    } catch (logErr) {
      console.error('Erreur log user_register:', logErr.message);
    }

    // ✅ ENVOI DES DEUX EMAILS : BIENVENUE + CADEAU WOUHOU
    try {
      await Promise.all([
        sendWelcomeEmail(email, name),
        sendWouhouGiftEmail(email, name)
      ]);
      console.log(`✅ Emails de bienvenue et cadeau envoyés à ${email}`);
    } catch (emailError) {
      console.error(`❌ Erreur envoi des emails à ${email}:`, emailError.message);
    }

    res.status(201).json({
      message: "🎉 Inscription réussie ! Vérifiez vos emails : un cadeau de bienvenue vous attend !",
      user: user
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ==========================
// LOGIN USER (avec 2FA)
// ==========================
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  try {
    let userResult = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    if (userResult.rows.length === 0)
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    // ✅ NOUVEAU : Vérification compte supprimé / bloqué AVANT l'envoi du code 2FA
    if (user.is_deleted) {
      return res.status(403).json({
        message: "Ce compte a été supprimé. Contactez le support.",
        code: "ACCOUNT_DELETED",
      });
    }
    if (user.is_active === false) {
      return res.status(403).json({
        message: "Votre compte a été bloqué. Contactez le support pour plus d'informations.",
        code: "ACCOUNT_BLOCKED",
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.query(
      "INSERT INTO login_codes (user_id, code, expires_at) VALUES ($1,$2,$3)",
      [user.id, code, expiresAt]
    );

    await sendLoginCode(email, code);

    res.status(200).json({ message: "Code envoyé à l'email de l'utilisateur" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ==========================
// VÉRIFICATION CODE 2FA
// ==========================
const verifyLoginCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ message: "Email et code requis" });

  try {
    // ✅ NOUVEAU : on ajoute is_active et is_deleted dans le SELECT
    const userResult = await db.query(
      "SELECT id, email, name, role, last_login_at, is_active, is_deleted FROM users WHERE email=$1",
      [email]
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    const user = userResult.rows[0];

    // ✅ NOUVEAU : Sécurité — vérifier que le compte est toujours actif (au cas où il aurait été bloqué entre les 2 étapes)
    if (user.is_deleted) {
      return res.status(403).json({
        message: "Ce compte a été supprimé.",
        code: "ACCOUNT_DELETED",
      });
    }
    if (user.is_active === false) {
      return res.status(403).json({
        message: "Votre compte a été bloqué.",
        code: "ACCOUNT_BLOCKED",
      });
    }

    const codeClean = code.toString().trim();

    const codeResult = await db.query(
      `SELECT * FROM login_codes
       WHERE user_id=$1 AND TRIM(code)=$2 AND is_used=false AND expires_at > NOW() AT TIME ZONE 'UTC'`,
      [user.id, codeClean]
    );

    if (codeResult.rows.length === 0)
      return res.status(400).json({ message: "Code invalide ou expiré" });

    await db.query("UPDATE login_codes SET is_used=true WHERE id=$1", [codeResult.rows[0].id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isFirstLogin = !user.last_login_at;

    // Répondre IMMÉDIATEMENT
    res.json({ token, user, message: "Connexion validée avec succès" });

    // ✅ En arrière-plan : notifier
    setImmediate(() => {
      notifyUserLogin(user.id, user.name, user.email, isFirstLogin)
        .catch((err) => console.error("Erreur notifyUserLogin:", err));
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ==========================
// REGISTER ADMIN
// ==========================
const registerAdmin = async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  const adminRole = role || "admin";
  if (!["admin", "super_admin"].includes(adminRole))
    return res.status(400).json({ message: "Rôle administrateur invalide" });

  try {
    const existingAdmin = await db.query("SELECT * FROM admin WHERE email=$1", [email]);
    if (existingAdmin.rows.length > 0)
      return res.status(409).json({ message: "Admin déjà existant" });

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.PASSWORD_SALT_ROUNDS || "10"));
    const newAdmin = await db.query(
      "INSERT INTO admin (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
      [email, hashedPassword, adminRole]
    );

    res.status(201).json({ message: "Admin créé", admin: newAdmin.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ==========================
// GOOGLE AUTH
// ==========================
const googleAuth = async (req, res) => {
  const { email, name, googleId, picture } = req.body;

  if (!email || !googleId) {
    return res.status(400).json({
      success: false,
      message: "Email et googleId requis"
    });
  }

  try {
    // ✅ NOUVEAU : ajout de is_deleted dans le SELECT
    let userResult = await db.query(
      `SELECT id, name, email, role, picture, google_id, is_active, is_deleted, created_at, last_login_at 
       FROM users 
       WHERE email = $1 OR google_id = $2`,
      [email, googleId]
    );

    let user;
    let isFirstLogin = false;

    if (userResult.rows.length === 0) {
      const insertResult = await db.query(
        `INSERT INTO users (name, email, google_id, picture, is_email_verified, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, true, 'customer', true, NOW())
         RETURNING id, name, email, role, picture, google_id, is_active, created_at, last_login_at`,
        [name || email.split('@')[0], email, googleId, picture || null]
      );
      user = insertResult.rows[0];
      isFirstLogin = true;
      console.log(`[Google Auth] Nouvel utilisateur créé: ${email}`);

      try {
        await logActivity({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          eventType: EVENT_TYPES.USER_REGISTER,
          title: `🎊 Nouvelle inscription (Google)`,
          description: `${user.name} (${email})`,
          metadata: { source: 'google' },
        });
      } catch (logErr) {
        console.error('Erreur log user_register (Google):', logErr.message);
      }

      try {
        await Promise.all([
          sendWelcomeEmail(email, user.name),
          sendWouhouGiftEmail(email, user.name)
        ]);
        console.log(`✅ Emails de bienvenue et cadeau envoyés à ${email} (Google)`);
      } catch (emailError) {
        console.error(`❌ Erreur envoi des emails à ${email}:`, emailError.message);
      }

    } else {
      // ✅ NOUVEAU : Vérifier compte supprimé / bloqué AVANT de mettre à jour
      const existingUser = userResult.rows[0];
      if (existingUser.is_deleted) {
        return res.status(403).json({
          success: false,
          message: "Ce compte a été supprimé. Contactez le support.",
          code: "ACCOUNT_DELETED",
        });
      }
      if (existingUser.is_active === false) {
        return res.status(403).json({
          success: false,
          message: "Votre compte a été bloqué. Contactez le support pour plus d'informations.",
          code: "ACCOUNT_BLOCKED",
        });
      }

      isFirstLogin = !existingUser.last_login_at;

      const updateResult = await db.query(
        `UPDATE users 
         SET 
           google_id = COALESCE(google_id, $1),
           picture = COALESCE($2, picture),
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, email, role, picture, google_id, is_active, created_at, last_login_at`,
        [googleId, picture || null, existingUser.id]
      );
      user = updateResult.rows[0];
      console.log(`[Google Auth] Utilisateur existant mis à jour: ${email} (1ère connexion: ${isFirstLogin})`);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture || null,
        is_active: user.is_active
      }
    });

    setImmediate(() => {
      notifyUserLogin(user.id, user.name, user.email, isFirstLogin)
        .catch((err) => console.error("Erreur notifyUserLogin (Google):", err));
    });

  } catch (error) {
    console.error("[Google Auth] Erreur:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'authentification Google"
    });
  }
};

// ==========================
// EXPORT MODULE
// ==========================
module.exports = {
  forgotPassword,
  resetPasswordWithCode,
  registerUser,
  loginUser,
  verifyLoginCode,
  registerAdmin,
  loginAdmin,
  googleAuth
};
