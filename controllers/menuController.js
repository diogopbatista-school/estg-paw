const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
const Dish = require("../models/Dish");

const menuController = {};

// Middleware para verificar autenticação
menuController.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
};

// Controlador para listar menus de um restaurante
menuController.listMenus = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Verificar se o restaurante existe
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager.toString() !== req.session.user.id) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Buscar os menus associados ao restaurante
    const menus = await Menu.find({ restaurant: restaurantId });

    // Renderizar a página de gerenciamento de menus
    res.render("menu/menus-dashboard", {
      restaurant,
      menus,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Erro ao carregar os menus:", error);
    res.status(500).render("error", { message: "Erro ao carregar os menus." });
  }
};

// Controlador para abrir um menu específico
menuController.getMenuDetails = async (req, res) => {
  try {
    const { restaurantId, menuId } = req.params;

    // Buscar o menu pelo ID e popular os pratos
    const menu = await Menu.findById(menuId).populate("dishes.dish");

    if (!menu) {
      return res.status(404).render("error", { message: "Menu não encontrado." });
    }

    // Renderizar a página do menu com os pratos
    res.render("menu/menu-details", { menu, restaurantId });
  } catch (error) {
    console.error("Erro ao abrir o menu:", error);
    res.status(500).render("error", { message: "Erro ao abrir o menu." });
  }
};

// Controlador para renderizar o formulário de criação de menu
menuController.renderCreateMenuForm = async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Renderizar o formulário de criação de menu
    res.render("menu/menu-create", { restaurant });
  } catch (error) {
    console.error("Erro ao carregar o formulário de criação de menu:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de criação de menu." });
  }
};

// Controlador para criar um novo menu
menuController.createMenu = async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Criar um novo menu
    const newMenu = new Menu({
      restaurant: restaurantId,
      category: req.body.category,
      dishes: req.body.dishes || [],
    });

    await newMenu.save();

    // Adicionar o menu ao restaurante
    await Restaurant.findByIdAndUpdate(restaurantId, { $push: { menus: newMenu._id } }, { new: true });

    // Redirecionar para o dashboard de menus
    res.redirect(`/restaurants/manage/${restaurantId}/menus`);
  } catch (error) {
    console.error("Erro ao criar o menu:", error);
    res.status(500).render("error", { message: "Erro ao criar o menu." });
  }
};

module.exports = menuController;
