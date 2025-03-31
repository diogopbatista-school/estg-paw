const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Listar menus de um restaurante
router.get("/restaurants/manage/:id/menus", isAuthenticated, menuController.listMenus);

// Abrir um menu específico
router.get("/restaurants/manage/:restaurantId/menus/:menuId", isAuthenticated, menuController.getMenuDetails);

// Renderizar o formulário de criação de menu
router.get("/restaurants/manage/:restaurantId/menus/create", isAuthenticated, menuController.renderCreateMenuForm);

// Criar um novo menu
router.post("/restaurants/manage/:restaurantId/submitMenu", isAuthenticated, menuController.createMenu);

module.exports = router;
