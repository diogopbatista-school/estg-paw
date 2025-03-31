const Restaurant = require("../models/Restaurant");
const User = require("../models/User");

const adminController = {};

// Função para exibir o painel de administrador
adminController.getAdminPanel = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    const users = await User.find();
    res.render("admin/admin-dashboard", { restaurants, users });
  } catch (error) {
    console.error("Erro ao carregar o painel de administrador:", error);
    res.status(500).render("error", { message: "Erro ao carregar o painel de administrador." });
  }
};

// Função para exibir o formulário de edição de um usuário
adminController.showEditUserForm = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).render("error", { message: "Usuário não encontrado." });
    }

    console.log(user);
    console.log(req.session.user);

    // Envia o usuário a ser editado, os papéis disponíveis e o usuário logado
    res.render("user/user-edit", {
      user,
      roles: ["admin", "manager", "client"],
      sessionUser: req.session.user, // Adiciona o usuário logado
    });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição do usuário:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de edição do usuário." });
  }
};

// Função para processar a edição de um usuário
adminController.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    await User.findByIdAndUpdate(userId, {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      role: req.body.role,
    });

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Erro ao atualizar o usuário:", error);
    res.status(500).render("error", { message: "Erro ao atualizar o usuário." });
  }
};

// Função para alternar a validação de um restaurante
adminController.toggleValidation = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    restaurant.verified = !restaurant.verified;
    await restaurant.save();

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Erro ao alternar a validação do restaurante:", error);
    res.status(500).render("error", { message: "Erro ao alternar a validação do restaurante." });
  }
};

// Função para apagar um restaurante
adminController.deleteRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Apagar o restaurante
    await Restaurant.findByIdAndDelete(restaurantId);

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Erro ao apagar o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao apagar o restaurante." });
  }
};

// Função para apagar um usuário
adminController.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Apagar o usuário
    await User.findByIdAndDelete(userId);

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Erro ao apagar o usuário:", error);
    res.status(500).render("error", { message: "Erro ao apagar o usuário." });
  }
};

module.exports = adminController;
