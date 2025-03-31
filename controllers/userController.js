const User = require("../models/User");
const bcrypt = require("bcrypt");
const validationsController = require("../controllers/validationsController");

const userController = {};

// Função para carregar o dashboard do usuário
userController.getDashboard = (req, res) => {
  res.render("user/user-dashboard", { user: req.session.user });
};

// Função para carregar a página de edição de informações do usuário
// Função para exibir o formulário de edição de perfil
userController.showEditUserForm = async (req, res) => {
  try {
    const userId = req.session.user.id; // Obtém o ID do usuário logado
    const user = await User.findById(userId); // Busca o usuário no banco de dados

    if (!user) {
      return res.status(404).render("error", { message: "Usuário não encontrado." });
    }

    // Renderiza o formulário de edição com os dados do usuário e do usuário logado
    res.render("user/user-edit", { user, sessionUser: req.session.user });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de edição." });
  }
};

// Função para processar a edição de informações do usuário
userController.updateUser = async (req, res) => {
  try {
    const { name, email, password, newPassword, confirmNewPassword, phone, nif, role } = req.body;

    // Verificar se o e-mail já está em uso por outro usuário
    const existingUser = await User.findOne({ email, _id: { $ne: req.session.user.id } });
    if (existingUser) {
      throw new Error("E-mail já está em uso por outro usuário.");
    }

    // Verificar se o NIF já está em uso por outro usuário
    const existingNif = await User.findOne({ nif, _id: { $ne: req.session.user.id } });
    if (existingNif) {
      throw new Error("NIF já está em uso por outro usuário.");
    }

    // Validar os campos fornecidos
    const validatedName = validationsController.validateString(name);
    const validatedEmail = validationsController.validateEmail(email);
    const validatedPhone = validationsController.validateNumber(phone);
    const validatedNif = validationsController.validateNIF(nif);

    // Verificar se a senha atual é necessária para alterar a senha
    let updatedPassword = null;
    if (newPassword || confirmNewPassword) {
      if (!password) {
        throw new Error("A senha atual é obrigatória para alterar a senha.");
      }

      const user = await User.findById(req.session.user.id);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("A senha atual está incorreta.");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("A nova senha e a confirmação não coincidem.");
      }

      updatedPassword = validationsController.validatePassword(newPassword);
    }

    // Atualizar os dados do usuário
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      {
        name: validatedName,
        email: validatedEmail,
        phone: validatedPhone,
        nif: validatedNif,
        role,
        ...(updatedPassword && { password: updatedPassword }),
      },
      { new: true }
    );

    // Atualizar os dados na sessão
    req.session.user = {
      id: updatedUser._id,
      name: updatedUser.name,
      nif: updatedUser.nif,
      phone: updatedUser.phone,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    res.redirect("/users/dashboard");
  } catch (error) {
    console.error("Erro ao atualizar o usuário:", error);
    res.status(400).render("user/user-edit", {
      user: req.session.user,
      error: error.message || "Erro ao atualizar o usuário.",
    });
  }
};

// Função para registrar um novo usuário
userController.registerUser = async (req, res) => {
  try {
    const userData = req.body;

    // Verificar se o e-mail já está em uso
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).render("user/user-register", {
        error: "E-mail já está em uso.",
        formData: userData,
      });
    }

    const existingNif = await User.findOne({ nif: userData.nif });
    if (existingNif) {
      return res.status(400).render("user/user-register", {
        error: "NIF já está em uso.",
        formData: userData,
      });
    }

    // Criar o novo usuário
    const newUser = new User({
      name: validationsController.validateString(userData.name),
      email: validationsController.validateEmail(userData.email),
      password: validationsController.validatePassword(userData.password),
      nif: validationsController.validateNIF(userData.nif),
      phone: validationsController.validateNumber(userData.phone),
      role: userData.role, // Define o papel padrão como "user"
    });

    await newUser.save();
    console.log("Usuário registrado com sucesso!");
    res.status(201).redirect("/users/login");
  } catch (error) {
    console.error("Erro ao registrar o usuário:", error);
    res.status(400).render("user/user-register", {
      error: error.message || "Erro ao registrar o usuário.",
      formData: req.body,
    });
  }
};

// Função para verificar credenciais de login
userController.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar o usuário pelo e-mail
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("user/user-login", {
        error: "E-mail ou senha inválidos.",
      });
    }

    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).render("user/user-login", {
        error: "E-mail ou senha inválidos.",
      });
    }

    // Salvar o usuário na sessão
    req.session.user = {
      id: user._id,
      name: user.name,
      nif: user.nif,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    console.log("Login bem-sucedido:", user);
    res.status(200).redirect("/users/dashboard");
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).render("user/user-login", {
      error: "Erro ao processar o login.",
    });
  }
};

// Função para fazer logout
userController.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao encerrar a sessão:", err);
    }
    res.redirect("/users/login");
  });
};

module.exports = userController;
