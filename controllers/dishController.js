const Menu = require("../models/Menu");
const Dish = require("../models/Dish");

dishController = {};

dishController.renderCreateDishForm = (req, res) => {
  try {
    const { restaurantId, menuId } = req.params;

    // Renderizar o formulário de criação de prato
    res.render("dish/dish-create", {
      restaurantId,
      menuId,
      name: "", // Valor inicial vazio
      description: "", // Valor inicial vazio
      doses: [], // Valor inicial vazio
      prices: [], // Valor inicial vazio
      error: null, // Sem erros inicialmente
    });
  } catch (error) {
    console.error("Erro ao carregar o formulário de criação de prato:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de criação de prato." });
  }
};

// Controlador para criar um prato
dishController.createDish = async (req, res) => {
  try {
    const { menuId, restaurantId } = req.params;
    const { name, description, doses, prices } = req.body;

    console.log("Dados recebidos no req.body:", req.body);

    console.log("Doses:", doses);
    console.log("Prices:", prices);

    // Validar se doses e prices têm o mesmo comprimento
    if (!doses || !prices || doses.length !== prices.length) {
      return res.status(400).render("dish/dish-create", {
        restaurantId,
        menuId,
        name,
        description,
        doses,
        prices,
        error: "Doses e preços devem ser fornecidos corretamente.",
      });
    }

    // Criar o array de preços com base nas doses e preços fornecidos
    const dishPrices = doses.map((dose, index) => ({
      dose,
      price: parseFloat(prices[index]),
    }));

    // Criar o prato no banco de dados
    const newDish = await Dish.create({
      name,
      description,
      menuId: menuId,
      prices: dishPrices,
    });

    // Adicionar o prato ao menu
    await Menu.findByIdAndUpdate(menuId, {
      $push: { dishes: newDish._id },
    });

    // Redirecionar para a página do menu
    res.redirect(`/restaurants/manage/${req.params.restaurantId}/menus`);
  } catch (error) {
    console.error("Erro ao criar o prato:", error);
    res.status(500).render("error", { message: "Erro ao criar o prato." });
  }
};

// Controlador para remover um prato
dishController.removeDish = async (req, res) => {
  try {
    const { menuId, dishId } = req.params;

    // Remover o prato do menu
    await Menu.findByIdAndUpdate(menuId, {
      $pull: { dishes: { dish: dishId } },
    });

    // Remover o prato do banco de dados
    await Dish.findByIdAndDelete(dishId);

    res.redirect(`/restaurants/manage/${req.params.restaurantId}/menus/${menuId}`);
  } catch (error) {
    console.error("Erro ao remover o prato:", error);
    res.status(500).render("error", { message: "Erro ao remover o prato." });
  }
};

module.exports = dishController;
