const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Middleware para verificar se o usuário é administrador
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.redirect("/users/login");
}

// Rota para exibir o painel de administrador
router.get("/dashboard", isAdmin, adminController.getAdminPanel);

// Rota para alternar a validação de um restaurante
router.get("/toggle-validation/:id", isAdmin, adminController.toggleValidation);

// Rota para exibir o formulário de edição de um usuário
router.get("/edit-user/:id", isAdmin, adminController.showEditUserForm);

// Rota para processar a edição de um usuário
router.post("/edit-user/:id", isAdmin, adminController.updateUser);

// Rota para apagar um restaurante
router.get("/delete-restaurant/:id", isAdmin, adminController.deleteRestaurant);

// Rota para apagar um usuário
router.get("/delete-user/:id", isAdmin, adminController.deleteUser);

module.exports = router;
