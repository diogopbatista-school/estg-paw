const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");

// Middleware para verificar autenticação e autorização para manager e admin
const isAuthorized = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === "manager" || req.user.role === "admin" || req.user.role === "superAdmin")) {
    return next();
  } else {
    req.flash("error_msg", "Você não tem permissão para acessar esta página.");
    return res.redirect("/");
  }
};

// Rota para renderizar o formulário de criação de menu (apenas para managers)
router.get("/register/:idRestaurant", isAuthorized, menuController.renderCreateMenuForm);

// Rota para processar a criação de um novo menu (apenas para managers)
router.post("/submitRegister", isAuthorized, menuController.postCreateMenu);

router.get("/edit/:id", isAuthorized, menuController.renderEditMenuForm);

router.post("/submitEdit/:id", isAuthorized, menuController.postEditMenu);

router.post("/delete/:idMenu", isAuthorized, menuController.deleteMenuHandler);

module.exports = router;
