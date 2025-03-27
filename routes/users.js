var express = require("express");
var { urlencoded } = require("body-parser");
var router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const validationsController = require("../controllers/validationsController");
const userController = require("../controllers/userController"); // Certifique-se de que este controlador existe

// Aplicar o middleware urlencoded globalmente para todas as rotas
router.use(urlencoded({ extended: false }));

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login"); // Redireciona para login se não estiver autenticado
}

// Página de registro
router.get("/register", function (req, res) {
  res.render("user-register", { formData: {}, error: null });
});

// Processar registro de usuário
router.post("/submitUser", async function (req, res) {
  try {
    const userData = req.body;

    // Chamar o método do controller para registrar o usuário
    await userController.registerUser(userData);

    console.log("Usuário registrado com sucesso!");
    res.status(201).redirect("/users/login");
  } catch (error) {
    console.error("Erro ao registrar o usuário:", error);

    // Renderiza a página de registro novamente com a mensagem de erro
    res.status(400).render("user-register", {
      error: error.message,
      formData: req.body,
    });
  }
});

// Página de login
router.get("/login", function (req, res) {
  res.render("user-login", { error: null });
});

// Processar login
router.post("/login", async function (req, res) {
  try {
    const { email, password } = req.body;

    // Verificar credenciais do usuário
    const user = await userController.verifyCredentials(email, password);

    // Salvar o usuário na sessão
    req.session.user = {
      id: user._id,
      name: user.name,
      nif: user.nif, // Certifique-se de incluir o NIF aqui
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    console.log("Login bem-sucedido:", user);
    res.status(200).redirect("/users/dashboard"); // Redireciona para o dashboard
  } catch (error) {
    console.error("Erro no login:", error);

    // Renderiza a página de login novamente com a mensagem de erro
    res.status(400).render("user-login", {
      error: error.message,
    });
  }
});

// Logout
router.get("/logout", function (req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao encerrar a sessão:", err);
    }
    res.redirect("/users/login"); // Redireciona para a página de login
  });
});

// Dashboard protegido
router.get("/dashboard", isAuthenticated, function (req, res) {
  res.render("user-dashboard", { user: req.session.user }); // Renderiza o dashboard com os dados do usuário
});

router.get("/dashboard/edit", isAuthenticated, function (req, res) {
  res.render("user-edit", { user: req.session.user, error: null });
});

// Processar edição de informações do usuário
// Processar edição de informações do usuário
router.post("/dashboard/edit", isAuthenticated, async function (req, res) {
  try {
    const userId = req.session.user.id; // Obtém o ID do usuário da sessão

    // Extrair os campos diretamente de req.body
    const { name, email, password, newPassword, confirmNewPassword, phone } = req.body;

    console.log(password);
    console.log(newPassword);

    // Chamar o método do controller para atualizar o usuário
    const updatedUser = await userController.updateUser(userId, {
      name,
      email,
      password,
      newPassword,
      confirmNewPassword,
      phone,
    });

    // Atualizar os dados na sessão
    req.session.user = {
      id: updatedUser._id,
      name: updatedUser.name,
      nif: updatedUser.nif,
      phone: updatedUser.phone,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    console.log("Informações do usuário atualizadas:", updatedUser);
    res.redirect("/users/dashboard"); // Redireciona para o dashboard
  } catch (error) {
    console.error("Erro ao atualizar informações do usuário:", error);

    // Renderiza a página de edição novamente com a mensagem de erro
    res.status(400).render("user-edit", {
      user: req.session.user,
      error: error.message,
    });
  }
});

module.exports = router;
