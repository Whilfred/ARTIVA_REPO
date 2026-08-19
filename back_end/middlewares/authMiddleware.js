// ARTIVA/back_end/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  // 1. Récupérer le token de l'en-tête Authorization
  const authHeader = req.header('Authorization');

  // 2. Vérifier si l'en-tête existe
  if (!authHeader) {
    return res.status(401).json({ message: 'Accès non autorisé. Aucun token fourni.' });
  }

  // 3. Vérifier si le token est au format Bearer
  // L'en-tête devrait être "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return res.status(401).json({ message: 'Accès non autorisé. Format du token invalide.' });
  }
  
  const token = parts[1];

  try {
    // 4. Vérifier et décoder le token
    // process.env.JWT_SECRET est la clé secrète utilisée pour signer le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Ajouter les informations de l'utilisateur décodées à l'objet `req`
    // pour qu'elles soient accessibles dans les prochains gestionnaires de route/contrôleurs
    req.user = decoded; // `decoded` contient le payload (userId, email, role)
    
    // 6. Passer au prochain middleware ou gestionnaire de route
    next();
  } catch (ex) {
    // Si le token n'est pas valide (expiré, malformé, etc.)
    console.error('Erreur de vérification JWT:', ex.message);
    res.status(400).json({ message: 'Token invalide ou expiré.' }); // 400 Bad Request ou 401 Unauthorized
  }
};