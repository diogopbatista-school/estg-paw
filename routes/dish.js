const express = require("express");
const router = express.Router();
const dishController = require("../controllers/dishController");

// Rota para criar um prato
router.post("/restaurants/manage/:restaurantId/menus/:menuId/dishes/create", dishController.createDish);

// Rota para remover um prato
router.post("/restaurants/manage/:restaurantId/menus/:menuId/dishes/:dishId/delete", dishController.removeDish);

module.exports = router;
