const acessController = {};

/**
 * Checks if a user has access to a restaurant.
 * @param {Object} user - The user object.
 * @param {Object} restaurant - The restaurant object.
 * @returns {Boolean} True if the user has access, false otherwise.
 */
acessController.hasAccess = (user, restaurant) => {
  // Verifica se o utilizador é o gerente do restaurante ou tem papel de admin/superAdmin
  return String(restaurant.manager) === String(user._id) || user.role === "admin" || user.role === "superAdmin";
};

/**
 * Checks if the user is an administrator (admin or superAdmin).
 * @param {Object} user - The user object.
 * @returns {Boolean} True if the user is an admin or superAdmin, false otherwise.
 */
acessController.isAdmin = (user) => {
  return user && (user.role === "admin" || user.role === "superAdmin");
};

/**
 * Checks if the user is a superAdmin.
 * @param {Object} user - The user object.
 * @returns {Boolean} True if the user is a superAdmin, false otherwise.
 */
acessController.isSuperAdmin = (user) => {
  return user && user.role === "superAdmin";
};

/**
 * Checks if the current user can edit the specified user profile.
 * @param {Object} currentUser - The user making the request.
 * @param {String} targetUserId - The ID of the user being edited.
 * @returns {Boolean} True if the current user can edit the target user, false otherwise.
 */
acessController.canEditUser = (currentUser, targetUserId) => {
  return currentUser._id.toString() === targetUserId.toString() || currentUser.role === "admin" || currentUser.role === "superAdmin";
};

/**
 * Middleware to ensure the user is authenticated.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
acessController.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/user/login");
};

/**
 * Middleware to ensure the user has admin privileges.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
acessController.ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === "admin" || req.user.role === "superAdmin")) {
    return next();
  }
  res.status(403).render("error", { message: "Acesso negado. Apenas administradores podem acessar esta página." });
};

/**
 * Middleware to ensure the user can manage the specified user profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
acessController.canManageUser = (req, res, next) => {
  const targetUserId = req.params.userId;

  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }

  if (req.user._id.toString() === targetUserId || req.user.role === "admin" || req.user.role === "superAdmin") {
    return next();
  }

  res.status(403).render("error", { message: "Acesso negado. Você não tem permissão para modificar este utilizador." });
};

module.exports = acessController;
