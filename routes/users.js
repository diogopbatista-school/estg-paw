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
    // Validações dos campos usando o ValidationsController
    const userData = {
      name: validationsController.validateString(req.body.name),
      email: validationsController.validateEmail(req.body.email),
      nif: validationsController.validateNIF(req.body.nif),
      password: req.body.password, // Validação será feita abaixo
      role: req.body.role || "client", // Define o papel padrão como "client"
      phone: req.body.phone ? validationsController.validateNumber(req.body.phone) : undefined,
    };

    // Validação da senha
    const isPasswordValid = validationsController.validatePassword(userData.password);
    if (!isPasswordValid) {
      throw new Error("A senha não atende aos critérios de segurança.");
    }

    // Verificar se o NIF ou email já está registrado
    const existingUser = await userController.getUser({ $or: [{ nif: userData.nif }, { email: userData.email }] });
    if (existingUser) {
      throw new Error("Já existe um utilizador com este NIF ou email.");
    }

    // Criar o usuário usando o userController
    await userController.createUser(userData);

    console.log("Usuário registrado com sucesso!");
    res.status(201).redirect("/users/login"); // Redireciona para a página de login após o registro
  } catch (error) {
    console.error("Erro ao registrar o usuário:", error);

    // Renderiza a página de registro novamente com a mensagem de erro e os dados preenchidos
    res.status(400).render("user-register", {
      error: error.message,
      formData: req.body, // Retorna os dados preenchidos para o formulário
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
      email: user.email,
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

module.exports = router;
