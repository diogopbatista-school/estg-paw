const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu"); // Certifique-se de usar "menu" em minúsculasconst Restaurant = require("../models/Restaurant");
const Restaurant = require("../models/Restaurant");

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

router.get("/restaurants/manage/:id/menus", isAuthenticated, async (req, res) => {
  console.log("Entrou na rota de gerenciamento de menus");

  try {
    const restaurantId = req.params.id;

    // Verificar se o restaurante existe
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      // Restaurante não encontrado
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager.toString() !== req.session.user.id) {
      // Caso o manager não seja o usuário autenticado
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Buscar os menus associados ao restaurante
    const menus = await Menu.find({ restaurant: restaurantId });

    // Renderizar a página de gerenciamento de menus
    res.render("menu/menu-dashboard", {
      restaurant, // Passar o restaurante para o template
      menus, // Passar os menus associados ao restaurante
      user: req.session.user, // Passar o usuário logado
    });
  } catch (error) {
    console.error("Erro ao carregar os menus:", error);
    res.status(500).render("error", { message: "Erro ao carregar os menus." });
  }
});

// Abrir um menu específico
router.get("/restaurants/:restaurantId/menus/:menuId", isAuthenticated, async (req, res) => {
  try {
    const { restaurantId, menuId } = req.params;

    // Buscar o menu pelo ID
    const menu = await Menu.findById(menuId).populate("dishes");

    // Verificar se o menu existe e pertence ao restaurante
    if (!menu || menu.restaurant.toString() !== restaurantId) {
      return res.status(404).render("error", { message: "Menu não encontrado." });
    }

    // Renderizar a página do menu
    res.render("menu/menu-details", { menu });
  } catch (error) {
    console.error("Erro ao abrir o menu:", error);
    res.status(500).render("error", { message: "Erro ao abrir o menu." });
  }
});

// Criar um novo menu
router.get("/restaurants/manage/:restaurantId/menus/create", isAuthenticated, async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId);

    // Verificar se o restaurante existe
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Renderizar o formulário de criação de menu
    res.render("menu/menu-create", { restaurant });
  } catch (error) {
    console.error("Erro ao carregar o formulário de criação de menu:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de criação de menu." });
  }
});

// Salvar um novo menu
router.post("/restaurants/manage/:restaurantId/submitMenu", isAuthenticated, async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Criar um novo menu
    const newMenu = new Menu({
      restaurant: restaurantId,
      category: req.body.category,
      dishes: req.body.dishes || [],
    });

    await newMenu.save();

    await Restaurant.findByIdAndUpdate(
      restaurantId,
      { $push: { menus: newMenu._id } }, // Adiciona o ID do menu ao array de menus
      { new: true } // Retorna o documento atualizado
    );

    // Redirecionar para o dashboard de menus
    res.redirect(`/restaurants/manage/${restaurantId}/menus`);
  } catch (error) {
    console.error("Erro ao criar o menu:", error);
    res.status(500).render("error", { message: "Erro ao criar o menu." });
  }
});

module.exports = router;
