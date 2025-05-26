const menuController = require("../../controllers/menuController");
const Restaurant = require("../../models/Restaurant");
const Dish = require("../../models/Dish");
const Menu = require("../../models/Menu");
const validationsController = require("../../controllers/validationsController");

const menuControllerAPI = {};

/**
 * Helper function to get menus with proper error handling
 * @param {Function} menuFetcher - Function that returns a promise resolving to menus
 * @param {Object} res - Express response object
 * @param {String} errorMessage - Custom error message if fetch fails
 */
const getMenusWithErrorHandling = async (menuFetcher, res, errorMessage) => {
  try {
    const menus = await menuFetcher();
    return res.status(200).json(menus);
  } catch (error) {
    console.error(errorMessage, error);
    const message = error.message || errorMessage;

    // If the error is about not finding menus, return 404
    if (message.includes("No menus found") || message.includes("not found") || message.includes("inválido")) {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ message });
  }
};

/**
 * Get a specific menu with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
menuControllerAPI.getMenu = async (req, res) => {
  const menuId = req.params.menuId;
  return getMenusWithErrorHandling(() => validationsController.validateAndFetchById(menuId, Menu, "Menu not found"), res, "Error fetching menu");
};

/**
 * Get all menus from a restaurant with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
menuControllerAPI.getMenusFromRestaurant = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  // Get all query parameters to use as filters
  const filters = { ...req.query, restaurant: restaurantId };

  return getMenusWithErrorHandling(() => menuController.getMenus(filters), res, "Error fetching menus from restaurant");
};

/**
 * Get menu with dishes populated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
menuControllerAPI.getMenuWithDishes = async (req, res) => {
  const menuId = req.params.menuId;

  return getMenusWithErrorHandling(
    async () => {
      // Get menu with validation
      const menu = await validationsController.validateAndFetchById(menuId, Menu, "Menu not found");
      // Populate dishes
      return await menu.populate("dishes");
    },
    res,
    "Error fetching menu with dishes"
  );
};

/**
 * Get all menus from a restaurant with dishes populated for each menu
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
menuControllerAPI.getRestaurantMenusWithDishes = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  return getMenusWithErrorHandling(
    async () => {
      // Validate the restaurant
      const restaurant = await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurant not found");

      // Populate menus and dishes
      await restaurant.populate({
        path: "menus",
        populate: {
          path: "dishes",
          model: "Dish",
        },
      });

      if (!restaurant.menus || restaurant.menus.length === 0) {
        throw new Error("No menus found for this restaurant");
      }

      return restaurant.menus;
    },
    res,
    "Error fetching restaurant menus with dishes"
  );
};

/**
 * Get summary of menus categories with dish count for a restaurant
 * Useful for displaying menu types in the frontend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
menuControllerAPI.getRestaurantMenusSummary = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  return getMenusWithErrorHandling(
    async () => {
      // Validate restaurant first
      await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurant not found");

      // Get menus for this restaurant
      const menus = await menuController.getMenus({ restaurant: restaurantId });

      // Process each menu to get dish categories and counts
      return await Promise.all(
        menus.map(async (menu) => {
          try {
            // Get unique categories for this menu
            const categories = await Dish.distinct("category", { menuId: menu._id });

            // Get dish count per category
            const categoryCount = await Promise.all(
              categories.map(async (category) => {
                const count = await Dish.countDocuments({
                  menuId: menu._id,
                  category,
                });

                return {
                  category,
                  count,
                };
              })
            );

            return {
              _id: menu._id,
              name: menu.name,
              totalPrice: menu.totalPrice,
              dishCount: menu.dishes.length,
              categories: categoryCount,
            };
          } catch (error) {
            console.log(`Error processing menu ${menu._id}:`, error);
            return {
              _id: menu._id,
              name: menu.name,
              totalPrice: menu.totalPrice,
              dishCount: menu.dishes.length,
              categories: [],
            };
          }
        })
      );
    },
    res,
    "Error fetching restaurant menus summary"
  );
};

module.exports = menuControllerAPI;
