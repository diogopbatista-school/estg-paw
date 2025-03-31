const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const Menu = require("../models/Menu");

const restaurantController = {};

// Função para listar restaurantes do manager
restaurantController.listRestaurants = async (req, res) => {
  try {
    // Verificar se o usuário é um manager
    if (req.session.user.role !== "manager") {
      return res.status(403).send("Acesso negado. Apenas managers podem acessar esta página.");
    }

    // Extrair filtros de pesquisa da query string
    const searchFilters = {
      name: req.query.name || "",
      description: req.query.description || "",
      location: req.query.location || "",
      phone: req.query.phone || "",
    };

    // Buscar os restaurantes associados ao manager
    const manager = await User.findById(req.session.user.id).populate({
      path: "restaurants",
      match: {
        ...(searchFilters.name && { name: { $regex: searchFilters.name, $options: "i" } }),
        ...(searchFilters.description && { description: { $regex: searchFilters.description, $options: "i" } }),
        ...(searchFilters.location && {
          "location.latitude": { $regex: searchFilters.location, $options: "i" },
        }),
        ...(searchFilters.phone && { phone: { $regex: searchFilters.phone, $options: "i" } }),
      },
    });

    // Renderizar a página com os restaurantes filtrados
    res.render("user/manager-dashboard", {
      user: req.session.user,
      restaurants: manager.restaurants || [],
      searchFilters,
      error: null,
    });
  } catch (error) {
    console.error("Erro ao carregar o painel do manager:", error);
    res.render("user/manager-dashboard", {
      user: req.session.user,
      restaurants: [],
      searchFilters: {}, // Passa um objeto vazio para evitar erros no template
      error: "Erro ao carregar o painel do manager.",
    });
  }
};

// Função para abrir um restaurante específico
restaurantController.getRestaurantDetails = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId).populate("manager");

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager._id.toString() !== req.session.user.id) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Buscar os menus associados ao restaurante
    const menus = await Menu.find({ restaurant: restaurantId });
    console.log("Menus:", menus); // Adicione este log para depuração

    // Renderizar a página do restaurante com os menus
    res.render("restaurant/restaurant-dashboard", { restaurant, menus });
  } catch (error) {
    console.error("Erro ao abrir o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao abrir o restaurante." });
  }
};

// Função para renderizar o formulário de criação de restaurante
restaurantController.renderCreateRestaurantForm = (req, res) => {
  res.render("restaurant/restaurant-create", { error: null });
};

// Função para criar um novo restaurante
restaurantController.createRestaurant = async (req, res) => {
  try {
    console.log(req.body);

    const newRestaurant = new Restaurant({
      name: req.body.name,
      description: req.body.description,
      latitude: req.body.latitude,
      location: {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      },
      phone: req.body.phone,
      manager: req.session.user.id,
    });

    await newRestaurant.save();

    // Associar o restaurante ao manager
    await User.findByIdAndUpdate(req.session.user.id, {
      $push: { restaurants: newRestaurant._id },
    });

    res.redirect("/restaurants/manage");
  } catch (error) {
    console.error("Erro ao criar o restaurante:", error);
    res.render("restaurant/restaurant-create", { error: "Erro ao criar o restaurante." });
  }
};

// Função para renderizar o formulário de edição de restaurante
restaurantController.showEditRestaurantForm = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    res.render("restaurant/restaurant-edit", { restaurant });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de edição." });
  }
};

// Função para atualizar um restaurante
restaurantController.updateRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Atualizar o restaurante
    await Restaurant.findByIdAndUpdate(restaurantId, {
      name: req.body.name,
      description: req.body.description,
      location: req.body.location,
      phone: req.body.phone,
    });

    res.redirect(`/restaurants/manage/${restaurantId}`);
  } catch (error) {
    console.error("Erro ao atualizar o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao atualizar o restaurante." });
  }
};

restaurantController.deleteRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Apagar o restaurante pelo ID
    await Restaurant.findByIdAndDelete(restaurantId);

    res.redirect("/users/manager-dashboard"); // Redirecionar para o painel do gerente
  } catch (error) {
    console.error("Erro ao apagar o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao apagar o restaurante." });
  }
};

module.exports = restaurantController;
