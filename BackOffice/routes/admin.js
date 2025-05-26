const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

function isAdmin(req, res, next) {
  if ((req.isAuthenticated() && req.user.role === "admin") || req.user.role === "superAdmin") {
    return next();
  }
  return res.status(403).redirect("/user/login");
}

// Rota para alternar a validação de um restaurante
router.get("/toggle-validation/:restaurantId", isAdmin, adminController.toggleValidation);

module.exports = router;
