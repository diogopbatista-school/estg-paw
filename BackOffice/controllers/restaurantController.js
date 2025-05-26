const express = require("express");
const router = express.Router();
const fsPromises = require("fs/promises");
const mongoose = require("mongoose");
const path = require("path");

const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const Menu = require("../models/Menu");
const Dish = require("../models/Dish");
const Order = require("../models/Order");
const Review = require("../models/Review");

const validationsController = require("../controllers/validationsController");
const menuController = require("../controllers/menuController");

const restaurantController = {};

/**
 * Conta o número de documentos de restaurante baseado nos critérios fornecidos
 * @param {Object} [criteria={}] - Critérios de consulta para filtrar restaurantes
 * @returns {Promise<Number>} Número de restaurantes encontrados
 */
restaurantController.countDocuments = (criteria = {}) => {
  return Restaurant.countDocuments(criteria).exec();
};

/**
 * Recupera uma lista de restaurantes baseado nos critérios fornecidos
 * @param {Object} [criteria={}] - Critérios de consulta para filtrar restaurantes
 * @returns {Promise<Array>} Lista de restaurantes encontrados
 */
restaurantController.getRestaurants = (criteria = {}) => {
  return Restaurant.find(criteria).exec();
};

/**
 * Recupera um único restaurante baseado nos critérios fornecidos
 * @param {Object} [criteria={}] - Critérios de consulta para encontrar um restaurante
 * @returns {Promise<Object|null>} O restaurante encontrado ou null
 */
restaurantController.getRestaurant = (criteria = {}) => {
  return Restaurant.findOne(criteria).exec();
};

/**
 * Cria um novo restaurante e atualiza o utilizador gerente com a referência
 * @param {Object} restaurantData - Dados para criar o novo restaurante
 * @returns {Promise<Object>} O restaurante criado
 * @throws {Error} Se ocorrer algum erro durante a criação
 */
restaurantController.createRestaurant = async (restaurantData) => {
  try {
    let restaurant = new Restaurant(restaurantData);

    await User.findByIdAndUpdate(restaurant.manager, {
      $push: { restaurants: restaurant._id }, // Adiciona o ID do restaurante ao array de restaurantes do utilizador
    });

    console.log("Restaurante criado com sucesso:", restaurant);

    await restaurant.save();
    return restaurant;
  } catch (err) {
    throw new Error("Erro ao criar o restaurante: " + err.message);
  }
};

/**
 * Deletes a restaurant and all its associated data (menus, dishes)
 * @param {String} restaurantId - ID of the restaurant to be deleted
 * @returns {Promise<void>}
 * @throws {Error} If restaurant ID is missing, restaurant not found, or there's an error during deletion
 */
restaurantController.deleteRestaurant = async (restaurantId) => {
  console.log("ID do restaurante recebido:", restaurantId);

  if (!restaurantId) {
    throw new Error("Restaurant ID is required");
  }

  try {
    // Busca o restaurante pelo ID
    const restaurant = await restaurantController.getRestaurant({ _id: restaurantId });
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    try {
      // Busca todos os menus associados ao restaurante
      // e trata caso não encontre nenhum menu
      const menus = (await menuController.getMenus({ restaurant: restaurantId })) || [];

      // Apaga todos os pratos associados a cada menu
      for (const menu of menus) {
        await Dish.deleteMany({ menuId: menu._id }).exec();
      }

      // Apaga todos os menus associados ao restaurante
      await Menu.deleteMany({ restaurant: restaurantId }).exec();
    } catch (error) {
      console.log("Aviso: Não foram encontrados menus para este restaurante ou ocorreu um erro:", error.message);
      // Continue o processo de exclusão mesmo sem menus
    }

    // Apaga todas as reviews associadas ao restaurante
    await Review.deleteMany({ restaurant: restaurantId }).exec();

    // Marca os pedidos associados ao restaurante como cancelados ou os exclui
    // Opção: Marcar como cancelados (recomendado para preservar histórico)
    await Order.updateMany({ restaurant: restaurantId }, { $set: { status: "cancelled", cancellation_reason: "Restaurant deleted" } }).exec();

    // Remove o ID do restaurante do array de restaurantes do utilizador (manager)
    await User.findByIdAndUpdate(restaurant.manager, {
      $pull: { restaurants: restaurantId },
    });

    // Apaga o restaurante
    await Restaurant.findByIdAndDelete(restaurantId).exec();

    console.log("Restaurante e dados associados apagados com sucesso.");
    return;
  } catch (error) {
    console.error("Erro ao apagar o restaurante:", error);
    throw new Error("Erro ao apagar o restaurante: " + error.message);
  }
};

/**
 * Updates an existing restaurant with new data
 * @param {String} restaurantId - ID of the restaurant to update
 * @param {Object} updatedData - New data to update the restaurant with
 * @returns {Promise<Object>} The updated restaurant
 * @throws {Error} If restaurant not found or there's an error during update
 */
restaurantController.editRestaurant = async (restaurantId, updatedData) => {
  try {
    const restaurant = await restaurantController.getRestaurant({ _id: restaurantId });
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Atualiza os dados do restaurante
    Object.assign(restaurant, updatedData);
    await restaurant.save();

    console.log("Restaurante atualizado com sucesso:", restaurant);
    return restaurant;
  } catch (error) {
    console.error("Erro ao atualizar o restaurante:", error);
    throw new Error("Erro ao atualizar o restaurante: " + error.message);
  }
};

/**
 * Processes the restaurant edit form submission
 * @param {Object} req - Express request object containing restaurant data and ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Redirects to dashboard on success, renders edit form with errors otherwise
 */
restaurantController.postEditRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    console.log("Restaurant ID recebido:", restaurantId);

    if (!restaurantId) {
      return res.status(400).send("Restaurant ID is required.");
    }

    // Validações e coleta de dados atualizados
    let updatedData;
    try {
      updatedData = {
        name: validationsController.validateString(req.body.name),
        description: validationsController.validateString(req.body.description),
        location: {
          latitude: validationsController.validateLatitude(req.body.latitude),
          longitude: validationsController.validateLongitude(req.body.longitude),
        },
        phone: req.body.phone,
      };
    } catch (validationError) {
      console.error("Erro de validação:", validationError.message);

      // Busca o restaurante novamente para preencher o formulário
      const restaurant = await restaurantController.getRestaurant({ _id: restaurantId });

      if (!restaurant) {
        return res.status(404).send("Restaurante não encontrado.");
      }

      // Renderiza o formulário de edição com os dados existentes e o erro de validação
      return res.render("restaurant/edit", {
        restaurant,
        error: `Erro de validação: ${validationError.message}`,
      });
    }

    // Buscar o restaurante atual
    const restaurant = await restaurantController.getRestaurant({ _id: restaurantId });
    if (!restaurant) {
      return res.status(404).send("Restaurante não encontrado.");
    }

    // Apagar a imagem antiga se uma nova for enviada
    if (req.file) {
      const fs = require("fs");
      const path = require("path");

      if (restaurant.image) {
        const oldImagePath = path.join(__dirname, `../${restaurant.image}`);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Apagar a imagem antiga
        }
      }

      // Atualizar o caminho da nova imagem
      const extension = path.extname(req.file.originalname);
      const newImagePath = path.join("uploads/restaurants", `${restaurantId}${extension}`);
      fs.renameSync(req.file.path, newImagePath);

      updatedData.image = `/uploads/restaurants/${restaurantId}${extension}`;
    }

    //save
    await restaurantController.editRestaurant(restaurantId, updatedData);

    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Erro ao editar o restaurante:", error);

    // Busca o restaurante novamente para preencher o formulário
    const restaurant = await restaurantController.getRestaurant({ _id: req.params.id });

    if (!restaurant) {
      return res.status(404).send("Restaurante não encontrado.");
    }

    // Renderiza o formulário de edição com os dados existentes e o erro
    res.render("restaurant/edit", {
      restaurant,
      error: "Erro ao editar o restaurante. Verifique os dados e tente novamente.",
    });
  }
};

/**
 * Renders the restaurant edit form
 * @param {Object} req - Express request object containing restaurant ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Renders edit form or redirects with error
 */
restaurantController.renderEditRestaurantForm = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    console.log("Restaurant ID recebido:", restaurantId);

    if (!restaurantId) {
      return res.status(400).send("Restaurant ID necessário.");
    }

    // Busca o restaurante pelo ID
    const restaurant = await restaurantController.getRestaurant({ _id: restaurantId });
    if (!restaurant) {
      return res.status(404).send("Restaurante não encontrado.");
    }

    // Verifica se o utilizador autenticado é o manager do restaurante, admin ou superAdmin
    if (!req.isAuthenticated() || (req.user.role !== "admin" && req.user.role !== "superAdmin" && restaurant.manager.toString() !== req.user._id.toString())) {
      console.log("Utilizador não autorizado a editar este restaurante.");
      return res.status(403).redirect("/user/dashboard");
    }

    // Renderiza o formulário de edição do restaurante
    res.render("restaurant/edit", { restaurant, error: null });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição do restaurante:", error);
    res.status(500).send("Erro ao carregar o formulário de edição do restaurante.");
  }
};

/**
 * Deletes a restaurant and its associated data (menus, dishes).
 * Validates the restaurant ID and handles image deletion asynchronously.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
restaurantController.deleteRestaurantHandler = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    console.log("ID do restaurante recebido para apagar:", restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).render("error", { message: "ID de restaurante inválido." });
    }

    const restaurant = await restaurantController.getRestaurant({ _id: restaurantId });
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    if (restaurant.image) {
      const oldImagePath = path.join(__dirname, `../${restaurant.image}`);
      try {
        await fsPromises.unlink(oldImagePath);
      } catch (err) {
        console.warn("Imagem antiga não foi apagada:", err.message);
        // Não interromper o fluxo se a imagem não puder ser excluída
      }
    }

    await restaurantController.deleteRestaurant(restaurantId);
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Erro ao apagar o restaurante:", error);
    // Melhorar a mensagem de erro para o usuário
    res.status(500).render("error", {
      message: "Erro ao apagar o restaurante. Por favor, tente novamente mais tarde.",
    });
  }
};

/**
 * Renders the restaurant creation form.
 * Ensures the user is authenticated and authorized.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
restaurantController.renderCreateRestaurantForm = (req, res) => {
  if (!req.isAuthenticated() || (req.user.role !== "manager" && req.user.role !== "admin" && req.user.role !== "superAdmin")) {
    return res.status(403).send("Acesso negado. Apenas managers podem acessar esta página.");
  }

  const managerId = req.query.manager || req.user._id;
  res.render("restaurant/register", { error: null, managerId });
};

/**
 * Processes the restaurant registration form submission
 * @param {Object} req - Express request object containing restaurant data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Redirects to dashboard on success or renders register form with error
 */
restaurantController.postRegister = async (req, res, next) => {
  try {
    console.log("Dados recebidos:", req.body);

    if (!req.isAuthenticated() || (req.user.role !== "manager" && req.user.role !== "admin" && req.user.role !== "superAdmin")) {
      return res.status(403).send("Acesso negado. Apenas managers podem acessar esta página.");
    }

    const managerId = req.query.managerId || req.user._id;

    // Etapa 1: Cria o restaurante sem a imagem para obter o ID
    const newRestaurant = new Restaurant({
      name: validationsController.validateString(req.body.name),
      description: validationsController.validateString(req.body.description),
      location: {
        latitude: validationsController.validateLatitude(req.body.latitude),
        longitude: validationsController.validateLongitude(req.body.longitude),
      },
      phone: req.body.phone,
      manager: managerId,
    });

    const savedRestaurant = await newRestaurant.save();

    console.log("Restaurante criado com sucesso:", savedRestaurant);

    // Etapa 2: Verifica se uma imagem foi enviada
    if (req.file) {
      const fs = require("fs");
      const path = require("path");

      // Renomear o arquivo de imagem com o ID do restaurante
      const extension = path.extname(req.file.originalname);
      const newImagePath = path.join("uploads/restaurants", `${savedRestaurant._id}${extension}`);
      fs.renameSync(req.file.path, newImagePath);

      // Atualizar o restaurante com o caminho da imagem
      savedRestaurant.image = `/uploads/restaurants/${savedRestaurant._id}${extension}`;
      await savedRestaurant.save();
    }

    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Erro ao criar o restaurante:", error);
    res.render("restaurant/register", { error: "Erro ao criar o restaurante.", managerId: req.query.manager || req.user._id });
  }
};

/**
 * Renders the restaurant dashboard with menus, dishes, and orders.
 * Validates the restaurant ID and user permissions.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
restaurantController.renderDashboard = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).render("error", { message: "ID de restaurante inválido." });
    }

    const restaurant = await Restaurant.findById(restaurantId)
      .populate({
        path: "menus",
        populate: {
          path: "dishes",
          model: "Dish",
        },
      })
      .populate("order_records");

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    const user = req.user || {};
    const isAdminOrSuperAdmin = user.role === "admin" || user.role === "superAdmin";
    const isManagerOfRestaurant = restaurant.manager.toString() === (user._id || "").toString();

    if (!isAdminOrSuperAdmin && !isManagerOfRestaurant) {
      return res.status(403).render("error", { message: "Acesso negado. Você não tem permissão para aceder este restaurante." });
    }

    const totalDishes = restaurant.menus.reduce((total, menu) => total + menu.dishes.length, 0);

    const filters = {
      name: req.query.name || "",
      sort: req.query.sort || "",
    };

    let menus = restaurant.menus;
    if (filters.name) {
      menus = menus.filter((menu) => menu.name.toLowerCase().includes(filters.name.toLowerCase()));
    }

    if (filters.sort === "price_asc") {
      menus.sort((a, b) => {
        const avgPriceA = a.totalPrice / (a.dishes.length || 1);
        const avgPriceB = b.totalPrice / (b.dishes.length || 1);
        return avgPriceA - avgPriceB;
      });
    } else if (filters.sort === "price_desc") {
      menus.sort((a, b) => {
        const avgPriceA = a.totalPrice / (a.dishes.length || 1);
        const avgPriceB = b.totalPrice / (b.dishes.length || 1);
        return avgPriceB - avgPriceA;
      });
    }
    const orders = await Order.find({ restaurant: restaurantId }).populate("customer");
    const orderRecords = restaurant.order_records || [];

    // Calcular o preço médio como média dos preços médios de cada prato para cada menu
    let avgPriceMenus = menus.map((menu) => {
      if (menu.dishes && menu.dishes.length > 0) {
        const dishAvgPrices = menu.dishes.map((dish) => {
          if (dish.prices && dish.prices.length > 0) {
            // Média de cada prato: soma dos preços das doses / número de doses
            return dish.prices.reduce((sum, p) => sum + p.price, 0) / dish.prices.length;
          }
          return 0;
        });
        // Média do menu: soma das médias dos pratos / número de pratos
        return dishAvgPrices.reduce((sum, avg) => sum + avg, 0) / menu.dishes.length;
      }
      return 0;
    });

    // Adicionar o preço médio diretamente a cada objeto de menu para fácil acesso no template
    menus.forEach((menu, index) => {
      menu.avgPrice = avgPriceMenus[index];
    });

    let average_price = 0;
    if (avgPriceMenus.length > 0) {
      // Calcula o preço médio do restaurante como média dos preços médios de todos os menus
      average_price = avgPriceMenus.reduce((sum, avg) => sum + avg, 0) / avgPriceMenus.length;
    }

    res.render("restaurant/dashboard", {
      restaurant,
      menus,
      totalDishes,
      orders,
      filters,
      orderRecords,
      avgPriceMenus,
      average_price,
      error: null,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do restaurante:", error);
    res.status(500).render("error", { message: "Erro ao carregar os detalhes do restaurante." });
  }
};

/**
 * Renders the order history for a restaurant.
 * Validates the restaurant ID and user permissions.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
restaurantController.renderOrderHistory = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).render("error", { message: "ID de restaurante inválido." });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    const user = req.user || {};
    const isAdminOrSuperAdmin = user.role === "admin" || user.role === "superAdmin";
    const isManagerOfRestaurant = restaurant.manager.toString() === (user._id || "").toString();

    if (!isAdminOrSuperAdmin && !isManagerOfRestaurant) {
      return res.status(403).render("error", { message: "Acesso negado. Você não tem permissão para acessar este restaurante." });
    }
    const filters = {
      status: req.query.status || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      orderNumber: req.query.orderNumber || null,
      pendingReviews: req.query.pendingReviews === "true" || false,
    };

    // Paginação
    const page = parseInt(req.query.page) || 1;
    const itensPorPagina = 5;
    const skip = (page - 1) * itensPorPagina;
    let query = { restaurant: restaurantId };
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.startDate) {
      query.created_at = { $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      query.created_at = query.created_at || {};
      query.created_at.$lte = new Date(filters.endDate);
    }
    if (filters.orderNumber) {
      query.order_number = filters.orderNumber;
    }

    // Buscar todas as reviews não respondidas para este restaurante para o contador
    const pendingReviewsCount = await Review.countDocuments({
      restaurant: restaurantId,
      $or: [{ response: { $exists: false } }, { response: null }, { "response.text": { $exists: false } }, { "response.text": null }, { "response.text": "" }],
    }); // Contagem total para paginação
    const total = await Order.countDocuments(query);
    const totalPaginas = Math.ceil(total / itensPorPagina);
    // Buscar pedidos com paginação e fazer populate dos dados necessários
    let orderQuery = Order.find(query);

    // Se o filtro de reviews pendentes estiver ativado
    if (filters.pendingReviews) {
      // Primeiro, buscamos as reviews não respondidas deste restaurante
      const pendingReviews = await Review.find({
        restaurant: restaurantId,
        $or: [{ response: { $exists: false } }, { response: null }, { "response.text": { $exists: false } }, { "response.text": null }, { "response.text": "" }],
      });

      // Se houver reviews pendentes, filtramos os pedidos que têm essas reviews
      if (pendingReviews && pendingReviews.length > 0) {
        const reviewIds = pendingReviews.map((review) => review._id);
        query.review = { $in: reviewIds };
      } else {
        // Se não houver reviews pendentes, retornamos uma lista vazia
        query._id = { $exists: false }; // Uma query que não vai retornar nada
      }
    }
    const orderRecords = await Order.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(itensPorPagina)
      .populate("logs")
      .populate("customer", "name email phone")
      .populate("appliedVoucher", "code discount description")
      .populate({
        path: "review",
        populate: {
          path: "user",
          select: "name email",
        },
      });

    // Calculate voucher totals for the filtered orders (all pages, not just current page)
    const allFilteredOrders = await Order.find(query).populate("appliedVoucher", "code discount description");

    const voucherSummary = {
      totalOrdersWithVouchers: 0,
      totalVoucherDiscount: 0,
      totalOriginalAmount: 0,
      totalFinalAmount: 0,
      voucherBreakdown: {},
    }; // Processar cada pedido para calcular os totais dos vouchers
    allFilteredOrders.forEach((order) => {
      if (order.appliedVoucher && order.voucherDiscount > 0) {
        voucherSummary.totalOrdersWithVouchers++;

        // Garantir que estamos usando o valor correto de desconto (nunca maior que o valor do pedido)
        let itemsTotal = 0;
        if (Array.isArray(order.items) && order.items.length > 0) {
          order.items.forEach((item) => {
            itemsTotal += item.price * item.quantity;
          });
        }
        // Aplicar o desconto correto, considerando o limite do valor total
        const appliedDiscount = Math.min(order.voucherDiscount, itemsTotal);

        voucherSummary.totalVoucherDiscount += appliedDiscount;
        const originalAmount = order.totalPrice + appliedDiscount;
        voucherSummary.totalOriginalAmount += originalAmount;
        voucherSummary.totalFinalAmount += order.totalPrice;

        // Breakdown por código de voucher
        const voucherCode = order.appliedVoucher.code;
        if (!voucherSummary.voucherBreakdown[voucherCode]) {
          voucherSummary.voucherBreakdown[voucherCode] = {
            count: 0,
            totalDiscount: 0,
            description: order.appliedVoucher.description || "N/A",
            orderNumbers: [], // Adicionar lista de números de pedido
          };
        }
        voucherSummary.voucherBreakdown[voucherCode].count++;
        voucherSummary.voucherBreakdown[voucherCode].totalDiscount += appliedDiscount;
        // Adicionar número do pedido à lista para rastreabilidade
        if (order.order_number) {
          voucherSummary.voucherBreakdown[voucherCode].orderNumbers.push(order.order_number);
        }
      }
    });

    res.render("restaurant/orderHistory", {
      restaurant,
      orderRecords,
      filters,
      paginacao: {
        atual: page,
        total: totalPaginas,
      },
      pendingReviewsCount: pendingReviewsCount,
      voucherSummary: voucherSummary,
    });
  } catch (error) {
    console.error("Erro ao carregar o histórico de pedidos:", error);
    res.status(500).render("error", { message: "Erro ao carregar o histórico de pedidos." });
  }
};

restaurantController.respondToOrder = async (req, res) => {
  try {
    const { restaurantId, reviewId } = req.params;
    const { response } = req.body;

    if (!response || response.trim() === "") {
      return res.status(400).render("error", { message: "A resposta não pode estar vazia." });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurantId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).render("error", { message: "ID de restaurante ou review inválido." });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    const isAdminOrSuperAdmin = req.user.role === "admin" || req.user.role === "superAdmin";
    const isManagerOfRestaurant = restaurant.manager.toString() === req.user._id.toString();
    if (!isAdminOrSuperAdmin && !isManagerOfRestaurant) {
      return res.status(403).render("error", { message: "Acesso negado. Você não tem permissão para responder a reviews deste restaurante." });
    }

    const review = await Review.findOne({
      _id: reviewId,
      restaurant: restaurantId,
    });

    if (!review) {
      return res.status(404).render("error", { message: "Review não encontrada." });
    }

    if (review.hasOwnProperty("response") && review.response && review.response.text) {
      return res.status(400).render("error", { message: "Esta review já possui uma resposta." });
    }

    review.response = {
      text: response,
      user: req.user._id,
      created_at: new Date(),
    };

    await review.save();
    res.redirect(`/restaurants/${restaurantId}/orderHistory`);
  } catch (error) {
    console.error("Erro ao responder à review:", error);
    res.status(500).render("error", { message: "Erro ao responder à review." });
  }
};

/**
 * Renders charts for a restaurant's performance metrics.
 * Generates yearly, monthly, daily, and specific day statistics for orders, revenue, and average completion time.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @throws {Error} If the restaurant is not found or the user is unauthorized.
 */
restaurantController.renderCharts = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Fetch the restaurant by ID and populate menus, dishes, and order records
    const restaurant = await Restaurant.findById(restaurantId)
      .populate({
        path: "menus",
        populate: {
          path: "dishes",
          model: "Dish",
        },
      })
      .populate("order_records");

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Check if the user has permission to access the restaurant
    const isAdminOrSuperAdmin = req.user.role === "admin" || req.user.role === "superAdmin";
    const isManagerOfRestaurant = restaurant.manager.toString() === req.user._id.toString();

    if (!isAdminOrSuperAdmin && !isManagerOfRestaurant) {
      console.log("Utilizador não autorizado a acessar este restaurante.");
      return res.status(403).render("error", { message: "Acesso negado. Você não tem permissão para acessar este restaurante." });
    }

    // Get parameters from query string
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
    const selectedMonth = req.query.month !== undefined ? parseInt(req.query.month) : new Date().getMonth();
    const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
    const specificDate = req.query.specificDate ? new Date(req.query.specificDate) : null;

    // Total stats (all time)
    const totalStats = {
      orders: restaurant.order_records.length,
      revenue: restaurant.order_records.reduce((sum, order) => sum + (order.status === "finished" ? order.totalPrice : 0), 0),
      avgTime: 0,
      avgOrderValue: 0,
    };

    // Calculate total average completion time and average order value
    const finishedOrders = restaurant.order_records.filter((order) => order.status === "finished");
    if (finishedOrders.length > 0) {
      const totalTime = finishedOrders.reduce((sum, order) => {
        const createdAt = new Date(order.created_at);
        const finishedAt = new Date(order.finished_at);
        return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
      }, 0);

      totalStats.avgTime = totalTime / finishedOrders.length;
      totalStats.avgOrderValue = finishedOrders.reduce((sum, order) => sum + order.totalPrice, 0) / finishedOrders.length;
    }

    // YEARLY STATISTICS
    const yearlyData = {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
      orders: Array(12).fill(0),
      revenue: Array(12).fill(0),
      avgTime: Array(12).fill(0),
    };

    // Yearly statistics calculation
    const yearOrders = restaurant.order_records.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate.getFullYear() === selectedYear;
    });

    yearOrders.forEach((order) => {
      const month = new Date(order.created_at).getMonth();
      yearlyData.orders[month]++;
      if (order.status === "finished") {
        yearlyData.revenue[month] += order.totalPrice;
      }
    });

    // Calculate monthly average completion times
    for (let month = 0; month < 12; month++) {
      const monthOrders = yearOrders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === month && order.status === "finished";
      });

      if (monthOrders.length > 0) {
        const totalTime = monthOrders.reduce((sum, order) => {
          const createdAt = new Date(order.created_at);
          const finishedAt = new Date(order.finished_at);
          return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
        }, 0);

        yearlyData.avgTime[month] = totalTime / monthOrders.length;
      }
    }

    // Calculate yearly statistics totals
    const yearlyStats = {
      totalOrders: yearOrders.length,
      totalRevenue: yearOrders.reduce((sum, order) => sum + (order.status === "finished" ? order.totalPrice : 0), 0),
      avgTime: 0,
    };

    const yearlyFinishedOrders = yearOrders.filter((order) => order.status === "finished");
    if (yearlyFinishedOrders.length > 0) {
      const totalYearlyTime = yearlyFinishedOrders.reduce((sum, order) => {
        const createdAt = new Date(order.created_at);
        const finishedAt = new Date(order.finished_at);
        return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
      }, 0);

      yearlyStats.avgTime = totalYearlyTime / yearlyFinishedOrders.length;
    }

    // MONTHLY STATISTICS
    // Filter orders for selected month and year
    const monthOrders = restaurant.order_records.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate.getFullYear() === selectedYear && orderDate.getMonth() === selectedMonth;
    });

    // Get days in month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // Generate statistics for the month (day by day)
    const statsByMonth = {
      labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
      orders: Array(daysInMonth).fill(0),
      revenue: Array(daysInMonth).fill(0),
      avgTime: Array(daysInMonth).fill(0),
    };

    monthOrders.forEach((order) => {
      const day = new Date(order.created_at).getDate() - 1; // 0-based index
      statsByMonth.orders[day]++;
      if (order.status === "finished") {
        statsByMonth.revenue[day] += order.totalPrice;
      }
    });

    // Calculate daily average completion times for the month
    for (let day = 0; day < daysInMonth; day++) {
      const dayOrders = monthOrders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getDate() === day + 1 && order.status === "finished";
      });

      if (dayOrders.length > 0) {
        const totalTime = dayOrders.reduce((sum, order) => {
          const createdAt = new Date(order.created_at);
          const finishedAt = new Date(order.finished_at);
          return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
        }, 0);

        statsByMonth.avgTime[day] = totalTime / dayOrders.length;
      }
    }

    // Calculate monthly statistics totals
    const monthlyStats = {
      totalOrders: monthOrders.length,
      totalRevenue: monthOrders.reduce((sum, order) => sum + (order.status === "finished" ? order.totalPrice : 0), 0),
      avgTime: 0,
    };

    const monthlyFinishedOrders = monthOrders.filter((order) => order.status === "finished");
    if (monthlyFinishedOrders.length > 0) {
      const totalMonthlyTime = monthlyFinishedOrders.reduce((sum, order) => {
        const createdAt = new Date(order.created_at);
        const finishedAt = new Date(order.finished_at);
        return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
      }, 0);

      monthlyStats.avgTime = totalMonthlyTime / monthlyFinishedOrders.length;
    }

    // DAILY STATISTICS
    // Filter orders for selected day
    const dailyOrders = restaurant.order_records.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate.getFullYear() === selectedDate.getFullYear() && orderDate.getMonth() === selectedDate.getMonth() && orderDate.getDate() === selectedDate.getDate();
    });

    // Generate statistics by hour for the selected day
    const statsByDay = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      orders: Array(24).fill(0),
      revenue: Array(24).fill(0),
      avgTime: Array(24).fill(0),
    };

    dailyOrders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      statsByDay.orders[hour]++;
      if (order.status === "finished") {
        statsByDay.revenue[hour] += order.totalPrice;
      }
    });

    // Calculate hourly average completion times
    for (let hour = 0; hour < 24; hour++) {
      const hourOrders = dailyOrders.filter((order) => {
        const orderHour = new Date(order.created_at).getHours();
        return orderHour === hour && order.status === "finished";
      });

      if (hourOrders.length > 0) {
        const totalTime = hourOrders.reduce((sum, order) => {
          const createdAt = new Date(order.created_at);
          const finishedAt = new Date(order.finished_at);
          return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
        }, 0);

        statsByDay.avgTime[hour] = totalTime / hourOrders.length;
      }
    }

    // Calculate daily statistics totals
    const dailyStats = {
      totalOrders: dailyOrders.length,
      totalRevenue: dailyOrders.reduce((sum, order) => sum + (order.status === "finished" ? order.totalPrice : 0), 0),
      avgTime: 0,
    };

    const dailyFinishedOrders = dailyOrders.filter((order) => order.status === "finished");
    if (dailyFinishedOrders.length > 0) {
      const totalDailyTime = dailyFinishedOrders.reduce((sum, order) => {
        const createdAt = new Date(order.created_at);
        const finishedAt = new Date(order.finished_at);
        return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
      }, 0);

      dailyStats.avgTime = totalDailyTime / dailyFinishedOrders.length;
    }

    // SPECIFIC DAY STATISTICS
    let statsBySpecificDay = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      orders: Array(24).fill(0),
      revenue: Array(24).fill(0),
      avgTime: Array(24).fill(0),
    };

    let specificDayStats = {
      totalOrders: 0,
      totalRevenue: 0,
      avgTime: 0,
    };

    // If a specific date was requested
    if (specificDate) {
      const specificDayOrders = restaurant.order_records.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getFullYear() === specificDate.getFullYear() && orderDate.getMonth() === specificDate.getMonth() && orderDate.getDate() === specificDate.getDate();
      });

      specificDayOrders.forEach((order) => {
        const hour = new Date(order.created_at).getHours();
        statsBySpecificDay.orders[hour]++;
        if (order.status === "finished") {
          statsBySpecificDay.revenue[hour] += order.totalPrice;
        }
      });

      // Calculate hourly average completion times for the specific day
      for (let hour = 0; hour < 24; hour++) {
        const hourOrders = specificDayOrders.filter((order) => {
          const orderHour = new Date(order.created_at).getHours();
          return orderHour === hour && order.status === "finished";
        });

        if (hourOrders.length > 0) {
          const totalTime = hourOrders.reduce((sum, order) => {
            const createdAt = new Date(order.created_at);
            const finishedAt = new Date(order.finished_at);
            return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
          }, 0);

          statsBySpecificDay.avgTime[hour] = totalTime / hourOrders.length;
        }
      }

      // Calculate specific day statistics totals
      specificDayStats = {
        totalOrders: specificDayOrders.length,
        totalRevenue: specificDayOrders.reduce((sum, order) => sum + (order.status === "finished" ? order.totalPrice : 0), 0),
        avgTime: 0,
      };

      const specificDayFinishedOrders = specificDayOrders.filter((order) => order.status === "finished");
      if (specificDayFinishedOrders.length > 0) {
        const totalSpecificDayTime = specificDayFinishedOrders.reduce((sum, order) => {
          const createdAt = new Date(order.created_at);
          const finishedAt = new Date(order.finished_at);
          return sum + (finishedAt - createdAt) / (1000 * 60); // Time in minutes
        }, 0);

        specificDayStats.avgTime = totalSpecificDayTime / specificDayFinishedOrders.length;
      }
    }

    // Render the view with all statistics
    res.render("restaurant/viewReports", {
      restaurantId,
      selectedYear,
      selectedMonth,
      selectedDate,
      specificDate,
      totalStats,
      yearlyData,
      yearlyStats,
      statsByMonth,
      monthlyStats,
      statsByDay,
      dailyStats,
      statsBySpecificDay,
      specificDayStats,
    });
  } catch (error) {
    console.error("Erro ao carregar os gráficos:", error);
    res.status(500).render("error", { message: "Erro ao carregar os gráficos." });
  }
};

module.exports = restaurantController;
