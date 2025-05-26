const express = require("express");
const router = express.Router();
const restaurantControllerAPI = require("../../controllers/API/restaurantControllerAPI");
const orderControllerAPI = require("../../controllers/API/orderControllerAPI");
const { verifyToken, isAdmin } = require("../../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the restaurant uploads directory exists
const uploadDir = path.join(__dirname, "../../uploads/restaurants");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for restaurant image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage }).single("image");

// Public routes (no authentication required)
router.get("/", restaurantControllerAPI.getAllRestaurants);
router.get("/verified", restaurantControllerAPI.getVerifiedRestaurants);
router.get("/featured", restaurantControllerAPI.getFeaturedRestaurants);
router.get("/search", restaurantControllerAPI.searchRestaurants);
router.get("/:restaurantId", restaurantControllerAPI.getRestaurant);
router.get("/:restaurantId/menus", restaurantControllerAPI.getRestaurantAndMenus);
router.get("/:restaurantId/menus-dishes", restaurantControllerAPI.getRestaurantWithMenusAndDishes);
router.get("/by-dish-category/:category", restaurantControllerAPI.getRestaurantsByDishCategory);
router.get("/:restaurantId/orders", orderControllerAPI.getOrdersByRestaurant);

module.exports = router;
