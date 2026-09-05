// ARTIVA/back_end/controllers/authController.js
const db = require("../config/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { 
  sendLoginCode, 
  sendResetPasswordCode,
  sendWelcomeEmail,
  sendWouhouGiftEmail 
} = require("../utils/sendEmail.js");
require('dotenv').config();

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
    const userResult = await db.query("SELECT id, email, name, role FROM users WHERE email=$1", [email]);
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    const user = userResult.rows[0];
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

    res.json({ token, user, message: "Connexion validée avec succès" });
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
    let userResult = await db.query(
      `SELECT id, name, email, role, picture, google_id, is_active, created_at 
       FROM users 
       WHERE email = $1 OR google_id = $2`,
      [email, googleId]
    );

    let user;

    if (userResult.rows.length === 0) {
      const insertResult = await db.query(
        `INSERT INTO users (name, email, google_id, picture, is_email_verified, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, true, 'customer', true, NOW())
         RETURNING id, name, email, role, picture, google_id, is_active, created_at`,
        [name || email.split('@')[0], email, googleId, picture || null]
      );
      user = insertResult.rows[0];
      console.log(`[Google Auth] Nouvel utilisateur créé: ${email}`);

      // ✅ Envoyer les emails de bienvenue et cadeau pour les inscriptions Google
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
      const updateResult = await db.query(
        `UPDATE users 
         SET 
           google_id = COALESCE(google_id, $1),
           picture = COALESCE($2, picture),
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, email, role, picture, google_id, is_active, created_at`,
        [googleId, picture || null, userResult.rows[0].id]
      );
      user = updateResult.rows[0];
      console.log(`[Google Auth] Utilisateur existant mis à jour: ${email}`);
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
