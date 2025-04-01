const Menu = require("../models/Menu");
const Dish = require("../models/Dish");
const validationController = require("../controllers/validationsController");

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
      dose: dose, // Validar o nome da dose
      price: validationController.validatePrice(prices[index]), // Validar o preço
    }));

    // Validar os campos de entrada
    validationController.validateString(name);
    validationController.validateString(description);

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
    res.redirect(`/restaurants/manage/${req.params.restaurantId}/menus/${menuId}`);
  } catch (error) {
    console.error("Erro ao criar o prato:", error);
    res.status(500).render("dish/dish-create", {
      restaurantId: req.params.restaurantId,
      menuId: req.params.menuId,
      name: req.body.name,
      description: req.body.description,
      doses: req.body.doses,
      prices: req.body.prices,
      error: error.message || "Erro ao criar o prato.",
    });
  }
};

// Controlador para remover um prato
dishController.removeDish = async (req, res) => {
  try {
    const { restaurantId, menuId, dishId } = req.params;

    // Remover o prato do menu
    await Menu.findByIdAndUpdate(menuId, {
      $pull: { dishes: { dish: dishId } },
    });

    // Remover o prato do banco de dados
    await Dish.findByIdAndDelete(dishId);

    res.redirect(`/restaurants/manage/${restaurantId}/menus/${menuId}`);
  } catch (error) {
    console.error("Erro ao remover o prato:", error);
    res.status(500).render("error", { message: "Erro ao remover o prato." });
  }
};

dishController.renderEditDishForm = async (req, res) => {
  try {
    const { restaurantId, menuId, dishId } = req.params;

    // Buscar o prato pelo ID
    const dish = await Dish.findById(dishId);

    if (!dish) {
      return res.status(404).render("error", { message: "Prato não encontrado." });
    }

    // Renderizar o formulário de edição com os dados do prato
    res.render("dish/dish-edit", {
      restaurantId,
      menuId,
      dishId,
      name: dish.name,
      description: dish.description,
      doses: dish.prices.map((price) => price.dose),
      prices: dish.prices.map((price) => price.price),
      error: null, // Sem erros inicialmente
    });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição do prato:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de edição do prato." });
  }
};

dishController.updateDish = async (req, res) => {
  try {
    const { menuId, dishId } = req.params;
    const { name, description, doses, prices } = req.body;

    // Validar se doses e prices têm o mesmo comprimento
    if (!doses || !prices || doses.length !== prices.length) {
      throw new Error("Doses e preços devem ser fornecidos corretamente.");
    }

    // Validar os campos fornecidos
    const validatedName = validationController.validateString(name);
    const validatedDescription = validationController.validateString(description);

    // Criar o array de preços com base nas doses e preços fornecidos
    const validatedPrices = doses.map((dose, index) => ({
      dose: validationController.validateString(dose),
      price: validationController.validateNumber(prices[index]),
    }));

    // Atualizar o prato no banco de dados
    const updatedDish = await Dish.findByIdAndUpdate(
      dishId,
      {
        name: validatedName,
        description: validatedDescription,
        prices: validatedPrices,
      },
      { new: true }
    );

    if (!updatedDish) {
      throw new Error("Prato não encontrado.");
    }

    // Redirecionar para a página do menu
    res.redirect(`/restaurants/manage/${req.params.restaurantId}/menus/${menuId}`);
  } catch (error) {
    console.error("Erro ao atualizar o prato:", error);
    res.status(400).render("dish/dish-edit", {
      restaurantId: req.params.restaurantId,
      menuId,
      dishId,
      name: req.body.name,
      description: req.body.description,
      doses: req.body.doses,
      prices: req.body.prices,
      error: error.message || "Erro ao atualizar o prato.",
    });
  }
};

module.exports = dishController;
