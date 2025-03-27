var express = require("express");
var router = express.Router();
const User = require("../models/User");
const restaurantController = require("../controllers/restaurantController");
const Restaurant = require("../models/Restaurant");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Listar restaurantes do manager
router.get("/manage", isAuthenticated, async (req, res) => {
  try {
    // Verificar se o usuário é um manager
    if (req.session.user.role !== "manager") {
      return res.status(403).send("Acesso negado. Apenas managers podem acessar esta página.");
    }

    // Buscar os restaurantes associados ao manager
    const manager = await User.findById(req.session.user.id).populate("restaurants");

    // Renderizar a página com os restaurantes e o usuário
    res.render("manager-dashboard", {
      user: req.session.user, // Passa o objeto user para o template
      restaurants: manager.restaurants || [],
      error: null, // Define error como null
    });
  } catch (error) {
    console.error("Erro ao carregar o painel do manager:", error);
    res.render("manager-dashboard", {
      user: req.session.user,
      restaurants: [],
      error: "Erro ao carregar o painel do manager.",
    });
  }
});

router.get("/manage/:id", isAuthenticated, async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId).populate("manager");

    console.log("Restaurante encontrado:", restaurant);

    // Verificar se o restaurante existe
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager._id.toString() !== req.session.user.id) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Renderizar a página do restaurante
    res.render("restaurant-dashboard", { restaurant });
  } catch (error) {
    console.error("Erro ao abrir o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao abrir o restaurante." });
  }
});

router.get("/create", isAuthenticated, (req, res) => {
  res.render("restaurant-create", { error: null });
});

router.post("/submitRestaurant", isAuthenticated, restaurantController.createRestaurant);

module.exports = router;
