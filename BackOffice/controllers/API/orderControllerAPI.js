const Order = require("../../models/Order");
const Review = require("../../models/Review");
const orderController = require("../orderController");
const validationsController = require("../validationsController");
const Restaurant = require("../../models/Restaurant");
const User = require("../../models/User");
const Voucher = require("../../models/Voucher");
const Dish = require("../../models/Dish");
const fs = require("fs");
const path = require("path");
const { notifyCustomer, notifyRestaurant, notifyReviewUpdate } = require("../../socket/socketConfig");

const orderControllerAPI = {};

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
 * Creates a new order via API
 * @param {Object} req - Request object containing order data
 * @param {Object} res - Response object
 */
orderControllerAPI.createOrder = async (req, res) => {
  try {
    const { customerId, restaurantId, items, type, deliveryAddress, totalPrice, voucherDiscount, appliedVoucher } = req.body;

    console.log("Received order data:", req.body);

    // Validate customer exists
    const customer = await validationsController.validateAndFetchById(customerId, User, "Cliente não encontrado.");

    // Check if customer is blocked
    if (customer.isBlocked && customer.blockedUntil && new Date() < customer.blockedUntil) {
      return res.status(403).json({
        success: false,
        message: `Sua conta está temporariamente bloqueada devido a cancelamentos excessivos. Você poderá fazer novos pedidos após ${customer.blockedUntil.toLocaleDateString("pt-BR")}.`,
        isBlocked: true,
        blockedUntil: customer.blockedUntil,
      });
    }

    // Validate restaurant exists
    const restaurant = await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurante não encontrado.");

    // Validate delivery address for home delivery orders
    if (type === "homeDelivery" && (!deliveryAddress || deliveryAddress.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Endereço de entrega é obrigatório para pedidos de entrega em casa.",
      });
    }

    // Transform items to match Order schema
    // Frontend sends: {name, quantity, price, dose, dishId}
    // Order model expects: {dish: {name, description, category, image}, dose, price, quantity}
    const transformedItems = [];

    for (const item of items) {
      // Look up dish information if dishId is provided
      let dishInfo = {
        name: item.name,
        description: null,
        category: null,
        image: null,
      };

      if (item.dishId) {
        try {
          const dish = await Dish.findById(item.dishId);
          if (dish) {
            dishInfo = {
              name: dish.name,
              description: dish.description || null,
              category: dish.category || null,
              image: dish.image || null,
            };
          }
        } catch (error) {
          console.log(`Warning: Could not find dish with ID ${item.dishId}, using item name`);
        }
      }

      transformedItems.push({
        dish: dishInfo,
        dose: item.dose,
        price: item.price,
        quantity: item.quantity,
      });
    }

    console.log("Transformed items for Order model:", transformedItems);

    // Process voucher if applied
    let voucherSnapshot = null;
    if (appliedVoucher && voucherDiscount > 0) {
      console.log("🎫 Processando voucher:", {
        appliedVoucher,
        voucherDiscount,
        customerId,
      });

      const voucher = await Voucher.findById(appliedVoucher);

      if (!voucher) {
        console.log("❌ Voucher não encontrado:", appliedVoucher);
        return res.status(400).json({
          success: false,
          message: "Voucher não encontrado",
        });
      }

      if (!voucher.isActive) {
        console.log("❌ Voucher inativo:", appliedVoucher);
        return res.status(400).json({
          success: false,
          message: "Voucher já foi utilizado",
        });
      }

      if (new Date(voucher.expirationDate) <= new Date()) {
        console.log("❌ Voucher expirado:", appliedVoucher);
        return res.status(400).json({
          success: false,
          message: "Voucher expirado",
        });
      }

      console.log("🎫 Voucher antes do processamento:", {
        id: voucher._id,
        discount: voucher.discount,
        isActive: voucher.isActive,
      });

      // Helper function to round to 2 decimal places to avoid floating point precision issues
      const roundToTwoDecimals = (value) => Math.round(value * 100) / 100; // Apply voucher discount
      const remainingVoucherValue = roundToTwoDecimals(voucher.discount - voucherDiscount);

      console.log("💰 Cálculo do voucher:", {
        originalValue: voucher.discount,
        discountApplied: voucherDiscount,
        remainingValue: remainingVoucherValue,
        comparison: `${remainingVoucherValue} <= 0 = ${remainingVoucherValue <= 0}`,
      });

      // Update voucher values
      if (remainingVoucherValue <= 0) {
        voucher.discount = 0;
        voucher.isActive = false;
      } else {
        voucher.discount = remainingVoucherValue;
      }
      await voucher.save();
      // Guardar snapshot do voucher original
      voucherSnapshot = {
        code: voucher.code,
        discount: voucher.discount + voucherDiscount, // valor original ANTES de descontar
        description: voucher.description,
        expirationDate: voucher.expirationDate,
        _id: voucher._id,
      };
    }
    const orderData = {
      customer: customerId,
      restaurant: restaurantId,
      items: transformedItems,
      type: type,
      deliveryAddress: deliveryAddress || null,
      totalPrice: totalPrice,
      voucherDiscount: voucherDiscount || 0,
      appliedVoucher: voucherSnapshot || null,
      status: "pending",
      logs: [
        {
          status: "pending",
          timestamp: new Date(),
          description: "Pedido criado e aguardando confirmação do restaurante",
        },
      ],
    };
    const order = await orderController.createOrder(orderData);
    customer.order_records.push(order._id);
    restaurant.order_records.push(order._id);
    await customer.save();
    await restaurant.save();

    // Send notifications
    notifyRestaurant(restaurantId, `Novo pedido #${order.order_number} recebido de ${customer.name}`, order);

    notifyCustomer(customerId, `Pedido #${order.order_number} criado com sucesso! Aguardando confirmação do restaurante.`, order);

    res.status(201).json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating order",
    });
  }
};

/**
 * Get orders for a specific user via API
 * @param {Object} req - Request object containing user ID
 * @param {Object} res - Response object
 */
orderControllerAPI.getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Looking for orders for user:", userId);

    // Validate user exists
    const user = await validationsController.validateAndFetchById(userId, User, "User not found");

    // Get orders for user with populated review data
    const orders = await Order.find({ customer: userId })
      .populate("restaurant", "name")
      .populate({
        path: "review",
        populate: [
          { path: "user", select: "name" },
          { path: "restaurant", select: "name" },
        ],
      })
      .sort({ created_at: -1 });

    // Format the dates in the response
    const formattedOrders = orders.map((order) => {
      const orderObj = order.toObject();

      // Format order dates
      orderObj.createdAt = order.created_at?.toISOString();
      orderObj.acceptedAt = order.accepted_at?.toISOString();
      orderObj.readyAt = order.ready_at?.toISOString();
      orderObj.finishedAt = order.finished_at?.toISOString();

      // Format review dates if exists
      if (orderObj.review) {
        orderObj.review.created_at = new Date(orderObj.review.created_at).toISOString();
        if (orderObj.review.response?.created_at) {
          orderObj.review.response.created_at = new Date(orderObj.review.response.created_at).toISOString();
        }
      }

      // Format log timestamps
      if (orderObj.logs) {
        orderObj.logs = orderObj.logs.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString(),
        }));
      }

      // Remove the _v and original date fields
      delete orderObj.__v;
      delete orderObj.created_at;
      delete orderObj.accepted_at;
      delete orderObj.ready_at;
      delete orderObj.finished_at;

      return orderObj;
    });

    // DEBUG: Log the orders being sent to the frontend
    console.log("[API] Returning orders for user:", userId, JSON.stringify(formattedOrders, null, 2));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching user orders",
    });
  }
};

/**
 * Get all orders for the logged in user via API
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
orderControllerAPI.getAllOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Get logged in user ID from auth middleware
    console.log("Looking for all orders for user:", userId);

    // Validate user exists
    const user = await validationsController.validateAndFetchById(userId, User, "User not found");

    // Get orders for user with populated review data
    const orders = await Order.find({ customer: userId })
      .populate("restaurant", "name")
      .populate({
        path: "review",
        populate: [
          { path: "user", select: "name" },
          { path: "restaurant", select: "name" },
        ],
      })
      .sort({ created_at: -1 });

    // Format the dates in the response
    const formattedOrders = orders.map((order) => {
      const orderObj = order.toObject();

      // Format order dates
      orderObj.createdAt = order.created_at?.toISOString();
      orderObj.acceptedAt = order.accepted_at?.toISOString();
      orderObj.readyAt = order.ready_at?.toISOString();
      orderObj.finishedAt = order.finished_at?.toISOString();

      // Format review dates if exists
      if (orderObj.review) {
        orderObj.review.created_at = new Date(orderObj.review.created_at).toISOString();
        if (orderObj.review.response?.created_at) {
          orderObj.review.response.created_at = new Date(orderObj.review.response.created_at).toISOString();
        }
      }

      // Format log timestamps
      if (orderObj.logs) {
        orderObj.logs = orderObj.logs.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString(),
        }));
      }

      // Remove the _v and original date fields
      delete orderObj.__v;
      delete orderObj.created_at;
      delete orderObj.accepted_at;
      delete orderObj.ready_at;
      delete orderObj.finished_at;

      return orderObj;
    });

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching all orders",
    });
  }
};

/**
 * Cancel order from API
 */
orderControllerAPI.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { motive, cancelReason } = req.body;

    // Validate and get order
    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado");

    // Get customer information
    const customer = await validationsController.validateAndFetchById(order.customer, User, "Cliente não encontrado");

    // Determine if cancellation is by customer or restaurant
    let isCancellationByRestaurant = false;
    
    // If user has restaurant role or is admin, or cancelReason is explicitly set to "restaurant"
    if (
      (req.user && (req.user.role === 'restaurant' || req.user.role === 'admin' || req.user.role === 'superAdmin')) ||
      cancelReason === 'restaurant'
    ) {
      isCancellationByRestaurant = true;
    }

    // Only check for customer blocks if customer is cancelling
    if (!isCancellationByRestaurant) {
      // Check if customer is currently blocked
      if (customer.isBlocked && customer.blockedUntil && new Date() < customer.blockedUntil) {
        throw new Error("Não é possível cancelar pedidos. Sua conta está temporariamente bloqueada devido a cancelamentos excessivos.");
      }
    }

    // Check if order can be cancelled
    if (order.status === "preparing") {
      throw new Error("Não é possível cancelar um pedido que já está sendo preparado");
    }

    // Check if order was created within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (order.created_at < fiveMinutesAgo) {
      throw new Error("Não é possível cancelar um pedido que foi criado há mais de 5 minutos");
    }

    // Update order status
    order.status = "canceled";
    
    // Set cancellation type based on who's cancelling
    order.typeOfcancelation = isCancellationByRestaurant ? "restaurant" : "customer";
    
    // Set appropriate cancellation message
    if (isCancellationByRestaurant) {
      order.motive = motive || "Cancelado pelo restaurante";
    } else {
      order.motive = motive || "Cancelado pelo cliente";
    }
    await addOrderLog(order, "canceled", `Pedido cancelado pelo cliente${motive ? ` - Motivo: ${motive}` : ""}`);

    // Process voucher refund if applicable
    if (order.voucherDiscount > 0 && order.appliedVoucher) {
      try {
        // The appliedVoucher field might be an ObjectId reference or a snapshot object
        // Check which format we have and handle accordingly
        let voucherId;
        if (typeof order.appliedVoucher === 'object' && order.appliedVoucher !== null) {
          // It's a snapshot with _id property
          voucherId = order.appliedVoucher._id;
          
          console.log("🎫 Processando reembolso de voucher (formato snapshot):", {
            voucherId: voucherId,
            discountToRefund: order.voucherDiscount
          });
        } else {
          // It's a direct ObjectId reference
          voucherId = order.appliedVoucher;
          
          console.log("🎫 Processando reembolso de voucher (formato ObjectId):", {
            voucherId: voucherId,
            discountToRefund: order.voucherDiscount
          });
        }

        // Helper function to round to 2 decimal places to avoid floating point precision issues
        const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

        // Find the original voucher
        const voucher = await Voucher.findById(voucherId);
        if (voucher) {
          // Calculate new discount value after refund
          const newDiscountValue = roundToTwoDecimals(voucher.discount + order.voucherDiscount);
          
          console.log("💰 Cálculo do reembolso do voucher:", {
            voucherId: voucher._id,
            code: voucher.code,
            currentValue: voucher.discount,
            refundAmount: order.voucherDiscount,
            newValue: newDiscountValue,
            wasActive: voucher.isActive
          });

          // Update voucher values
          voucher.discount = newDiscountValue;
          
          // Reactivate voucher if it was inactive
          if (!voucher.isActive) {
            voucher.isActive = true;
          }
          
          await voucher.save();
          
          // Log the voucher refund - using a valid status that exists in the schema
          await addOrderLog(
            order, 
            "canceled", // Use an existing valid status instead of "refund-voucher"
            `Valor do voucher ${voucher.code} reembolsado em €${order.voucherDiscount.toFixed(2)}`
          );
          
          console.log(`✅ Voucher ${voucher.code} reembolsado com sucesso. Novo valor: €${newDiscountValue.toFixed(2)}`);
        } else {
          console.log(`❌ Voucher com ID ${voucherId} não encontrado para reembolso`);
        }
      } catch (voucherError) {
        console.error("Erro ao processar reembolso do voucher:", voucherError);
      }
    }

    await order.save();

    // Only apply customer cancellation penalties if it's a customer-initiated cancellation
    if (order.typeOfcancelation === "customer") {
      console.log(`Processing customer cancellation penalties for order #${order.order_number}`);
      
      // Update customer cancellation tracking
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

      // Reset counter if it's a new month
      if (customer.lastCancellationMonth !== currentMonth) {
        customer.monthlyCancellations = 0;
        customer.lastCancellationMonth = currentMonth;
      }

      // Increment cancellation counter
      customer.monthlyCancellations += 1;

      // Check if customer should be blocked (5 cancellations in a month)
      if (customer.monthlyCancellations >= 5) {
        customer.isBlocked = true;
        customer.blockedUntil = new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000); // 2 months from now

        console.log(`Customer ${customer.name} (${customer.email}) has been blocked until ${customer.blockedUntil} for excessive cancellations (${customer.monthlyCancellations} cancellations this month)`);

        // Notify customer about the block
        notifyCustomer(order.customer.toString(), `Sua conta foi temporariamente bloqueada por 2 meses devido a cancelamentos excessivos (${customer.monthlyCancellations} cancelamentos este mês). Você poderá fazer novos pedidos após ${customer.blockedUntil.toLocaleDateString("pt-BR")}.`, null);
      }

      await customer.save();
    } else {
      console.log(`Restaurant cancellation for order #${order.order_number}. Customer will not be penalized.`);
    }

    // Emit socket notification to customer after log/status change
    await emitOrderNotificationToCustomer(req, order._id);

    // Send appropriate real-time notifications based on who cancelled
    if (order.typeOfcancelation === "restaurant") {
      notifyCustomer(order.customer.toString(), `Seu pedido #${order.order_number} foi cancelado pelo restaurante. Motivo: ${order.motive}`, order);
      notifyRestaurant(order.restaurant.toString(), `Pedido #${order.order_number} foi cancelado pelo restaurante. Motivo: ${order.motive}`, order);
    } else {
      notifyCustomer(order.customer.toString(), `Seu pedido #${order.order_number} foi cancelado com sucesso.`, order);
      notifyRestaurant(order.restaurant.toString(), `Pedido #${order.order_number} foi cancelado pelo cliente${motive ? ` - Motivo: ${motive}` : ""}`, order);
    }

    res.status(200).json({
      success: true,
      order: order,
      customerBlocked: customer.isBlocked,
      blockedUntil: customer.blockedUntil,
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error canceling order",
    });
  }
};

/**
 * Creates a new review for an order
 */
orderControllerAPI.addReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    // Validate order exists and is finished
    const order = await Order.findById(orderId).populate("restaurant");
    if (!order) {
      return res.status(404).json({ success: false, message: "Pedido não encontrado" });
    }

    if (order.status !== "finished") {
      return res.status(400).json({
        success: false,
        message: "Só é possível avaliar pedidos finalizados",
      });
    }

    if (order.review) {
      return res.status(400).json({
        success: false,
        message: "Este pedido já possui uma avaliação",
      });
    }

    // Handle image upload if present
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/reviews/${req.file.filename}`;
    }

    // Create review without response field
    const review = new Review({
      restaurant: order.restaurant._id,
      user: userId,
      rating,
      comment,
      image: imagePath,
      created_at: new Date(),
      response: undefined, // This ensures no response field is created
    });

    await review.save();

    // Update order with review reference
    order.review = review._id;
    await order.save();

    // Update restaurant's reviews array
    await Restaurant.findByIdAndUpdate(order.restaurant._id, { $push: { reviews: review._id } });

    // Update user's reviews array
    await User.findByIdAndUpdate(userId, { $push: { reviews: review._id } });

    // Calculate and update restaurant's average rating
    const restaurant = await Restaurant.findById(order.restaurant._id).populate("reviews");
    if (restaurant && restaurant.reviews && restaurant.reviews.length > 0) {
      const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / restaurant.reviews.length;

      // Update restaurant's average rating (rounded to 2 decimal places)
      restaurant.average_rating = Math.round(averageRating * 100) / 100;
      await restaurant.save();
    }

    // Get the populated review
    const populatedReview = await Review.findById(review._id).populate("user", "name").lean();

    // Format the date
    populatedReview.created_at = new Date(populatedReview.created_at).toISOString();

    // Remove response field if it exists but has no content
    if (populatedReview.response && !populatedReview.response.text) {
      delete populatedReview.response;
    }

    res.status(201).json(populatedReview);
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao adicionar avaliação",
    });
  }
};

/**
 * Gets a review for an order
 */
orderControllerAPI.getReview = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate("review");
    if (!order) {
      return res.status(404).json({ success: false, message: "Pedido não encontrado" });
    }

    if (!order.review) {
      return res.status(404).json({ success: false, message: "Avaliação não encontrada" });
    }

    res.status(200).json({
      success: true,
      review: order.review,
    });
  } catch (error) {
    console.error("Error getting review:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao buscar avaliação",
    });
  }
};

/**
 * Deletes a review from an order
 */
orderControllerAPI.deleteReview = async (req, res) => {
  try {
    const { orderId, reviewId } = req.params;
    const userId = req.user._id;

    console.log("Delete review request:", { orderId, reviewId, userId });

    // Validate order exists
    const order = await Order.findById(orderId).populate("review");
    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(404).json({ success: false, message: "Pedido não encontrado" });
    }

    if (!order.review) {
      console.log("Order has no review:", orderId);
      return res.status(404).json({ success: false, message: "Avaliação não encontrada" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      console.log("Review not found:", reviewId);
      return res.status(404).json({ success: false, message: "Avaliação não encontrada" });
    }

    console.log("Review details:", {
      reviewUserId: review.user.toString(),
      requestUserId: userId.toString(),
      hasResponse: !!review.response,
      response: review.response,
    }); // Check if user owns the review
    if (review.user.toString() !== userId.toString()) {
      console.log("User does not own review");
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para deletar esta avaliação",
      });
    }

    // User can delete their review even if restaurant has responded
    console.log("User owns review, proceeding with deletion");

    // Delete image file if it exists
    if (review.image) {
      try {
        const imagePath = path.join(__dirname, "../../", review.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log("Review image deleted:", imagePath);
        }
      } catch (error) {
        console.warn("Failed to delete review image:", error.message);
        // Continue with review deletion even if image deletion fails
      }
    }

    // Remove review from order
    order.review = null;
    await order.save();

    // Remove review from restaurant
    await Restaurant.findByIdAndUpdate(review.restaurant, { $pull: { reviews: review._id } });

    // Remove review from user
    await User.findByIdAndUpdate(userId, { $pull: { reviews: review._id } });

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    // Recalculate restaurant's average rating after deletion
    const restaurant = await Restaurant.findById(review.restaurant).populate("reviews");
    if (restaurant) {
      if (restaurant.reviews && restaurant.reviews.length > 0) {
        const totalRating = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / restaurant.reviews.length;
        restaurant.average_rating = Math.round(averageRating * 100) / 100;
      } else {
        // No reviews left, reset average rating to 0
        restaurant.average_rating = 0;
      }
      await restaurant.save();
    }

    res.status(200).json({
      success: true,
      message: "Avaliação removida com sucesso",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao deletar avaliação",
    });
  }
};

/**
 * Get all orders for a specific restaurant
 */
orderControllerAPI.getOrdersByRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Validate restaurant exists
    await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurante não encontrado.");

    const orders = await Order.find({ restaurant: restaurantId }).populate("customer", "name email phone").sort({ created_at: -1 });

    // Format the orders with consistent date fields
    const formattedOrders = orders.map((order) => {
      const orderObj = order.toObject();

      // Ensure consistent date field naming for frontend
      orderObj.createdAt = order.created_at?.toISOString();
      orderObj.acceptedAt = order.accepted_at?.toISOString();
      orderObj.readyAt = order.ready_at?.toISOString();
      orderObj.finishedAt = order.finished_at?.toISOString();

      // Format log timestamps
      if (orderObj.logs) {
        orderObj.logs = orderObj.logs.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString(),
        }));
      }

      // Remove the original underscore date fields to avoid confusion
      delete orderObj.created_at;
      delete orderObj.accepted_at;
      delete orderObj.ready_at;
      delete orderObj.finished_at;
      delete orderObj.__v;

      return orderObj;
    });

    res.status(200).json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching restaurant orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao buscar pedidos do restaurante.",
    });
  }
};

/**
 * Get a specific order by ID
 */
orderControllerAPI.getOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate("customer", "name email phone").populate("restaurant", "name").populate("appliedVoucher", "code discount");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado",
      });
    }

    // Format the order object with consistent date fields
    const orderObj = order.toObject();

    // Ensure consistent date field naming for frontend
    orderObj.createdAt = order.created_at?.toISOString();
    orderObj.acceptedAt = order.accepted_at?.toISOString();
    orderObj.readyAt = order.ready_at?.toISOString();
    orderObj.finishedAt = order.finished_at?.toISOString();

    // Format log timestamps
    if (orderObj.logs) {
      orderObj.logs = orderObj.logs.map((log) => ({
        ...log,
        timestamp: new Date(log.timestamp).toISOString(),
      }));
    }

    // Remove the original underscore date fields to avoid confusion
    delete orderObj.created_at;
    delete orderObj.accepted_at;
    delete orderObj.ready_at;
    delete orderObj.finished_at;
    delete orderObj.__v;

    res.status(200).json({
      success: true,
      order: orderObj,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao buscar pedido",
    });
  }
};

/**
 * Update order status
 */
orderControllerAPI.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    // Validate order exists
    const order = await validationsController.validateAndFetchById(orderId, Order, "Pedido não encontrado.");

    // Validate restaurant access (for security)
    await validationsController.validateAndFetchById(order.restaurant, Restaurant, "Restaurante não encontrado.");

    // Update status and timestamps
    const oldStatus = order.status;
    order.status = status;

    switch (status) {
      case "preparing":
        order.accepted_at = new Date();
        await addOrderLog(order, "preparing", "Pedido aceito e em preparação");
        break;
      case "delivered":
        order.ready_at = new Date();
        await addOrderLog(order, "delivered", "Pedido pronto para entrega");
        break;
      case "finished":
        order.finished_at = new Date();
        await addOrderLog(order, "finished", "Pedido concluído com sucesso");
        break;
      default:
        await addOrderLog(order, status, `Status alterado para ${status}`);
    }
    await order.save();

    // Emit socket notification to customer after log/status change
    await emitOrderNotificationToCustomer(req, order._id);

    // Reload order com dados populados para notificação
    const populatedOrder = await Order.findById(order._id).populate("customer", "name email phone").populate("restaurant", "name");

    // Notificação socket para o cliente (FrontOffice)
    const io = req.app.get("io");
    if (io && populatedOrder.customer && populatedOrder.customer._id) {
      io.to(`customer-${populatedOrder.customer._id}`).emit("orderNotification", {
        type: "order-status",
        orderData: populatedOrder,
        message: "O histórico do seu pedido foi atualizado.",
      });
    }

    // Send real-time notifications
    const statusMessages = {
      preparing: "foi aceito e está sendo preparado",
      delivered: "está pronto para entrega",
      finished: "foi concluído com sucesso",
    };

    const customerMessage = statusMessages[status] || `teve o status alterado para ${status}`;

    notifyCustomer(populatedOrder.customer._id.toString(), `Seu pedido #${populatedOrder.order_number} ${customerMessage}!`, populatedOrder);
    notifyRestaurant(populatedOrder.restaurant._id.toString(), `Pedido #${populatedOrder.order_number} ${customerMessage}`, populatedOrder);
    res.status(200).json({
      success: true,
      message: "Status do pedido atualizado com sucesso",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao atualizar status do pedido",
    });
  }
};

/**
 * Check if user is blocked from placing orders
 */
orderControllerAPI.checkUserBlocked = async (req, res) => {
  try {
    const userId = req.user._id; // Get logged in user ID from auth middleware

    // Validate user exists
    const user = await validationsController.validateAndFetchById(userId, User, "User not found");

    // Check if user is blocked
    if (user.isBlocked && user.blockedUntil && new Date() < user.blockedUntil) {
      return res.status(200).json({
        success: true,
        isBlocked: true,
        blockedUntil: user.blockedUntil,
        message: `Sua conta está temporariamente bloqueada devido a cancelamentos excessivos. Você poderá fazer novos pedidos após ${user.blockedUntil.toLocaleDateString("pt-BR")}.`,
      });
    }

    // User is not blocked
    res.status(200).json({
      success: true,
      isBlocked: false,
      blockedUntil: null,
      message: "User is not blocked",
    });
  } catch (error) {
    console.error("Error checking user block status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error checking user block status",
    });
  }
};

// DRY helper to emit socket notification to customer after order/log change
const emitOrderNotificationToCustomer = async (req, orderId) => {
  const Order = require("../../models/Order");
  const populatedOrder = await Order.findById(orderId).populate("customer", "name email phone").populate("restaurant", "name");
  const io = req.app.get("io");
  if (io && populatedOrder && populatedOrder.customer && populatedOrder.customer._id) {
    io.to(`customer-${populatedOrder.customer._id}`).emit("orderNotification", {
      type: "order-status",
      orderData: populatedOrder,
      message: "O histórico do seu pedido foi atualizado.",
    });
  }
};

module.exports = orderControllerAPI;
