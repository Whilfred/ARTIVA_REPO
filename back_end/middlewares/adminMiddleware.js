// ARTIVA/back_end/middlewares/adminMiddleware.js
module.exports = function (req, res, next) {
  // req.user devrait avoir été défini par le authMiddleware précédent
  if (!req.user) {
    // Ce cas ne devrait pas arriver si authMiddleware est utilisé avant
    return res.status(401).json({ message: 'Accès non autorisé. Utilisateur non authentifié.' });
  }

  // Vérifier si le rôle de l'utilisateur est 'admin' (ou 'super_admin' si tu l'utilises)
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Accès refusé. Permissions administrateur requises.' }); // 403 Forbidden
  }

  // Si l'utilisateur est un admin, passer au prochain middleware ou gestionnaire de route
  next();
};