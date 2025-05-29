const express = require("express");
const router = express.Router();
const orderControllerAPI = require("../../controllers/API/orderControllerAPI");
const { verifyToken } = require("../../middleware/authMiddleware");
const { hybridAuth } = require("../../middleware/hybridAuthMiddleware");

const upload = require("../../uploads/uploadConfig");

// JWT-protected routes (for mobile app users)
// GET /api/orders - Get all orders for logged in user
router.get("/", verifyToken, orderControllerAPI.getAllOrders);

// GET /api/orders/check-blocked - Check if user is blocked from placing orders
router.get("/check-blocked", verifyToken, orderControllerAPI.checkUserBlocked);

// POST /api/orders - Create a new order
router.post("/", verifyToken, orderControllerAPI.createOrder);

// GET /api/orders/user/:userId - Get all orders for a specific user
router.get("/user/:userId", verifyToken, orderControllerAPI.getUserOrders);

// Restaurant-specific routes that need hybrid auth (for dashboard access)
// GET /api/orders/restaurant/:restaurantId - Get all orders for a specific restaurant
router.get("/restaurant/:restaurantId", hybridAuth, orderControllerAPI.getOrdersByRestaurant);

// GET /api/orders/:orderId - Get a specific order
router.get("/:orderId", hybridAuth, orderControllerAPI.getOrder);

// PUT /api/orders/:orderId/status - Update order status
router.put("/:orderId/status", hybridAuth, orderControllerAPI.updateOrderStatus);

// PUT /api/orders/:orderId/cancel - Cancel an order
// Using hybridAuth to support both web dashboard and mobile app requests
router.put("/:orderId/cancel", hybridAuth, orderControllerAPI.cancelOrder);

// Review routes
router.post("/:orderId/review", verifyToken, upload.single("image"), orderControllerAPI.addReview);
router.get("/:orderId/review", verifyToken, orderControllerAPI.getReview);
router.delete("/:orderId/review/:reviewId", verifyToken, orderControllerAPI.deleteReview);

module.exports = router;
