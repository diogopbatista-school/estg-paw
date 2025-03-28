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

  validationsController.validateString(name); // Valida o nome
  validationsController.validateEmail(email); // Valida o email
  validationsController.validateNIF(nif); // Valida o NIF
  validationsController.validateNumber(phone); // Valida o telefone

  validationsController.validatePasswordsMatch(password, confirmPassword);

  validationsController.validatePassword(password);

  // Verificar se o NIF ou email já está registrado
  const existingUser = await User.findOne({ $or: [{ nif }, { email }] });
  if (existingUser) {
    throw new Error("Já existe um utilizador com este NIF ou email.");
  }

  // Gerar o hash da senha
  const saltRounds = 10; // Número de rounds para o salt
  const hash = await bcrypt.hash(password, saltRounds); // Com o bcrypt nao é preciso guardar o salt na DB

  // Criar o usuário
  const newUser = new User({
    name,
    email,
    nif,
    password: hash,
    role: role || "client",
    phone,
  });

  await newUser.save();
  return newUser;
};

// Verificar credenciais do usuário
userController.verifyCredentials = async (email, password) => {
  const user = await User.findOne({ email }).exec();
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  // Comparar a senha fornecida com o hash armazenado
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Senha incorreta.");
  }

  return user;
};

// Atualizar informações do usuário
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

    // Gerar o hash da nova senha
    const saltRounds = 10;
    userData.password = await bcrypt.hash(newPassword, saltRounds);
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
