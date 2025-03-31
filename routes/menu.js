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

router.get("/restaurants/manage/:restaurantId/menu/create", isAuthenticated, menuController.renderCreateMenuForm);

// Abrir um menu específico
router.get("/restaurants/manage/:restaurantId/menus/:menuId", isAuthenticated, menuController.getMenuDetails);

// Criar um novo menu
router.post("/restaurants/manage/:restaurantId/menus/submitMenu", isAuthenticated, menuController.createMenu);

router.post("/restaurants/manage/:restaurantId/menus/:menuId/delete", menuController.removeMenu);

module.exports = router;
