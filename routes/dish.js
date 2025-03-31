const express = require("express");
const router = express.Router();
const dishController = require("../controllers/dishController");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Rota para renderizar o formulário de criação de prato
router.get("/restaurants/manage/:restaurantId/menus/:menuId/dishes/create", isAuthenticated, dishController.renderCreateDishForm);

// Rota para criar um prato
router.post("/restaurants/manage/:restaurantId/menus/:menuId/dishes/submitDish", isAuthenticated, dishController.createDish);
// Rota para remover um prato
router.post("/restaurants/manage/:restaurantId/menus/:menuId/dishes/:dishId/delete", isAuthenticated, dishController.removeDish);

module.exports = router;
