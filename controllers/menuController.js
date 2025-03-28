const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");

// Exibir o formulário de criação de menu
exports.showCreateMenuForm = async (req, res) => {
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
};

module.exports = menuController;
