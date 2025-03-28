var express = require("express");
var router = express.Router();
const User = require("../models/User");
const restaurantController = require("../controllers/restaurantController");
const Restaurant = require("../models/Restaurant");
const Menu = require("../models/Menu");
const Dish = require("../models/Dish");

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

    // Extrair filtros de pesquisa da query string
    const searchFilters = {
      name: req.query.name || "",
      description: req.query.description || "",
      location: req.query.location || "",
      phone: req.query.phone || "",
    };

    // Buscar os restaurantes associados ao manager
    const manager = await User.findById(req.session.user.id).populate({
      path: "restaurants",
      match: {
        ...(searchFilters.name && { name: { $regex: searchFilters.name, $options: "i" } }),
        ...(searchFilters.description && { description: { $regex: searchFilters.description, $options: "i" } }),
        ...(searchFilters.location && {
          "location.latitude": { $regex: searchFilters.location, $options: "i" },
        }),
        ...(searchFilters.phone && { phone: { $regex: searchFilters.phone, $options: "i" } }),
      },
    });

    // Renderizar a página com os restaurantes filtrados
    res.render("user/manager-dashboard", {
      user: req.session.user,
      restaurants: manager.restaurants || [],
      searchFilters,
      error: null,
    });
  } catch (error) {
    console.error("Erro ao carregar o painel do manager:", error);
    res.render("user/manager-dashboard", {
      user: req.session.user,
      restaurants: [],
      searchFilters: {}, // Passa um objeto vazio para evitar erros no template
      error: "Erro ao carregar o painel do manager.",
    });
  }
});

router.get("/manage/:id", isAuthenticated, async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId).populate("manager");

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager._id.toString() !== req.session.user.id) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Buscar os menus associados ao restaurante e popular os pratos
    const menus = await Menu.find({ restaurant: restaurantId });
    console.log("Menus:", menus); // Adicione este log para depuração

    // Renderizar a página do restaurante com os menus e pratos
    res.render("restaurant/restaurant-dashboard", { restaurant, menus });
  } catch (error) {
    console.error("Erro ao abrir o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao abrir o restaurante." });
  }
});

router.get("/create", isAuthenticated, (req, res) => {
  res.render("restaurant/restaurant-create", { error: null });
});

router.post("/submitRestaurant", isAuthenticated, restaurantController.createRestaurant);

router.get("/manage/:id/edit", isAuthenticated, restaurantController.showEditRestaurantForm);

router.post("/manage/:id/edit", isAuthenticated, restaurantController.updateRestaurant);

module.exports = router;
