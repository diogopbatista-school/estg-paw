const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Listar restaurantes do manager
router.get("/manage", isAuthenticated, restaurantController.listRestaurants);

// Abrir um restaurante específico
router.get("/manage/:id", isAuthenticated, restaurantController.getRestaurantDetails);

// Renderizar o formulário de criação de restaurante
router.get("/create", isAuthenticated, restaurantController.renderCreateRestaurantForm);

// Criar um novo restaurante
router.post("/submitRestaurant", isAuthenticated, restaurantController.createRestaurant);

// Renderizar o formulário de edição de restaurante
router.get("/manage/:id/edit", isAuthenticated, restaurantController.showEditRestaurantForm);

// Atualizar um restaurante
router.post("/manage/:id/edit", isAuthenticated, restaurantController.updateRestaurant);

router.post("/delete/:id", isAuthenticated, restaurantController.deleteRestaurant);
module.exports = router;
