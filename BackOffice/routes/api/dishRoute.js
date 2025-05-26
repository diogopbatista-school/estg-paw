const express = require("express");
const router = express.Router();
const dishControllerAPI = require("../../controllers/API/dishControllerAPI");
/**
 * @route GET /api/dishes/menu/:menuId
 * @desc Get all dishes from a specific menu with optional filters
 * @access Public
 */
router.get("/menu/:menuId", dishControllerAPI.getDishesFromMenu);

/**
 * @route GET /api/dishes/restaurant/:restaurantId
 * @desc Get all dishes from a restaurant with optional filters
 * @access Public
 */
router.get("/restaurant/:restaurantId", dishControllerAPI.getDishesFromRestaurant);

/**
 * @route GET /api/dishes/categories
 * @desc Get all dish categories
 * @access Public
 */
router.get("/categories", dishControllerAPI.getAllCategories);

/**
 * @route GET /api/dishes/check-name
 * @desc Check if a dish name can be recognized by the nutrition API
 * @access Public
 */
router.get("/check-name", dishControllerAPI.checkDishName);

module.exports = router;
