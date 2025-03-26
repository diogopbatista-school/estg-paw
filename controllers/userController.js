const crypto = require("crypto");
const User = require("../models/User");

let userController = {};

// Buscar um único usuário com base em critérios
userController.getUser = (criteria = {}) => {
  return User.findOne(criteria).exec();
};

// Criar um novo usuário
userController.createUser = async (userData) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(userData.password, salt, 1000, 64, "sha512").toString("hex");
  userData.salt = salt;
  userData.password = hash;

  const newUser = new User(userData);
  return await newUser.save();
};

userController.verifyCredentials = async (email, password) => {
  const user = await User.findOne({ email }).exec();
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");
  if (hash !== user.password) {
    throw new Error("Senha incorreta.");
  }

  return user;
};

module.exports = userController;
