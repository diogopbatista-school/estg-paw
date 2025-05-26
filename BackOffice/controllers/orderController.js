const Restaurant = require("../models/Restaurant");
const Menu = require("../models/Menu");
const Dish = require("../models/Dish");
const Order = require("../models/Order");
const User = require("../models/User");
const Review = require("../models/Review");

const menuController = require("./menuController");
const dishController = require("./dishController");
const validationsController = require("./validationsController");
const acessController = require("./acessController");
const userController = require("./userController");

// Import Socket.IO notification functions
const { notifyCustomer, notifyRestaurant, notifyReviewUpdate } = require("../socket/socketConfig");

const orderController = {};

const addOrderLog = async (order, newStatus, description) => {
  const log = {
    status: newStatus,
    timestamp: new Date(),
    description: description,
  };
  order.logs = order.logs || [];
  order.logs.push(log);
  await order.save();
};

/**
 * Counts the number of orders based on the given criteria.
 * @param {Object} criteria - The criteria to filter orders.
 * @returns {Promise<Number>} - The number of orders.
 */
orderController.countDocuments = (criteria = {}) => {
  return Order.countDocuments(criteria).exec();
};

/**
 * Retrieves orders based on the given criteria.
 * @param {Object} criteria - The criteria to filter orders.
 * @returns {Promise<Array>} - The list of orders.
 */
orderController.getOrders = (criteria = {}) => {
  return Order.find(criteria).exec();
};

/**
 * Retrieves a single order based on the given criteria.
 * @param {Object} criteria - The criteria to filter the order.
 * @returns {Promise<Object>} - The order.
 */
orderController.getOrder = (criteria = {}) => {
  return Order.findOne(criteria).exec();
};

/**
 * Creates a new order.
 * @param {Object} orderData - The data for the new order.
 * @returns {Promise<Object>} - The created order.
 */
orderController.createOrder = async (orderData) => {
  try {
    let order = new Order(orderData);

    const restaurant = await validationsController.validateAndFetchById(orderData.restaurant, Restaurant, "Restaurante não encontrado.");

    // atualiza o número do pedido
    const lastOrder = await Order.findOne({ restaurant: restaurant._id }).sort({
      order_number: -1,
    });
    order.order_number = lastOrder ? lastOrder.order_number + 1 : 1;

    // Add initial log
    const log = {
      status: "pending",
      timestamp: new Date(),
      description: "Pedido criado e aguardando confirmação do restaurante",
    };
    order.logs = [log];

    await order.save();

    return order;
  } catch (err) {
    throw new Error("Erro ao criar o pedido: " + err.message);
  }
};

/**
 * Updates an existing order.
 * @param {String} orderId - The ID of the order to update.
 * @param {Object} orderData - The new data for the order.
 * @returns {Promise<Object>} - The updated order.
 */
orderController.updateOrder = async (orderId, orderData) => {
  try {
    if (!orderId) {
      throw new Error("ID do pedido é obrigatório.");
    }

    let order = await Order.findByIdAndUpdate(orderId, orderData, { new: true });
    if (!order) {
      throw new Error("Pedido não encontrado.");
    }

    return order;
  } catch (err) {
    throw new Error("Erro ao atualizar o pedido: " + err.message);
  }
};

/**
 * Renders the order registration form for a specific restaurant.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.renderRegistOrder = async (req, res) => {
  try {
    const { id: restaurantId } = req.params;

    const restaurant = await validationsController.validateEntityAndAccess(restaurantId, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });
    // Verifica se o restaurante tem menus e pratos
    if (!restaurant.menus || restaurant.menus.length === 0) {
      return res.status(404).send("Restaurante não possui menus.");
    }

    let hasDish = false;

    for (const menuId of restaurant.menus) {
      const menu = await Menu.findById(menuId).populate("dishes");
      console.log(menu);

      if (menu && menu.dishes && menu.dishes.length > 0) {
        hasDish = true; // Um prato foi encontrado
        break; // Sai do loop
      }
    }

    // Verifica se nenhum prato foi encontrado após o loop
    if (!hasDish) {
      return res.status(400).render("error", { message: "Restaurante não possui pratos." });
    }

    const menus = await menuController.getMenus({ restaurant: restaurantId });
    const dishes = await dishController.getDishes({
      menuId: { $in: menus.map((menu) => menu._id) },
    });

    res.render("order/register", {
      restaurant,
      menus,
      dishes,
      error: null,
    });
  } catch (error) {
    // apanhar a exceção e a mensagem dela
    const errorMessage = error.message || "Erro ao renderizar o formulário de pedido.";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

//postRegister

/**
 * Registers a new order.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.postRegisterOrder = async (req, res) => {
  try {
    const { customerId, type, cart } = req.body;
    const restaurantId = req.params.id;

    if (!validationsController.validateNumber(customerId)) {
      throw new Error("NIF inválido.");
    }

    const costumer = await userController.getUser({ nif: customerId });
    if (!costumer) {
      throw new Error("Cliente não encontrado.");
    }

    await validationsController.validateEntityAndAccess(restaurantId, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });

    // Validar o tipo de pedido
    if (!["homeDelivery", "takeAway", "eatIn"].includes(type)) {
      return res.status(400).send("Tipo de pedido inválido.");
    }

    // Verificar se o carrinho está vazio
    if (!cart || cart.length === 0) {
      return res.status(400).send("O carrinho está vazio. Adicione pelo menos um prato.");
    }

    // Processar os itens do carrinho
    let cartItems;
    try {
      cartItems = JSON.parse(cart);
    } catch (error) {
      return res.status(400).send("Formato inválido para o carrinho.");
    }

    const orderItems = [];
    let totalPrice = 0;

    for (const item of cartItems) {
      const { id, dose, price, quantity } = item;

      // Validar a quantidade
      if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).send(`Quantidade inválida para o prato com ID ${id}.`);
      }

      // Buscar o prato no banco de dados
      const dish = await Dish.findById(id);
      if (!dish) {
        return res.status(404).send(`Prato com ID ${id} não encontrado.`);
      }

      // Validar o preço com base na dose selecionada
      const doseData = dish.prices.find((p) => p.dose === dose);
      if (!doseData) {
        return res.status(400).send(`Dose '${dose}' não encontrada para o prato '${dish.name}'.`);
      }

      if (parseFloat(price) !== doseData.price) {
        return res.status(400).send(`Preço incorreto para a dose '${dose}' do prato '${dish.name}'.`);
      }

      totalPrice += doseData.price * quantity;

      // Adicionar o item ao pedido
      orderItems.push({
        dish: {
          name: dish.name,
          description: dish.description,
          category: dish.category,
          image: dish.image,
        },
        dose,
        price: doseData.price, // Substituir pelo preço validado
        quantity: parseInt(quantity, 10),
      });
    }

    // Criar o pedido
    const newOrderData = {
      restaurant: restaurantId,
      customer: costumer._id,
      items: orderItems,
      totalPrice,
      status: "pending",
      type: "takeAway", // Atualizado para salvar diretamente como string
    };

    // Salvar o pedido no banco de dados
    const newOrder = await orderController.createOrder(newOrderData);

    costumer.orders.push(newOrder._id);
    await costumer.save();
    console.log("Pedido registrado com sucesso:", costumer);

    // Redirecionar para uma página de sucesso ou o dashboard
    res.redirect(`/restaurants/dashboard/${newOrder.restaurant}`);
  } catch (error) {
    const errorMessage = error.message || "Erro ao renderizar o formulário de pedido.";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

/**
 * Accepts an order and updates its status to "preparing".
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.acceptOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");

    await validationsController.validateEntityAndAccess(order.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });    order.status = "preparing";
    order.accepted_at = new Date();

    // Add log for order acceptance
    await addOrderLog(order, "preparing", "Pedido aceito e em preparação");
    await order.save();

    // Send real-time notifications
    notifyCustomer(
      order.customer.toString(), 
      `Seu pedido #${order.order_number} foi aceito e está sendo preparado!`, 
      order
    );
    
    notifyRestaurant(
      order.restaurant.toString(), 
      `Pedido #${order.order_number} aceito e em preparação`, 
      order
    );

    await emitOrderNotificationToCustomer(req, order._id);

    // Se for AJAX, responde com JSON, senão faz redirect
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, order });
    }

    res.redirect(`/restaurants/dashboard/${order.restaurant}`);
  } catch (error) {
    const errorMessage = error.message || "Erro";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

/**
 * Rejects an order and updates its status to "canceled" with a motive.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.rejectOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { motive } = req.body;

    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");

    await validationsController.validateEntityAndAccess(order.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });

    order.status = "canceled";
    order.motive = motive;
    await order.save();

    // Send real-time notifications
    notifyCustomer(
      order.customer.toString(), 
      `Seu pedido #${order.order_number} foi cancelado. Motivo: ${motive}`, 
      order
    );
    
    notifyRestaurant(
      order.restaurant.toString(), 
      `Pedido #${order.order_number} cancelado`, 
      order
    );

    await emitOrderNotificationToCustomer(req, order._id);

    res.redirect(`/restaurants/dashboard/${order.restaurant}`);
  } catch (error) {
    const errorMessage = error.message || "Erro";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

/**
 * Marks an order as "delivered" and sets the ready_at timestamp.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.readyToDeliver = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");

    const restaurant = await validationsController.validateEntityAndAccess(order.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });    order.status = "delivered";
    order.ready_at = new Date();

    // Add log for order ready state
    await addOrderLog(order, "delivered", "Pedido pronto para entrega");
    await order.save();

    // Send real-time notifications
    notifyCustomer(
      order.customer.toString(), 
      `Seu pedido #${order.order_number} está pronto para ${order.type === 'takeAway' ? 'retirada' : order.type === 'homeDelivery' ? 'entrega' : 'ser servido'}!`, 
      order
    );
    
    notifyRestaurant(
      order.restaurant.toString(), 
      `Pedido #${order.order_number} está pronto para entrega`, 
      order
    );

    await emitOrderNotificationToCustomer(req, order._id);

    // Se for AJAX, responde com JSON, senão faz redirect
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, order });
    }

    res.redirect(`/restaurants/dashboard/${order.restaurant}`);
  } catch (error) {
    const errorMessage = error.message || "Erro";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

/**
 * Finalizes an order and updates the restaurant's order records.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.finishOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");

    const restaurant = await validationsController.validateEntityAndAccess(order.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });    order.status = "finished";
    order.finished_at = new Date();

    // Add log for order completion
    await addOrderLog(order, "finished", "Pedido concluído com sucesso");
    await order.save();

    if (!Array.isArray(restaurant.order_records)) {
      restaurant.order_records = [];
    }

    restaurant.order_records.push(orderId);
    await restaurant.save();    // Send real-time notifications
    notifyCustomer(
      order.customer.toString(), 
      `Seu pedido #${order.order_number} foi concluído com sucesso! Obrigado pela preferência.`, 
      order
    );
    
    notifyRestaurant(
      order.restaurant.toString(), 
      `Pedido #${order.order_number} foi finalizado com sucesso`, 
      order
    );

    await emitOrderNotificationToCustomer(req, order._id);

    // Se for AJAX, responde com JSON, senão faz redirect
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, order });
    }

    res.redirect(`/restaurants/dashboard/${order.restaurant}`);
  } catch (error) {
    const errorMessage = error.message || "Erro ao finalizar o pedido.";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

orderController.renderCancelOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    console.log("ID do pedido:", orderId); // Log do ID do pedido

    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");
    const restaurant = await validationsController.validateAndFetchById(order.restaurant, Restaurant, "Restaurante não encontrado.");
    await validationsController.validateEntityAndAccess(order.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });

    if (order.status === "preparing") {
      return res.status(400).render("error", {
        message: "Não é possível cancelar um pedido que já está sendo preparado.",
        redirectUrl: `/restaurants/dashboard/${restaurant._id}#orders-section`,
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (order.created_at < fiveMinutesAgo) {
      return res.status(400).render("error", {
        message: "Não é possível cancelar um pedido que foi criado há mais de 5 minutos.",
        redirectUrl: `/restaurants/dashboard/${restaurant._id}#orders-section`,
      });
    }

    // Renderiza a página de cancelamento
    return res.render("order/cancel", {
      order,
      orderId: order._id,
      error: null,
    });
  } catch (error) {
    const errorMessage = error.message || "Erro ao renderizar o cancelamento.";
    return res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
    });
  }
};

/**
 * Cancels an order if it meets the criteria (not preparing and within 5 minutes of creation).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
orderController.cancelOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { cancelReason, customReason } = req.body;

    // Valida o pedido
    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");
    const restaurant = await validationsController.validateAndFetchById(order.restaurant, Restaurant, "Restaurante não encontrado.");

    // Valida o restaurante associado ao pedido
    await validationsController.validateEntityAndAccess(order.restaurant, Restaurant, req.user, acessController.hasAccess, "Restaurante não encontrado.", (restaurant) => {
      if (!restaurant.verified) {
        throw new Error("Restaurante não verificado. Você não pode registar pedidos neste restaurante.");
      }
    });

    // Verifica se o pedido está em preparação
    if (order.status === "preparing") {
      return res.status(400).render("error", {
        message: "Não é possível cancelar um pedido que já está sendo preparado.",
        redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
      });
    }

    // Verifica se o pedido foi criado há mais de 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (order.created_at < fiveMinutesAgo) {
      return res.status(400).render("error", {
        message: "Não é possível cancelar um pedido que foi criado há mais de 5 minutos.",
        redirectUrl: `/restaurants/dashboard/${req.params.id}#orders-section`,
      });
    }

    // Atualiza o status e os motivos do cancelamento
    order.status = "canceled";
    order.typeOfcancelation = cancelReason || "other";
    order.motive = customReason || "Motivo não especificado";

    // Add log for order cancellation
    let description = "Pedido cancelado";
    if (cancelReason) {
      description += ` - Razão: ${cancelReason}`;
    }
    if (customReason) {
      description += ` - ${customReason}`;
    }    await addOrderLog(order, "canceled", description);
    await order.save();

    // Adiciona à lista de registros do restaurante
    if (!Array.isArray(restaurant.order_records)) {
      restaurant.order_records = [];
    }
    restaurant.order_records.push(orderId);
    await restaurant.save();

    // Send real-time notifications
    notifyCustomer(
      order.customer.toString(), 
      `Seu pedido #${order.order_number} foi cancelado pelo restaurante. Motivo: ${order.motive}`, 
      order
    );
    
    notifyRestaurant(
      order.restaurant.toString(), 
      `Pedido #${order.order_number} foi cancelado`, 
      order
    );

    await emitOrderNotificationToCustomer(req, order._id);

    // Se for AJAX, responde com JSON, senão faz redirect
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, order });
    }

    res.redirect(`/restaurants/dashboard/${restaurant._id}`);
  } catch (error) {
    console.error("Erro ao cancelar o pedido:", error);
    const errorMessage = error.message || "Erro ao processar o cancelamento do pedido.";
    res.status(500).render("error", {
      message: errorMessage,
      redirectUrl: `/restaurants/dashboard/${restaurant._id}#orders-section`,
    });
  }
};

// DRY helper to emit socket notification to customer after order/log change
const emitOrderNotificationToCustomer = async (req, orderId) => {
  const Order = require("../models/Order");
  const populatedOrder = await Order.findById(orderId)
    .populate("customer", "name email phone")
    .populate("restaurant", "name");
  const io = req.app && req.app.get ? req.app.get('io') : (global.io || null);
  if (io && populatedOrder && populatedOrder.customer && populatedOrder.customer._id) {
    console.log('[Socket] Emitindo orderNotification para sala:', `customer-${populatedOrder.customer._id}`);
    io.to(`customer-${populatedOrder.customer._id}`).emit('orderNotification', {
      type: 'order-status',
      orderData: populatedOrder,
      message: 'O histórico do seu pedido foi atualizado.'
    });
  }
};

// Review functions
/**
 * Creates a review for an order
 */
orderController.createReview = async (orderId, reviewData, userId) => {
  const order = await Order.findById(orderId).populate('restaurant');
  if (!order) {
    throw new Error('Pedido não encontrado');
  }

  if (order.status !== 'finished') {
    throw new Error('Só é possível avaliar pedidos finalizados');
  }

  if (order.review) {
    throw new Error('Este pedido já possui uma avaliação');
  }

  const review = new Review({
    restaurant: order.restaurant._id,
    user: userId,
    rating: reviewData.rating,
    comment: reviewData.comment,
    created_at: new Date()
  });

  await review.save();

  // Update order with review reference
  order.review = review._id;
  await order.save();

  // Update restaurant's reviews array
  await Restaurant.findByIdAndUpdate(
    order.restaurant._id,
    { $push: { reviews: review._id } }
  );

  // Update user's reviews array
  await User.findByIdAndUpdate(
    userId,
    { $push: { reviews: review._id } }
  );

  return review;
};

/**
 * Get a review for an order
 */
orderController.getReview = async (orderId) => {
  const order = await Order.findById(orderId).populate('review');
  if (!order) {
    throw new Error('Pedido não encontrado');
  }

  if (!order.review) {
    throw new Error('Avaliação não encontrada');
  }

  return order.review;
};

/**
 * Delete a review from an order
 */
orderController.deleteReview = async (orderId, reviewId, userId) => {
  const order = await Order.findById(orderId).populate('review');
  if (!order) {
    throw new Error('Pedido não encontrado');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error('Avaliação não encontrada');
  }

  if (review.user.toString() !== userId.toString()) {
    throw new Error('Você não tem permissão para deletar esta avaliação');
  }

  if (review.response) {
    throw new Error('Não é possível deletar uma avaliação que já possui resposta do restaurante');
  }

  // Remove review from order
  order.review = null;
  await order.save();

  // Remove review from restaurant
  await Restaurant.findByIdAndUpdate(
    review.restaurant,
    { $pull: { reviews: review._id } }
  );

  // Remove review from user
  await User.findByIdAndUpdate(
    userId,
    { $pull: { reviews: review._id } }
  );

  await Review.findByIdAndDelete(reviewId);
};

module.exports = orderController;
