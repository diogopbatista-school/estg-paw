const crypto = require("crypto");
const bcrypt = require("bcrypt");
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

userController.updateUser = async (userId, userData) => {
  const { name, email, password, newPassword, confirmNewPassword, phone } = userData;

  // Verificar se a senha atual foi fornecida para alterar a senha
  if (newPassword || confirmNewPassword) {
    if (!password) {
      throw new Error("A senha atual é obrigatória para alterar a senha.");
    }

    // Verificar se a senha atual está correta
    const user = await User.findById(userId);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("A senha atual está incorreta.");
    }

    // Verificar se a nova senha e a confirmação coincidem
    if (newPassword !== confirmNewPassword) {
      throw new Error("A nova senha e a confirmação não coincidem.");
    }

    // Validar os critérios de segurança da nova senha
    const isPasswordValidForSecurity = validationsController.validatePassword(newPassword);
    if (!isPasswordValidForSecurity) {
      throw new Error("A nova senha não atende aos critérios de segurança.");
    }

    // Atualizar a senha no banco de dados
    userData.password = await bcrypt.hash(newPassword, 10);
  }

  // Atualizar os dados do usuário no banco de dados
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      name,
      email,
      phone,
      ...(userData.password && { password: userData.password }), // Atualiza a senha apenas se for fornecida
    },
    { new: true } // Retorna o documento atualizado
  );

  if (!updatedUser) {
    throw new Error("Usuário não encontrado.");
  }

  return updatedUser;
};

module.exports = userController;
