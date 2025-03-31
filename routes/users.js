var express = require("express");
var router = express.Router();
const userController = require("../controllers/userController");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Página de registro
router.get("/register", (req, res) => {
  res.render("user/user-register", { formData: {}, error: null });
});

// Processar registro de usuário
router.post("/submitUser", userController.registerUser);

// Página de login
router.get("/login", (req, res) => {
  res.render("user/user-login", { error: null });
});

// Processar login
router.post("/login", userController.loginUser);

// Logout
router.get("/logout", userController.logoutUser);

// Dashboard protegido
router.get("/dashboard", isAuthenticated, userController.getDashboard);

// Página de edição de informações do usuário
router.get("/dashboard/edit", isAuthenticated, userController.getEditPage);

// Processar edição de informações do usuário
router.post("/dashboard/edit", isAuthenticated, userController.updateUser);

module.exports = router;
