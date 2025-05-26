/**
 * Dish Controller - Handles operations related to dish management.
 */

const Menu = require("../models/Menu");
const Dish = require("../models/Dish");
const validationController = require("../controllers/validationsController");
const acessController = require("../controllers/acessController");
const restaurantController = require("./restaurantController");
const menuController = require("./menuController");
const Restaurant = require("../models/Restaurant");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const Order = require("../models/Order"); // Add Order model import
const nutritionService = require("../services/nutritionService"); // Importando o serviço de nutrição

const dishController = {};

/**
 * Counts the number of Dish documents based on given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Number>} Number of matching dish documents.
 */
dishController.countDocuments = (criteria = {}) => {
  return Dish.countDocuments(criteria).exec();
};

/**
 * Retrieves all dishes matching the given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Array>} Array of Dish documents.
 * @throws {Error} When no dishes are found.
 */
dishController.getDishes = async (criteria = {}) => {
  const dishes = await Dish.find(criteria).exec();
  if (!dishes || dishes.length === 0) {
    throw new Error("No dishes found.");
  }
  return dishes;
};

/**
 * Retrieves a single dish matching the given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Object>} A Dish document.
 * @throws {Error} When no dish is found.
 */
dishController.getDish = async (criteria = {}) => {
  const dish = await Dish.findOne(criteria).exec();
  if (!dish) {
    throw new Error("Dish not found.");
  }
  return dish;
};

/**
 * Creates a new dish and updates related Menu and Restaurant data.
 * Calculates the total price and updates averages. Also fetches nutritional information.
 * Calculates the total price and updates averages. Also fetches nutritional information.
 * @param {Object} newDish - Data for the new dish.
 * @returns {Promise<Object>} The created Dish document.
 */
dishController.createDish = async (newDish) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(newDish.menuId)) {
      throw new Error("Invalid menu ID.");
    }

    // Inicializa objeto para armazenar informações nutricionais
    let nutritionalData = {
      nutritionalInfo: {},
      nutriScore: null,
      allergens: []
    };
    
    // Flag para controlar se dados manuais devem ser usados
    let useManualData = false;
    
    // Tentar obter dados da API primeiro, independentemente de dados manuais
    try {
      console.log(`Buscando informações nutricionais para o prato: ${newDish.name}`);
      
      // Buscar produtos alimentares na API com base no nome do prato
      const foodItems = await nutritionService.searchFood(newDish.name);
      
      // Se encontrou algum resultado, buscar informações nutricionais do primeiro produto
      if (foodItems && foodItems.length > 0) {
        const item = foodItems[0];
        console.log(`Item encontrado: ${item.title || item.name}, ID: ${item.id}, Tipo: ${item.type || 'product'}`);
        
        const apiNutritionalData = await nutritionService.getFoodNutritionInfo(item.id, item.type || 'product');
        
        // Verificar se os dados da API são válidos (têm informações reais)
        const hasValidData = apiNutritionalData && 
                            apiNutritionalData.nutritionalInfo && 
                            (apiNutritionalData.nutritionalInfo.calories > 0 || 
                            apiNutritionalData.nutritionalInfo.protein > 0 ||
                            apiNutritionalData.nutritionalInfo.carbs > 0);
        
        if (hasValidData) {
          // Se tem dados válidos da API, usa esses dados
          nutritionalData = apiNutritionalData;
          
          // Armazenar o ID externo para futuras atualizações
          newDish.externalFoodApiId = item.id;
          
          // Armazenar o tipo de item (produto, receita, ingrediente)
          newDish.externalFoodType = item.type || 'product';
          
          console.log("Usando informações nutricionais da API/fallback");
        } else {
          // Se a API não retornou dados úteis, usará dados manuais se disponíveis
          useManualData = true;
          console.log("Dados da API não têm informações nutricionais úteis");
        }
      } else {
        // Se não encontrou nenhum item, usará dados manuais se disponíveis
        useManualData = true;
        console.log("Nenhum item alimentar encontrado na API para:", newDish.name);
      }
    } catch (nutritionError) {
      // Em caso de erro na API, tentará usar dados manuais
      console.error("Erro ao buscar informações nutricionais:", nutritionError);
      useManualData = true;
    }
    
    // Se não encontrou dados válidos na API e há dados manuais fornecidos, usa os dados manuais
    if (useManualData && newDish.manualNutritionalInfo) {
      console.log("Usando informações nutricionais fornecidas manualmente");
      nutritionalData.nutritionalInfo = newDish.manualNutritionalInfo;
      
      // Verificar se nutriScore está definido e não é uma string vazia
      if (newDish.manualNutriScore && newDish.manualNutriScore.trim() !== '') {
        nutritionalData.nutriScore = newDish.manualNutriScore;
      } else {
        nutritionalData.nutriScore = null; // Definir explicitamente como null se estiver vazio
      }
      
      // Processar alérgenos informados como string separada por vírgula
      if (newDish.manualAllergens) {
        if (typeof newDish.manualAllergens === 'string') {
          nutritionalData.allergens = newDish.manualAllergens
            .split(',')
            .map(allergen => allergen.trim())
            .filter(allergen => allergen.length > 0);
        } else if (Array.isArray(newDish.manualAllergens)) {
          nutritionalData.allergens = newDish.manualAllergens;
        }
      }
      
      // Marcando o tipo como manual para referência futura
      newDish.externalFoodType = 'manual';
    }
    
    // Adicionar as informações nutricionais ao novo prato
    newDish.nutritionalInfo = nutritionalData.nutritionalInfo;
    newDish.nutriScore = nutritionalData.nutriScore;
    newDish.allergens = nutritionalData.allergens;

    // Remover os campos temporários para não salvar no banco de dados
    delete newDish.manualNutritionalInfo;
    delete newDish.manualNutriScore;
    delete newDish.manualAllergens;

    let dish = new Dish(newDish);
    dish = await dish.save();

    // Calcular preço total do novo prato para adicionar ao menu
    const totalPrice = newDish.prices.reduce((sum, priceObj) => sum + priceObj.price, 0);

    const updatedMenu = await Menu.findByIdAndUpdate(
      newDish.menuId,
      {
        $push: { dishes: dish._id },
        $inc: { totalPrice: totalPrice },
      },
      { new: true }
    );

    if (!updatedMenu) throw new Error("Menu not found.");

    const restaurantId = updatedMenu.restaurant;
    const menus = await Menu.find({ restaurant: restaurantId });

    // Buscar todos os pratos do restaurante
    const allDishes = await Dish.find({ menuId: { $in: menus.map((menu) => menu._id) } });

    if (allDishes.length === 0) {
      throw new Error("No dishes found for calculating average price.");
    }

    // Calcular preço médio (X) de cada prato (soma dos preços das doses / número de doses)
    const dishAveragePrices = allDishes.map((dish) => {
      const totalDishPrice = dish.prices.reduce((sum, p) => sum + p.price, 0);
      return dish.prices.length > 0 ? totalDishPrice / dish.prices.length : 0;
    });

    // Calcular preço médio do restaurante (soma dos X de todos os pratos / número de pratos)
    const restaurantAveragePrice = dishAveragePrices.reduce((sum, avgPrice) => sum + avgPrice, 0) / allDishes.length;

    await Restaurant.findByIdAndUpdate(restaurantId, { average_price: restaurantAveragePrice }, { new: true });

    return dish;
  } catch (err) {
    throw new Error("Error creating dish: " + err.message);
  }
};

/**
 * Renders the form for creating a new dish.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
dishController.renderCreateDishForm = async (req, res) => {
  try {
    const menuId = req.params.menuId;

    // Aguarda a validação e busca do menu
    const menu = await validationController.validateAndFetchById(menuId, Menu, "Menu not found.");

    // Verifica se o menu já contém 10 pratos
    if (menu.dishes.length < 10) {
      // First validate and get the restaurant
      const restaurantDoc = await validationController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurant not found.", (restaurant) => {
        if (!restaurant.verified) {
          throw new Error("Restaurant not verified.");
        }
      });

      // Then populate the restaurant separately
      const restaurant = await Restaurant.findById(restaurantDoc._id)
        .populate({
          path: "menus",
          populate: { path: "dishes", model: "Dish" },
        })
        .populate("order_records");

      // Query for orders - this was missing
      const orders = await Order.find({ restaurant: restaurant._id });
    } else {
      throw new Error("O menu já contém o máximo de 10 pratos.");
    }

    // Busca categorias existentes
    const categories = await Dish.distinct("category");

    if (!categories) {
      return res.status(404).render("error", { message: "Sem categorias" });
    }

    const formData = req.session.formData || {};
    const error = req.session.error || null;

    req.session.formData = null;
    req.session.error = null;

    res.render("dish/register", {
      restaurantId: menu.restaurant,
      menuId,
      name: formData.name || "",
      description: formData.description || "",
      doses: formData.doses || [],
      prices: formData.prices || [],
      image: formData.image || null,
      categories, // Pass categories to the view
      error,
    });
  } catch (error) {
    console.error("Erro ao validar acesso:", error.message);

    let restaurantId = null;
    try {
      const menu = await menuController.getMenu({ _id: req.params.menuId });
      restaurantId = menu?.restaurant || null;
    } catch (err) {
      console.error("Erro ao buscar menu:", err.message);
    }

    const errorMessage = error.message || "Erro";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: restaurantId ? `/restaurants/dashboard/${restaurantId}#menu-section` : "/",
    });
  }
};
/**
 * Handles the creation of a new dish via POST request.
 * Validates input, processes image uploads, and associates the dish with a menu.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
dishController.postCreateDish = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { name, description, doses, prices, category, newCategory, nutritionalInfo, nutriScore, allergens } = req.body;

    // Validar o menu e o restaurante
    let menu;
    try {
      menu = await validationController.validateAndFetchById(menuId, Menu, "Menu not found.");

      await validationController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurant not found.", (restaurant) => {
        if (!restaurant.verified) {
          throw new Error("Restaurant not verified.");
        }
        if (menu.dishes.length >= 10) {
          throw new Error("The menu already contains the maximum of 10 dishes.");
        }
      });
    } catch (error) {
      const errorMessage = error.message || "Erro";
      return res.status(500).render("error", {
        message: errorMessage,
        redirectUrl: `/restaurants/dashboard/${menu?.restaurant || req.params.idRestaurant}#menu-section`,
      });
    }

    // Validar doses e preços
    if (!Array.isArray(doses) || !Array.isArray(prices) || doses.length !== prices.length) {
      req.session.formData = { name, description, doses, prices, category, newCategory };
      req.session.error = "Doses and prices must be provided correctly.";
      return res.redirect(`/dish/register/${menuId}`);
    }

    // Validar categoria
    const finalCategory = newCategory && newCategory.trim() !== "" ? newCategory.trim() : category;
    if (!finalCategory) {
      req.session.formData = { name, description, doses, prices, category, newCategory };
      req.session.error = "Category is required.";
      return res.redirect(`/dish/register/${menuId}`);
    }

    // Mapear doses e preços
    const dishPrices = doses.map((dose, index) => {
      const price = parseFloat(prices[index]);
      if (price < 0) throw new Error(`Price for dose "${dose}" cannot be negative.`);

      return {
        dose: dose.trim(),
        price,
      };
    });

    // Validar nome e descrição
    const validatedName = validationController.validateString(name);
    const validatedDescription = validationController.validateString(description);

    // Criar o prato
    const newDish = await dishController.createDish({
      name: validatedName,
      description: validatedDescription,
      menuId: menuId,
      prices: dishPrices,
      category: finalCategory,
      // Adicionar informações nutricionais manuais se fornecidas
      manualNutritionalInfo: nutritionalInfo,
      manualNutriScore: nutriScore,
      manualAllergens: allergens
    });

    // Processar a imagem, se houver
    if (req.file) {
      const oldPath = req.file.path;
      const extension = path.extname(req.file.originalname).replace(/[^a-zA-Z0-9.]/g, "");
      const allowedTypes = ["image/jpeg", "image/png"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error("Invalid file type. Only JPG and PNG allowed.");
      }
      const newPath = path.join("uploads/dishes", `${newDish._id}${extension}`);

      await fs.rename(oldPath, newPath);

      newDish.image = `/uploads/dishes/${newDish._id}${extension}`;
      console.log(newDish);
      await newDish.save();
    }

    // Redirecionar para o dashboard do restaurante
    res.redirect(`/restaurants/dashboard/${menu.restaurant}`);
  } catch (error) {
    console.error("Error creating dish:", error);

    // Salvar os dados do formulário em caso de erro
    req.session.formData = {
      name: req.body.name,
      description: req.body.description,
      doses: req.body.doses,
      prices: req.body.prices,
      category: req.body.category,
      newCategory: req.body.newCategory,
    };
    req.session.error = error.message || "Error creating dish.";
    res.redirect(`/dish/register/${req.params.menuId}`);
  }
};

/**
 * Renders the form for editing an existing dish.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
dishController.renderEditDishForm = async (req, res) => {
  try {
    const dish = await validationController.validateAndFetchById(req.params.dishId, Dish, "Dish not found.");

    const menu = await validationController.validateAndFetchById(dish.menuId, Menu, "Menu not found.");

    await validationController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurant not found.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurant not verified.");
      }
    });

    // Buscar todas as categorias existentes de pratos do mesmo menu
    const categories = await Dish.distinct("category");
    console.log("Categorias encontradas:", categories);
    res.render("dish/edit", {
      restaurantId: menu.restaurant,
      menuId: dish.menuId,
      dish,
      name: dish.name,
      description: dish.description,
      doses: dish.prices.map((p) => p.dose),
      prices: dish.prices.map((p) => p.price),
      image: dish.image,
      categories, // Passar as categorias para a view
      error: null,
    });
  } catch (error) {
    console.error("Error rendering edit form:", error.message);
    let redirectUrl = "/";

    try {
      if (req.params.dishId) {
        const dishFind = await Dish.findById(req.params.dishId);
        if (dishFind && dishFind.menuId) {
          const menuFind = await Menu.findById(dishFind.menuId);
          if (menuFind && menuFind.restaurant) {
            redirectUrl = `/restaurants/dashboard/${menuFind.restaurant}#menu-section`;
          }
        }
      }
    } catch (secondError) {
      console.error("Error finding redirect path:", secondError.message);
    }

    const errorMessage = error.message || "Erro";
    return res.status(500).render("error", {
      message: errorMessage,
      redirectUrl,
    });
  }
};

/**
 * Updates an existing dish and related menu/restaurant data.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
dishController.updateDish = async (req, res) => {
  try {
    const dishId = req.params.dishId;
    let dish, menu, restaurant;

    try {
      // Busca e valida o prato
      dish = await validationController.validateAndFetchById(dishId, Dish, "Dish not found.");

      // Busca e valida o menu
      menu = await validationController.validateAndFetchById(dish.menuId, Menu, "Menu not found.");

      // Busca e valida o restaurante e as permissões do utilizador
      restaurant = await validationController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurant not found.", (restaurant) => {
        if (!restaurant.verified) {
          throw new Error("Restaurant not verified.");
        }
      });

      // Popula os menus do restaurante
      restaurant = await Restaurant.findById(restaurant._id).populate("menus");
    } catch (error) {
      const errorMessage = error.message || "Erro";
      return res.status(500).render("error", {
        message: errorMessage,
        redirectUrl: `/restaurants/dashboard/${menu?.restaurant || req.params.idRestaurant}#menu-section`,
      });
    }

    const { name, description, doses, prices, category, newCategory, nutritionalInfo, nutriScore, allergens } = req.body;
    const image = req.file ? `/uploads/dishes/${req.file.filename}` : dish.image;

    // Determine a categoria final (usar a nova categoria se fornecida, caso contrário usar a selecionada)
    const finalCategory = newCategory && newCategory.trim() !== "" ? newCategory.trim() : category;

    // Validate inputs
    try {
      validationController.validateString(name);
      validationController.validateString(description);
      validationController.validateString(finalCategory);

      if (!Array.isArray(doses) || !Array.isArray(prices) || doses.length !== prices.length) {
        throw new Error("Doses and prices must have the same length.");
      }
    } catch (validationError) {
      return res.status(400).render("dish/edit", {
        restaurantId: menu.restaurant,
        menuId: dish.menuId,
        dish: {
          _id: dishId,
          name,
          description,
          category: finalCategory,
          prices: doses.map((dose, index) => ({
            dose,
            price: prices[index] || "",
          })),
          image: dish.image,
        },
        error: validationError.message,
        categories: await Dish.distinct("category", { menuId: dish.menuId }),
      });
    }

    // Validate and map doses and prices
    const validatedPrices = doses.map((dose, index) => {
      const validatedDose = validationController.validateString(dose);
      const validatedPrice = validationController.validateNumber(parseFloat(prices[index]));
      return { dose: validatedDose, price: validatedPrice };
    });

    // Calculate total prices
    const newTotalPrice = validatedPrices.reduce((sum, priceObj) => sum + priceObj.price, 0);
    const oldTotalPrice = dish.prices.reduce((sum, priceObj) => sum + priceObj.price, 0);

    // Preparar informações nutricionais para atualização
    let updatedNutritionalInfo = dish.nutritionalInfo || {};
    let updatedNutriScore = dish.nutriScore;
    let updatedAllergens = dish.allergens || [];
    
    // Se o usuário editou manualmente as informações nutricionais
    if (nutritionalInfo) {
      // Processar os valores nutricionais
      updatedNutritionalInfo = {
        calories: nutritionalInfo.calories ? parseFloat(nutritionalInfo.calories) : updatedNutritionalInfo.calories,
        carbs: nutritionalInfo.carbs ? parseFloat(nutritionalInfo.carbs) : updatedNutritionalInfo.carbs,
        protein: nutritionalInfo.protein ? parseFloat(nutritionalInfo.protein) : updatedNutritionalInfo.protein,
        fat: nutritionalInfo.fat ? parseFloat(nutritionalInfo.fat) : updatedNutritionalInfo.fat,
        fiber: nutritionalInfo.fiber ? parseFloat(nutritionalInfo.fiber) : updatedNutritionalInfo.fiber,
        sugar: nutritionalInfo.sugar ? parseFloat(nutritionalInfo.sugar) : updatedNutritionalInfo.sugar
      };
    }
    
    // Processar NutriScore - verificar se está vazio
    if (nutriScore !== undefined) {
      // Se o valor for uma string vazia, definir como null (permitido pelo modelo)
      updatedNutriScore = nutriScore && nutriScore.trim() !== '' ? nutriScore : null;
    }
    
    // Processar alérgenos
    if (allergens !== undefined) {
      if (typeof allergens === 'string') {
        updatedAllergens = allergens
          .split(',')
          .map(allergen => allergen.trim())
          .filter(allergen => allergen.length > 0);
      } else if (Array.isArray(allergens)) {
        updatedAllergens = allergens;
      }
    }

    // Verificar se o nome do prato foi alterado para buscar novas informações nutricionais da API
    // (apenas se o usuário não forneceu informações manuais)
    let externalFoodApiId = dish.externalFoodApiId;
    
    if (name !== dish.name && !nutritionalInfo) {
      try {
        // Buscar novos produtos alimentares na API com base no novo nome do prato
        const foodProducts = await nutritionService.searchFood(name);
        
        // Se encontrou algum resultado, buscar informações nutricionais do primeiro produto
        if (foodProducts && foodProducts.length > 0) {
          externalFoodApiId = foodProducts[0].id;
          const apiNutritionalData = await nutritionService.getFoodNutritionInfo(externalFoodApiId, foodProducts[0].type || 'product');
          
          // Verificar se os dados da API são válidos (têm informações reais)
          const hasValidData = apiNutritionalData && 
                              apiNutritionalData.nutritionalInfo && 
                              (apiNutritionalData.nutritionalInfo.calories > 0 || 
                              apiNutritionalData.nutritionalInfo.protein > 0 ||
                              apiNutritionalData.nutritionalInfo.carbs > 0);
          
          // Só usar os dados da API se forem válidos
          if (hasValidData) {
            updatedNutritionalInfo = apiNutritionalData.nutritionalInfo;
            updatedNutriScore = apiNutritionalData.nutriScore;
            updatedAllergens = apiNutritionalData.allergens;
          }
        }
      } catch (nutritionError) {
        console.error("Erro ao buscar informações nutricionais:", nutritionError.message);
        // Não interrompe o fluxo se houver erro na API nutricional
      }
    }

    // Update dish with all information including nutritional data
    const updatedDish = await Dish.findByIdAndUpdate(
      dishId,
      {
        name,
        description,
        category: finalCategory,
        prices: validatedPrices,
        image,
        nutritionalInfo: updatedNutritionalInfo,
        nutriScore: updatedNutriScore,
        allergens: updatedAllergens,
        externalFoodApiId,
        // Se o usuário editou manualmente, marcar como tipo manual
        ...(nutritionalInfo ? { externalFoodType: 'manual' } : {})
      },
      { new: true }
    );

    if (!updatedDish) {
      return res.status(500).render("error", { message: "Failed to update dish." });
    }

    // Update menu total price
    await Menu.findByIdAndUpdate(dish.menuId, {
      $inc: { totalPrice: newTotalPrice - oldTotalPrice },
    });

    // Atualiza o preço médio do restaurante
    if (restaurant) {
      const allDishes = await Dish.find({ menuId: { $in: restaurant.menus.map((m) => m._id) } });

      // Calcular o preço médio (X) de cada prato (soma dos preços das doses / número de doses)
      const dishAveragePrices = allDishes.map((dish) => {
        const totalDishPrice = dish.prices.reduce((sum, p) => sum + p.price, 0);
        // Calcula a média do prato (exemplo: (6+7+8)/3 = 7€)
        return dish.prices.length > 0 ? totalDishPrice / dish.prices.length : 0;
      });

      // Calcular o preço médio do restaurante (soma dos X de todos os pratos / número de pratos)
      const restaurantAveragePrice = dishAveragePrices.length > 0 ? dishAveragePrices.reduce((sum, avgPrice) => sum + avgPrice, 0) / dishAveragePrices.length : 0;

      restaurant.average_price = restaurantAveragePrice;
      await restaurant.save();
    }

    res.redirect(`/restaurants/dashboard/${menu.restaurant}`);
  } catch (error) {
    console.error("Error updating dish:", error);

    // Em caso de erro não tratado anteriormente
    try {
      const dishId = req.params.dishId;
      const dishfind = await Dish.findById(dishId);
      const menu = await menuController.getMenu({ _id: dishfind?.menuId });

      return res.status(400).render("dish/edit", {
        restaurantId: menu?.restaurant || null,
        menuId: dishfind?.menuId || null,
        dish: {
          _id: dishId,
          name: req.body.name,
          description: req.body.description,
          category: req.body.newCategory || req.body.category || dishfind?.category,
          prices: req.body.doses
            ? req.body.doses.map((dose, index) => ({
                dose,
                price: req.body.prices[index] || "",
              }))
            : [],
          image: req.file ? `/uploads/dishes/${req.file.filename}` : dishfind?.image,
        },
        categories: await Dish.distinct("category", { menuId: dishfind?.menuId }),
        error: error.message || "Error updating dish.",
      });
    } catch (finalError) {
      // Se tudo falhar, mostra uma página de erro genérica
      return res.status(500).render("error", {
        message: "An unexpected error occurred while updating the dish.",
        redirectUrl: "/",
      });
    }
  }
};

/**
 * Deletes a dish and updates related menu and restaurant data.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
dishController.removeDish = async (req, res) => {
  try {
    const dishId = req.params.dishId;
    let menu, restaurant;

    const dish = await validationController.validateAndFetchById(dishId, Dish, "Dish not found.");

    menu = await validationController.validateAndFetchById(dish.menuId, Menu, "Menu not found.");

    restaurant = await validationController.validateEntityAndAccess(menu.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurant not found.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurant not verified.");
      }
    });
    restaurant = await Restaurant.findById(restaurant._id).populate("menus");

    const dishTotalPrice = dish.prices.reduce((sum, priceObj) => sum + priceObj.price, 0);

    await Menu.findByIdAndUpdate(dish.menuId, {
      $pull: { dishes: dish._id },
      $inc: { totalPrice: -dishTotalPrice },
    });

    const allDishes = await Dish.find({ menuId: { $in: restaurant.menus.map((m) => m._id) } });

    // Calcular o preço médio de cada prato (média das doses de cada prato)
    const dishAveragePrices =
      allDishes.length > 0
        ? allDishes.map((dish) => {
            const totalDishPrice = dish.prices.reduce((sum, p) => sum + p.price, 0);
            // Calcula a média do prato (total das doses / quantidade de doses)
            return dish.prices.length > 0 ? totalDishPrice / dish.prices.length : 0;
          })
        : [];

    // Calcular o preço médio do restaurante (média dos preços médios dos pratos)
    const totalPriceAverage = dishAveragePrices.length > 0 ? dishAveragePrices.reduce((sum, avgPrice) => sum + avgPrice, 0) / dishAveragePrices.length : 0;

    restaurant.average_price = totalPriceAverage;
    await restaurant.save();

    await Dish.findByIdAndDelete(dishId);

    res.redirect(`/restaurants/dashboard/${menu.restaurant}`);
  } catch (error) {
    console.error("Error deleting dish:", error.message);
    let redirectUrl = "/";

    try {
      if (req.params.dishId) {
        const dishFind = await Dish.findById(req.params.dishId);
        if (dishFind && dishFind.menuId) {
          const menuFind = await Menu.findById(dishFind.menuId);
          if (menuFind && menuFind.restaurant) {
            redirectUrl = `/restaurants/dashboard/${menuFind.restaurant}#menu-section`;
          }
        }
      }
    } catch (secondError) {
      console.error("Error finding redirect path:", secondError.message);
    }

    res.status(500).render("error", {
      message: error.message || "Error deleting dish.",
      redirectUrl,
    });
  }
};

module.exports = dishController;
