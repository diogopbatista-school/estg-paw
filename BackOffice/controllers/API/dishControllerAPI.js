const dishController = require("../../controllers/dishController");
const menuController = require("../../controllers/menuController");
const Dish = require("../../models/Dish");
const nutritionService = require("../../services/nutritionService");

const dishControllerAPI = {};

/**
 * Helper function to get dishes with proper error handling
 * @param {Function} dishFetcher - Function that returns a promise resolving to dishes
 * @param {Object} res - Express response object
 * @param {String} errorMessage - Custom error message if fetch fails
 */
const getDishesWithErrorHandling = async (dishFetcher, res, errorMessage) => {
  try {
    const dishes = await dishFetcher();
    return res.status(200).json(dishes);
  } catch (error) {
    console.error(errorMessage, error);
    const message = error.message || errorMessage;

    // If the error is about not finding dishes, return 404
    if (message.includes("No dishes found") || message.includes("not found")) {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ message });
  }
};

/**
 * Generic function to get dishes from a specific menu with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
dishControllerAPI.getDishesFromMenu = async (req, res) => {
  const menuId = req.params.menuId;

  // Get all query parameters except menuId to use as filters
  const filters = { ...req.query };

  // Build criteria object with menuId and any additional filters
  const criteria = { MenuId: menuId };

  // Apply any additional filters from query parameters
  Object.keys(filters).forEach((key) => {
    if (filters[key]) {
      criteria[key] = filters[key];
    }
  });

  return getDishesWithErrorHandling(() => dishController.getDishes(criteria), res, "Error fetching dishes from menu");
};

/**
 * Helper function to get dishes from all menus of a restaurant with filters
 * @param {String} restaurantId - Restaurant ID
 * @param {Object} additionalFilters - Additional criteria for dish filtering
 * @returns {Promise<Array>} Array of dishes
 */
const getDishesFromAllRestaurantMenus = async (restaurantId, additionalFilters = {}) => {
  const menus = await menuController.getMenus({ RestaurantId: restaurantId });

  // Initialize dishes as an array to collect all dishes
  let allDishes = [];

  // Collect dishes from all menus in parallel
  await Promise.all(
    menus.map(async (menu) => {
      try {
        const criteria = { MenuId: menu._id, ...additionalFilters };
        const menuDishes = await dishController.getDishes(criteria);
        allDishes = allDishes.concat(menuDishes);
      } catch (error) {
        // Skip this menu if there's an error (e.g., no dishes found)
        console.log(`Skipping menu ${menu._id}: ${error.message}`);
      }
    })
  );

  if (allDishes.length === 0) {
    throw new Error("No dishes found in any menu");
  }

  return allDishes;
};

/**
 * Generic function to get all dishes from a restaurant with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
dishControllerAPI.getDishesFromRestaurant = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  // Get all query parameters except restaurantId to use as filters
  const filters = { ...req.query };

  return getDishesWithErrorHandling(() => getDishesFromAllRestaurantMenus(restaurantId, filters), res, "Error fetching dishes from restaurant");
};

dishControllerAPI.getAllCategories = async (req, res) => {
  try {
    const categories = await Dish.distinct("category");
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories", error);
    return res.status(500).json({ message: "Error fetching categories" });
  }
};

/**
 * Check if a dish name can be recognized by the Spoonacular API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
dishControllerAPI.checkDishName = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ 
        recognized: false, 
        message: "Nome do prato é muito curto ou não foi fornecido" 
      });
    }
    
    // Buscar na API Spoonacular ou fallback local
    const foodItems = await nutritionService.searchFood(name);
    
    // Verificar se encontrou algum resultado
    if (foodItems && foodItems.length > 0) {
      // Verificar se tem dados nutricionais (teste real)
      let hasNutritionData = false;
      let nutritionalData = null;
      
      try {
        const item = foodItems[0];
        nutritionalData = await nutritionService.getFoodNutritionInfo(item.id, item.type || 'product');
        
        // Verificar se retornou dados nutricionais reais, não apenas objeto vazio
        hasNutritionData = nutritionalData && 
                           nutritionalData.nutritionalInfo && 
                           (nutritionalData.nutritionalInfo.calories > 0 || 
                            nutritionalData.nutritionalInfo.protein > 0 ||
                            nutritionalData.nutritionalInfo.carbs > 0);
                            
        console.log("Dados nutricionais completos:", JSON.stringify(nutritionalData));
      } catch (error) {
        console.error("Erro ao verificar dados nutricionais:", error);
      }
      
      // Se não conseguiu obter dados reais, informa ao usuário para entrada manual
      if (!hasNutritionData) {
        return res.status(200).json({
          recognized: false,
          message: "Prato encontrado, mas sem dados nutricionais disponíveis. Insira os valores manualmente."
        });
      }
      
      return res.status(200).json({
        recognized: true,
        hasNutritionData,
        itemCount: foodItems.length,
        previewData: nutritionalData ? {
          calories: nutritionalData.nutritionalInfo.calories || 0,
          protein: nutritionalData.nutritionalInfo.protein || 0,
          nutriScore: nutritionalData.nutriScore || null
        } : null,
        message: `Prato reconhecido! Dados nutricionais encontrados.`
      });
    } else {
      return res.status(200).json({
        recognized: false,
        message: "Prato não reconhecido pela API. Insira os valores nutricionais manualmente."
      });
    }
  } catch (error) {
    console.error("Erro ao verificar nome do prato:", error);
    return res.status(500).json({
      recognized: false,
      message: "Erro ao verificar o nome do prato"
    });
  }
};

module.exports = dishControllerAPI;
