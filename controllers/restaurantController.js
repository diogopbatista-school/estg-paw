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

    validationsController.validateString(name);
    validationsController.validateString(description);
    validationsController.validateLatitude(latitude);
    validationsController.validateLongitude(longitude);
    validationsController.validateNumber(phone);

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

    res.redirect("/restaurants/manage"); // Redireciona para o painel do manager
  } catch (error) {
    console.error("Erro ao criar restaurante:", error);
    res.status(500).render("restaurant-register", { error: "Erro ao criar restaurante." });
  }
};

module.exports = restaurantController;
