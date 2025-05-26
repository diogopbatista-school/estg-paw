const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
const Dish = require("../models/Dish");
const mongoose = require("mongoose");

const validationsController = require("../controllers/validationsController");
const acessController = require("../controllers/acessController");

const menuController = {};

/**
 * Counts the number of Menu documents based on given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Number>} Number of matching menu documents.
 */
menuController.countDocuments = (criteria = {}) => {
  return Menu.countDocuments(criteria).exec();
};

/**
 * Retrieves all menus matching the given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Array>} Array of Menu documents.
 * @throws {Error} When no menus are found.
 */
menuController.getMenus = async (criteria = {}) => {
  const menus = await Menu.find(criteria).exec();
  if (!menus || menus.length === 0) {
    throw new Error("No menus found.");
  }
  return menus;
};

/**
 * Retrieves a single menu matching the given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Object>} A Menu document.
 * @throws {Error} When no menu is found.
 */
menuController.getMenu = async (criteria = {}) => {
  const menu = await Menu.findOne(criteria).exec();
  if (!menu) {
    throw new Error("Menu not found.");
  }
  return menu;
};

/**
 * Creates a new menu and associates it with a restaurant.
 * Calculates the total price of dishes in the menu.
 * @param {Object} menuData - Data for the new menu.
 * @returns {Promise<Object>} The created Menu document.
 */
menuController.createMenu = async (menuData) => {
  try {
    let menu = new Menu(menuData);
    await menu.save();

    // Associar o menu ao restaurante e somar o totalPrice ao total_price_menus
    await Restaurant.findByIdAndUpdate(menuData.restaurant, {
      $push: { menus: menu._id },
    });

    const dishes = await Dish.find({ menuId: menu._id });
    const totalPrice = dishes.reduce((sum, dish) => sum + dish.prices.reduce((pSum, p) => pSum + p.price, 0), 0);
    await Menu.findByIdAndUpdate(menu._id, { totalPrice });

    return menu;
  } catch (err) {
    throw new Error("Erro ao criar o menu: " + err.message);
  }
};

/**
 * Deletes a menu and its associated dishes.
 * Updates the restaurant's menu list and total price.
 * @param {String} menuId - ID of the menu to delete.
 * @throws Will throw an error if the menu ID is invalid or not found.
 */
menuController.deleteMenu = async (menuId) => {
  try {
    if (!menuId) {
      throw new Error("Menu ID é obrigatório.");
    }

    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return res.status(400).send("ID inválido.");
    }

    // Busca o menu pelo ID
    const menu = await Menu.findById(menuId);
    if (!menu) {
      throw new Error("Menu não encontrado.");
    }

    const restaurantId = menu.restaurant; // ID do restaurante associado ao menu

    // Apaga todos os pratos associados ao menu
    await Dish.deleteMany({ menuId: menuId });

    // Remove o ID do menu do array `menus` no restaurante associado e subtrai o totalPrice
    await Restaurant.findByIdAndUpdate(
      restaurantId,
      {
        $pull: { menus: menuId }, // Remove o ID do menu do array `menus`
        $inc: { total_price_menus: -menu.totalPrice }, // Subtrai o totalPrice do total_price_menus
      },
      { new: true }
    );

    // Apaga o menu
    await Menu.findByIdAndDelete(menuId);

    console.log(`Menu ${menuId} e seus pratos associados foram apagados com sucesso.`);
  } catch (error) {
    console.error("Erro ao apagar o menu:", error);
    throw new Error("Erro ao apagar o menu: " + error.message);
  }
};

/**
 * Renders the form for editing a menu.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
menuController.renderEditMenuForm = async (req, res) => {
  try {
    const { id: menuId } = req.params; // ID do menu a ser editado

    const menu = await validationsController.validateAndFetchById(menuId, Menu, "Menu não encontrado.");

    const restaurant = await validationsController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.");

    let restaurantId = restaurant._id; // ID do restaurante associado ao menu

    res.render("menu/edit", { menu, restaurantId, error: null });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição do menu:", error);
    res.status(500).send("Erro ao carregar o formulário de edição do menu.");
  }
};

/**
 * Updates an existing menu with new data.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
menuController.postEditMenu = async (req, res) => {
  try {
    const { id: menuId } = req.params; // ID do menu a ser editado
    const { name } = req.body; // Novos dados do menu

    const menu = await validationsController.validateAndFetchById(menuId, Menu, "Menu não encontrado.");

    const restaurant = await validationsController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.");

    if (!name) {
      return res.status(400).send("Nome é obrigatório.");
    }

    validationsController.validateString(name);
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new Error("ID do menu inválido.");
    }

    // Atualiza o menu com os novos dados
    await Menu.findByIdAndUpdate(menuId, {
      name: validationsController.validateString(name),
    });

    // ID do restaurante associado ao menu

    res.redirect(`/restaurants/dashboard/${restaurant._id}`);
  } catch (error) {
    console.error("Erro ao editar o menu:", error);
    res.status(500).send("Erro ao editar o menu.");
  }
};

/**
 * Handles the deletion of a menu via a request.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
menuController.deleteMenuHandler = async (req, res) => {
  try {
    const { idMenu: menuId } = req.params; // ID do menu a ser apagado

    // Busca o menu pelo ID
    const menu = await validationsController.validateAndFetchById(menuId, Menu, "Menu não encontrado.");

    const restaurant = await validationsController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.");

    // Apaga o menu usando o método deleteMenu
    await menuController.deleteMenu(menuId);

    // Redireciona para o dashboard do restaurante
    res.redirect(`/restaurants/dashboard/${restaurant._id}`);
  } catch (error) {
    console.error("Erro ao apagar o menu:", error);
    res.status(500).send("Erro ao apagar o menu.");
  }
};

/**
 * Renders the form for creating a new menu.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
menuController.renderCreateMenuForm = async (req, res) => {
  try {
    const { idRestaurant: restaurantId } = req.params;

    await validationsController.validateEntityAndAccess(restaurantId, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.");

    res.render("menu/register", { restaurantId, error: null });
  } catch (error) {
    console.error("Erro ao validar acesso:", error.message);
    const errorMessage = error.message || "Erro";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.idRestaurant}#menu-section`,
    });
  }
};

/**
 * Handles the creation of a new menu via POST request.
 * Validates input and associates the menu with a restaurant.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
menuController.postCreateMenu = async (req, res) => {
  try {
    const { name, restaurantId } = req.body;

    if (!name || !restaurantId) {
      return res.status(400).render("menu/register", {
        restaurantId,
        error: "Categoria e ID do restaurante são obrigatórios.",
      });
    }

    validationsController.validateString(name);

    await validationsController.validateEntityAndAccess(restaurantId, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.");

    await menuController.createMenu({
      name: validationsController.validateString(name),
      restaurant: restaurantId,
    });

    res.redirect(`/restaurants/dashboard/${restaurantId}`);
  } catch (error) {
    console.error("Erro ao validar acesso:", error.message);
    const errorMessage = error.message || "Erro";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.idRestaurant}#menu-section`,
    });
  }
};

module.exports = menuController;
