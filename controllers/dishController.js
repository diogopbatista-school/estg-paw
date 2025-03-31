const Menu = require("../models/Menu");
const Dish = require("../models/Dish");

// Controlador para criar um prato
dishController.createDish = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { name, description, priceSmall, priceMedium, priceLarge } = req.body;

    // Criar o prato no banco de dados
    const newDish = await Dish.create({
      name,
      description,
    });

    // Adicionar o prato ao menu com os preços
    await Menu.findByIdAndUpdate(menuId, {
      $push: {
        dishes: {
          dish: newDish._id,
          price: {
            small: priceSmall || null,
            medium: priceMedium,
            large: priceLarge || null,
          },
        },
      },
    });

    res.redirect(`/restaurants/manage/${req.params.restaurantId}/menus/${menuId}`);
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
