const crypto = require("crypto");
const User = require("../models/User");

let validationsController = require("./validationsController");

let userController = {};

// Buscar um único usuário com base em critérios
userController.getUser = (criteria = {}) => {
  return User.findOne(criteria).exec();
};

// Criar um novo usuário
userController.registerUser = async (userData) => {
  const { name, email, nif, password, confirmPassword, phone, role } = userData;

  console.log(password);
  console.log(confirmPassword);

  // Verificar se as senhas coincidem
  if (password !== confirmPassword) {
    throw new Error("A senha e a confirmação não coincidem.");
  }

  // Validar os critérios de segurança da senha
  const isPasswordValid = validationsController.validatePassword(password);
  if (!isPasswordValid) {
    throw new Error("A senha não atende aos critérios de segurança.");
  }

  // Gerar o salt e o hash da senha
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  // Verificar se o NIF ou email já está registrado
  const existingUser = await User.findOne({ $or: [{ nif }, { email }] });
  if (existingUser) {
    throw new Error("Já existe um utilizador com este NIF ou email.");
  }

  // Criar o usuário
  const newUser = new User({
    name,
    email,
    nif,
    password: hash,
    salt,
    role: role || "client",
    phone,
  });

  await newUser.save();
  return newUser;
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
