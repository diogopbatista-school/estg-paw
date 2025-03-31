const User = require("../models/User");
const bcrypt = require("bcrypt");
const validationsController = require("../controllers/validationsController");

const userController = {};

// Função para carregar o dashboard do usuário
userController.getDashboard = (req, res) => {
  res.render("user/user-dashboard", { user: req.session.user });
};

// Função para carregar a página de edição de informações do usuário
userController.getEditPage = (req, res) => {
  res.render("user/user-edit", { user: req.session.user, error: null });
};

// Função para processar a edição de informações do usuário
userController.updateUser = async (req, res) => {
  try {
    const { name, email, password, newPassword, confirmNewPassword, phone } = req.body;

    // Verificar se a senha atual é necessária para alterar a senha
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

      const isPasswordValidForSecurity = validationsController.validatePassword(newPassword);
      if (!isPasswordValidForSecurity) {
        throw new Error("A nova senha não atende aos critérios de segurança.");
      }
    }

    // Atualizar os dados do usuário
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      {
        name,
        email,
        ...(newPassword && { password: await bcrypt.hash(newPassword, 10) }),
        phone,
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
    res.status(400).render("user/user-edit", { user: req.session.user, error: error.message });
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

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Criar o novo usuário
    const newUser = new User({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      nif: userData.nif,
      phone: userData.phone,
      role: "user", // Define o papel padrão como "user"
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
