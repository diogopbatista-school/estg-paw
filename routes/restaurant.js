var express = require("express");
var router = express.Router();
const User = require("../models/User");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Listar restaurantes do manager
router.get("/manage", isAuthenticated, async (req, res) => {
  try {
    // Verificar se o usuário é um manager
    if (req.session.user.role !== "manager") {
      return res.status(403).send("Acesso negado. Apenas managers podem acessar esta página.");
    }

    // Buscar os restaurantes associados ao manager
    const manager = await User.findById(req.session.user.id).populate("restaurants");
    res.render("manager-dashboard", { restaurants: manager.restaurants });
  } catch (error) {
    console.error("Erro ao carregar o painel do manager:", error);
    res.status(500).send("Erro ao carregar o painel do manager.");
  }
});

module.exports = router;
