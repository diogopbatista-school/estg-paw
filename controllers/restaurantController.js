const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const validationsController = require("../controllers/validationsController");

const restaurantController = {};

// Criar um novo restaurante
restaurantController.createRestaurant = async (req, res) => {
  try {
    // Verificar se o usuário é um manager
    if (req.session.user.role !== "manager") {
      return res.status(403).send("Acesso negado. Apenas managers podem criar restaurantes.");
    }

    const { name, description, latitude, longitude, phone } = req.body;

    // Validações
    try {
      validationsController.validateString(name);
      validationsController.validateString(description);
      validationsController.validateLatitude(latitude);
      validationsController.validateLongitude(longitude);
      validationsController.validateNumber(phone);
    } catch (validationError) {
      // Renderizar novamente o formulário com a mensagem de erro
      return res.status(400).render("restaurant/restaurant-create", {
        error: validationError.message, // Mensagem de erro da validação
        formData: { name, description, latitude, longitude, phone }, // Dados já preenchidos
      });
    }

    // Criar o restaurante
    const newRestaurant = new Restaurant({
      manager: req.session.user.id, // Associa o restaurante ao manager autenticado
      name,
      description,
      location: {
        latitude,
        longitude,
      },
      phone,
    });

    await newRestaurant.save();

    // Adicionar o restaurante ao array de restaurantes do manager
    const manager = await User.findById(req.session.user.id);
    manager.restaurants.push(newRestaurant._id);
    await manager.save();

    // Redirecionar para o painel do manager
    res.redirect("/restaurants/manage");
  } catch (error) {
    console.error("Erro ao criar restaurante:", error);
    res.status(500).render("restaurant/restaurant-create", {
      error: "Erro ao criar restaurante.",
      formData: req.body, // Dados já preenchidos
    });
  }
};

restaurantController.showEditRestaurantForm = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId);

    // Verificar se o restaurante existe
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager.toString() !== req.session.user.id) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Renderizar o formulário de edição
    res.render("restaurant/restaurant-edit", { restaurant, error: null });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição do restaurante:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de edição do restaurante." });
  }
};

restaurantController.updateRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId);

    // Verificar se o restaurante existe
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Verificar se o usuário autenticado é o manager do restaurante
    if (restaurant.manager.toString() !== req.session.user.id) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // Validações
    try {
      validationsController.validateString(req.body.name);
      validationsController.validateString(req.body.description);
      validationsController.validateLatitude(req.body.latitude);
      validationsController.validateLongitude(req.body.longitude);
      validationsController.validateNumber(req.body.phone);
    } catch (validationError) {
      // Renderizar novamente o formulário com a mensagem de erro
      return res.status(400).render("restaurant/restaurant-edit", {
        restaurant,
        error: validationError.message, // Mensagem de erro da validação
      });
    }

    // Atualizar os dados do restaurante
    restaurant.name = req.body.name || restaurant.name;
    restaurant.description = req.body.description || restaurant.description;
    restaurant.phone = req.body.phone || restaurant.phone;
    restaurant.location.latitude = req.body.latitude || restaurant.location.latitude;
    restaurant.location.longitude = req.body.longitude || restaurant.location.longitude;

    await restaurant.save();

    // Redirecionar para o painel de gerenciamento do restaurante
    res.redirect(`/restaurants/manage/${restaurantId}`);
  } catch (error) {
    console.error("Erro ao editar o restaurante:", error);
    res.status(500).render("error", { message: "Erro ao editar o restaurante." });
  }
};

module.exports = restaurantController;
