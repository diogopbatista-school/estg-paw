const passport = require("passport");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

const validationsController = require("../controllers/validationsController");
const restaurantController = require("../controllers/restaurantController");
const acessController = require("../controllers/acessController");

// Initialize userController object
const userController = {};

/**
 * Counts the number of users based on given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Number>} Number of matching user documents.
 */
userController.countUsers = (criteria = {}) => {
  return User.countDocuments(criteria).exec();
};

/**
 * Retrieves all users matching the given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Array>} Array of User documents.
 */
userController.getUsers = (criteria = {}) => {
  return User.find(criteria).exec();
};

/**
 * Retrieves a single user matching the given criteria.
 * @param {Object} [criteria={}] - Mongoose query criteria.
 * @returns {Promise<Object>} A User document.
 */
userController.getUser = (criteria = {}) => {
  return User.findOne(criteria).exec();
};

/**
 * Creates a new user in the database.
 * @param {Object} userData - Data for the new user.
 * @returns {Promise<Object>} The created User document.
 * @throws {Error} If user creation fails.
 */
userController.createUser = async (userData) => {
  try {
    let user = new User(userData); // Middleware pre("save") handles password hashing.
    await user.save();
    return user;
  } catch (err) {
    throw new Error("Erro ao criar o utilizador: " + err.message);
  }
};

/**
 * Deletes a user and their associated data (e.g., restaurants).
 * @param {String} userId - The ID of the user to delete.
 * @returns {Promise<void>} Resolves when the user is deleted.
 * @throws {Error} If the user ID is invalid or the user is not found.
 */
userController.deleteUser = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID de utilizador inválido");
  }

  let user = await User.findById(userId).exec();
  if (!user) {
    throw new Error("Utilizador não encontrado");
  }

  if (user.role === "superAdmin") {
    throw new Error("Não é possível apagar um superAdmin");
  }

  // Delete associated restaurants first
  let restaurants = await restaurantController.getRestaurants({ manager: userId });
  if (restaurants.length > 0) {
    for (let restaurant of restaurants) {
      await restaurantController.deleteRestaurant(restaurant._id);
    }
  }

  // Delete profile image if exists
  if (user.profileImage) {
    try {
      const imagePath = path.join(__dirname, "..", user.profileImage);
      await fs.unlink(imagePath);
    } catch (err) {
      console.warn("Falha ao remover imagem de perfil:", err.message);
    }
  }

  await User.deleteOne({ _id: userId });
};

/**
 * Logs out the current user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
userController.logout = async function (req, res, next) {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/user/login");
  });
};

/**
 * Renders the login page.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.renderLogin = async function (req, res) {
  res.render("user/login", { error: "" });
};

/**
 * Authenticates a user and logs them in.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
userController.postLogin = function (req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render("user/login", {
        error: info.message || "Utilizador ou password inválidos",
      });
    }
    if (user.role === "client") {
      return res.render("user/login", {
        error: "Acesso negado. Apenas administradores e gestores podem aceder a esta área.",
      });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.render("user/login", {
          error: "Erro ao iniciar sessão",
        });
      }
      res.redirect("/user/dashboard");
    });
  })(req, res, next);
};

/**
 * Renders the registration page.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.renderRegister = function (req, res) {
  res.render("user/register", { error: "" });
};

/**
 * Helper function to save user profile image
 * @param {Object} req - Express request object
 * @param {Object} user - User to update image for
 */
async function saveProfileImage(req, user) {
  if (!req.file || !req.file.originalname) {
    return;
  }

  const allowedExtensions = [".png", ".jpg", ".jpeg"];
  const extension = path.extname(req.file.originalname).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    throw new Error("Extensão de arquivo não permitida. Use apenas .png, .jpg ou .jpeg.");
  }

  const newImagePath = path.join("uploads/profileImages", `${user._id}${extension}`);

  // Remove old profile image if it exists
  if (user.profileImage) {
    try {
      const oldImagePath = path.join(__dirname, "..", user.profileImage);
      await fs.unlink(oldImagePath);
    } catch (err) {
      console.warn("Falha ao remover imagem antiga:", err.message);
    }
  }

  try {
    await fs.rename(req.file.path, newImagePath);
    user.profileImage = `/uploads/profileImages/${user._id}${extension}`;
    await user.save();
  } catch (err) {
    console.error("Erro ao salvar a imagem de perfil:", err);
    throw new Error("Erro ao salvar a imagem de perfil.");
  }
}

/**
 * Registers a new user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.postRegister = async function (req, res) {
  try {
    if (!validationsController.validateMatchPassword(req.body.password, req.body.confirmPassword)) {
      return res.render("user/register", {
        error: "As senhas não coincidem",
      });
    }

    // Check for existing email
    const existingEmail = await userController.getUser({ email: req.body.email });
    if (existingEmail) {
      return res.render("user/register", {
        error: "Email já está em uso",
      });
    }

    // Check for existing NIF
    const existingNIF = await userController.getUser({ nif: req.body.nif });
    if (existingNIF) {
      return res.render("user/register", {
        error: "NIF já está em uso",
      });
    }

    // Validate all fields
    const newUser = {
      name: validationsController.validateString(req.body.name),
      email: validationsController.validateEmail(req.body.email),
      nif: validationsController.validateNIF(req.body.nif),
      password: validationsController.validatePassword(req.body.password),
      phone: validationsController.validateNumber(req.body.phone),
      role: req.body.role || "client", // Default to client if no role specified
    };

    // Create user
    const user = await userController.createUser(newUser);

    // Handle profile image if uploaded
    if (req.file) {
      await saveProfileImage(req, user);
    }

    // If admin is creating the user, redirect to dashboard
    if (req.user && acessController.isAdmin(req.user)) {
      return res.redirect("/user/dashboard");
    }

    // Otherwise log the new user in
    req.logIn(user, (err) => {
      if (err) {
        return res.render("user/register", {
          error: "Erro ao criar utilizador",
        });
      }
      res.redirect("/user/dashboard");
    });
  } catch (error) {
    res.render("user/register", {
      error: error.message,
    });
  }
};

/**
 * Renders the edit form for a user.
 * Ensures the user is authenticated and authorized to edit the profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.renderEditForm = async function (req, res) {
  try {
    const userId = req.params.userId;

    // Check if user has permission to edit this profile
    if (!acessController.canEditUser(req.user, userId)) {
      return res.status(403).render("error", { message: "Acesso negado!" });
    }

    const user = await userController.getUser({ _id: userId });
    if (!user) {
      return res.status(404).render("error", { message: "Utilizador não encontrado." });
    }

    res.render("user/edit", {
      user,
      loggedInUser: req.user,
      error: null,
    });
  } catch (error) {
    console.error("Erro ao carregar o formulário de edição do utilizador:", error);
    res.status(500).render("error", { message: "Erro ao carregar o formulário de edição do utilizador." });
  }
};

/**
 * Atualiza o perfil do utilizador (usado por API e web)
 * @param {Object} params - Parâmetros para atualização
 * @param {Object} params.req - Express request
 * @param {Object} params.userId - ID do utilizador a editar
 * @param {Object} params.body - Dados do formulário/body
 * @param {Object} params.file - Ficheiro de imagem (opcional)
 * @param {Object} params.loggedUser - Utilizador autenticado (para permissões)
 * @param {Boolean} params.isApi - Se é chamada pela API (true) ou web (false)
 * @returns {Promise<Object>} Utilizador atualizado
 * @throws {Error} Em caso de erro de validação ou permissão
 */
userController.updateUserProfile = async function ({ req, userId, body, file, loggedUser, isApi = false }) {
  // Permissões
  // Corrige _id se vier como id do JWT
  if (loggedUser && !loggedUser._id && loggedUser.id) {
    loggedUser._id = loggedUser.id;
  }
  // Debug permissões
  console.log("canEditUser check:", {
    loggedUser: loggedUser,
    userId: userId,
    loggedUser_id: loggedUser && loggedUser._id,
    userId_type: typeof userId,
  });
  // Garante que userId nunca é undefined
  if (!userId && loggedUser && loggedUser._id) {
    userId = loggedUser._id;
  }
  if (!acessController.canEditUser(loggedUser, userId)) {
    throw new Error("Acesso negado!");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID de utilizador inválido.");
  }

  const { name, email, nif, phone, currentPassword, password, confirmPassword } = body;
  const user = await userController.getUser({ _id: userId });
  if (!user) throw new Error("Utilizador não encontrado.");

  // Se não for admin e está a editar o próprio perfil, pede password atual
  if (loggedUser && loggedUser._id.toString() === userId && !acessController.isAdmin(loggedUser)) {
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) throw new Error("Senha atual incorreta.");
  }

  // Validações
  validationsController.validateString(name);
  validationsController.validateEmail(email);
  validationsController.validateNIF(nif);
  validationsController.validateNumber(phone);

  // Email e NIF únicos
  const existingEmail = await userController.getUser({ email, _id: { $ne: userId } });
  if (existingEmail) throw new Error("Este email já está em uso por outro utilizador.");
  const existingNIF = await userController.getUser({ nif, _id: { $ne: userId } });
  if (existingNIF) throw new Error("Este NIF já está em uso por outro utilizador.");

  // Se mudar password
  if (password || confirmPassword) {
    if (!validationsController.validateMatchPassword(password, confirmPassword)) {
      throw new Error("As senhas não coincidem.");
    }
    validationsController.validatePassword(password);
    user.password = password;
  }

  // Atualiza dados
  user.name = name;
  user.email = email;
  user.nif = nif;
  user.phone = phone;

  // Upload imagem
  if (file) {
    await saveProfileImage(req, user);
  }

  await user.save();
  return user;
};

/**
 * Processes the submission of the user edit form.
 * Validates input fields and updates the user profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.postEditForm = async function (req, res) {
  try {
    await userController.updateUserProfile({
      req,
      userId: req.params.userId,
      body: req.body,
      file: req.file,
      loggedUser: req.user,
      isApi: false,
    });
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Erro ao atualizar o utilizador:", error);
    res.status(500).render("user/edit", {
      user: req.body,
      loggedInUser: req.user,
      error: error.message || "Erro ao atualizar o utilizador.",
    });
  }
};

/**
 * Renders the delete profile confirmation page.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.renderDeleteProfile = async function (req, res) {
  try {
    const userId = req.params.userId || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).render("error", { message: "ID de utilizador inválido." });
    }

    const user = await userController.getUser({ _id: userId });

    if (!user) {
      return res.status(404).render("error", { message: "Utilizador não encontrado" });
    }

    // SuperAdmin cannot be deleted
    if (user.role === "superAdmin") {
      return res.status(403).render("error", { message: "Não é possível apagar um superAdmin." });
    }

    // Check if user has permission to delete this profile
    if (!acessController.canEditUser(req.user, userId)) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    res.render("user/deleteProfile", {
      title: "Apagar Perfil",
      user: user,
      loggedInUser: req.user,
      error: "",
    });
  } catch (err) {
    console.error("Erro ao carregar o formulário de exclusão:", err);
    res.render("error", {
      message: err.message,
      error: err,
    });
  }
};

/**
 * Processes the deletion of a user profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
userController.postDeleteProfile = async function (req, res, next) {
  try {
    const userId = req.params.userId || req.user._id;
    const user = await userController.getUser({ _id: userId });

    if (!user) {
      return res.render("user/deleteProfile", {
        error: "Utilizador não encontrado",
      });
    }

    if (user.role === "superAdmin") {
      return res.status(403).render("error", { message: "Não é possível apagar um superAdmin." });
    }

    // Check if user has permission to delete this profile
    if (!acessController.canEditUser(req.user, userId)) {
      return res.status(403).render("error", { message: "Acesso negado." });
    }

    // If not an admin and deleting own profile, verify password
    if (!acessController.isAdmin(req.user) && req.user._id.toString() === userId) {
      if (!validationsController.validateMatchPassword(req.body.password, req.body.confirmPassword)) {
        return res.render("user/deleteProfile", {
          error: "As senhas não coincidem",
          user: user,
          loggedInUser: req.user,
        });
      }

      const isPasswordValid = await user.comparePassword(req.body.password);
      if (!isPasswordValid) {
        return res.render("user/deleteProfile", {
          error: "Senha incorreta",
          user: user,
          loggedInUser: req.user,
        });
      }
    }

    // Delete the user
    await userController.deleteUser(userId);

    // If deleting own account, logout
    if (req.user._id.toString() === userId) {
      req.logout((err) => {
        if (err) {
          return next(err);
        }
        return res.redirect("/");
      });
    } else {
      res.redirect("/user/dashboard");
    }
  } catch (err) {
    console.error("Erro ao apagar o perfil:", err);
    res.render("error", {
      message: err.message,
      error: err,
    });
  }
};

/**
 * Renders the user dashboard with filtered data.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
userController.renderDashboard = async function (req, res) {
  try {
    const restaurantQuery = {};
    const userQuery = {};
    const { name, phone, description, latitude, longitude, verified, userName, userEmail, userPhone, userRole, sort } = req.query;

    // Build restaurant query filters
    if (name) restaurantQuery.name = { $regex: name, $options: "i" };

    if (phone) {
      const parsedPhone = parseInt(phone, 10);
      if (!isNaN(parsedPhone)) {
        restaurantQuery.phone = parsedPhone;
      } else {
        return res.status(400).render("error", { message: "Formato de número de telefone inválido." });
      }
    }

    if (description) restaurantQuery.description = { $regex: description, $options: "i" };
    if (latitude) restaurantQuery["location.latitude"] = parseFloat(latitude);
    if (longitude) restaurantQuery["location.longitude"] = parseFloat(longitude);
    if (verified === "true" || verified === "false") restaurantQuery.verified = verified === "true";

    // Build user query filters
    if (userName) userQuery.name = { $regex: userName, $options: "i" };
    if (userEmail) userQuery.email = { $regex: userEmail, $options: "i" };
    if (userPhone) userQuery.phone = parseInt(userPhone);
    if (userRole) userQuery.role = { $regex: userRole, $options: "i" };

    // Function to calculate average price for restaurants
    const calculateAveragePrices = (restaurants) => {
      for (const restaurant of restaurants) {
        if (restaurant.menus && restaurant.menus.length > 0) {
          // Calculate average price for each menu
          const menuAvgPrices = restaurant.menus.map((menu) => {
            if (menu.dishes && menu.dishes.length > 0) {
              // Calculate average price for each dish in the menu
              const dishAvgPrices = menu.dishes.map((dish) => {
                if (dish.prices && dish.prices.length > 0) {
                  return dish.prices.reduce((sum, p) => sum + p.price, 0) / dish.prices.length;
                }
                return 0;
              });
              // Average price for the menu: sum of dish averages / number of dishes
              return dishAvgPrices.reduce((sum, avg) => sum + avg, 0) / menu.dishes.length;
            }
            return 0;
          });

          // Average price for the restaurant: sum of menu averages / number of menus
          restaurant.average_price = menuAvgPrices.reduce((sum, avg) => sum + avg, 0) / restaurant.menus.length;
        } else {
          restaurant.average_price = 0;
        }
      }
      return restaurants;
    };

    // Dashboard data based on user role
    if (acessController.isAdmin(req.user)) {
      // Admin dashboard data
      const [numberOfUsers, numberOfRestaurants, numberOfRestaurantsValidated, numberOfRestaurantsNotValidated, numberOfClients, numberOfManagers, numberOfAdmins, restaurants, users] = await Promise.all([
        userController.countUsers({}),
        restaurantController.countDocuments({}),
        restaurantController.countDocuments({ verified: true }),
        restaurantController.countDocuments({ verified: false }),
        userController.countUsers({ role: "client" }),
        userController.countUsers({ role: "manager" }),
        userController.countUsers({ role: "admin" }),
        Restaurant.find(restaurantQuery)
          .populate({
            path: "menus",
            populate: {
              path: "dishes",
              model: "Dish",
            },
          })
          .exec(),
        userController.getUsers(userQuery),
      ]);

      // Calculate average price for each restaurant
      calculateAveragePrices(restaurants);

      // Aplicar ordenação após calcular os preços médios
      if (sort === "asc") {
        restaurants.sort((a, b) => a.average_price - b.average_price);
      } else if (sort === "desc") {
        restaurants.sort((a, b) => b.average_price - a.average_price);
      }

      const adminData = {
        restaurants,
        users,
        numberOfUsers,
        numberOfRestaurants,
        numberOfRestaurantsValidated,
        numberOfRestaurantsNotValidated,
        numberOfClients,
        numberOfManagers,
        numberOfAdmins,
      };

      return res.render("user/dashboard", {
        title: "Dashboard",
        user: req.user,
        adminData,
        managerData: null,
        query: req.query,
        error: "",
        currentUser: req.user,
      });
    } else if (req.user.role === "manager") {
      // Manager dashboard data
      const managerRestaurantQuery = { ...restaurantQuery, manager: req.user._id };

      const [numberOfRestaurants, numberOfRestaurantsValidated, numberOfRestaurantsNotValidated, restaurants] = await Promise.all([
        restaurantController.countDocuments({ manager: req.user._id }),
        restaurantController.countDocuments({ manager: req.user._id, verified: true }),
        restaurantController.countDocuments({ manager: req.user._id, verified: false }),
        Restaurant.find(managerRestaurantQuery)
          .populate({
            path: "menus",
            populate: {
              path: "dishes",
              model: "Dish",
            },
          })
          .exec(),
      ]);

      // Calculate average price for each restaurant
      calculateAveragePrices(restaurants);

      // Aplicar ordenação após calcular os preços médios
      if (sort === "asc") {
        restaurants.sort((a, b) => a.average_price - b.average_price);
      } else if (sort === "desc") {
        restaurants.sort((a, b) => b.average_price - a.average_price);
      }

      const managerData = {
        numberOfRestaurants,
        numberOfRestaurantsValidated,
        numberOfRestaurantsNotValidated,
        restaurants,
      };

      return res.render("user/dashboard", {
        title: "Dashboard",
        user: req.user,
        adminData: null,
        managerData,
        query: req.query,
        error: "",
        currentUser: req.user,
      });
    } else {
      // Client dashboard (or other roles)
      return res.render("user/dashboard", {
        title: "Dashboard",
        user: req.user,
        adminData: null,
        managerData: null,
        query: req.query,
        error: "",
        currentUser: req.user,
      });
    }
  } catch (err) {
    console.error("Erro ao carregar o dashboard:", err);
    res.status(500).render("error", {
      message: "Erro ao carregar o dashboard",
      error: err,
    });
  }
};

/**
 * Pesquisa usuários por termo de busca e role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
userController.searchUsers = async function(req, res) {
  try {
    const { term, role } = req.query;
    
    // Critérios de busca
    const criteria = {
      role: role || 'client', // Se não especificado, busca clientes
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: term.match(/^[0-9]+$/) ? parseInt(term) : null }
      ].filter(c => c.phone !== null) // Remove critério de telefone se não for número
    };

    const users = await User.find(criteria)
      .select('name email _id')
      .limit(10)
      .exec();

    res.json(users);
  } catch (error) {
    console.error('Erro na pesquisa de usuários:', error);
    res.status(500).json({ error: 'Erro ao pesquisar usuários' });
  }
};

module.exports = userController;
