// ARTIVA/back_end/routes/authRoutes.js
const express = require("express");
const router = express.Router();

// Import des fonctions depuis authController
const {
  forgotPassword,
  resetPasswordWithCode,
  registerUser,
  loginUser,
  verifyLoginCode,
  registerAdmin,
  loginAdmin,
  googleAuth
} = require("../controllers/authController");

// Routes utilisateurs
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-code", verifyLoginCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithCode);

// Route Google Auth
router.post("/google", googleAuth);  // AJOUTÉ

// Route login admin
router.post("/login-admin", loginAdmin);

// Routes admin
router.post("/register-admin", registerAdmin);

module.exports = router;