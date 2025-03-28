let validationsController = {};

validationsController.validatePasswordsMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    throw new Error("A senha e a confirmação não coincidem.");
  }
};

validationsController.validateString = (string) => {
  if (typeof string === "undefined" || string === null) {
    throw new Error("Campo de Texto em Falta");
  }
  string = string.trim();
  let result = typeof string === "string" && string.length > 0;
  if (!result) {
    throw new Error("String Inválida");
  }
  return string;
};

validationsController.validateEmail = (email) => {
  if (typeof email === "undefined" || email === null) {
    throw new Error("Campo Email em Falta");
  }
  email = email.trim();
  let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let isValidEmail = emailRegex.test(email);
  if (!isValidEmail) {
    throw new Error("Email Inválido");
  }
  return email;
};

validationsController.validateNumber = (number) => {
  if (typeof number === "undefined") {
    throw new Error("Campo Númérico em Falta");
  }
  let result = !isNaN(number) && number >= 0;
  if (!result) {
    throw new Error("Número Inválido");
  }
  return number;
};

validationsController.validateNIF = (nif) => {
  if (typeof nif === "undefined") {
    throw new Error("Campo NIF em Falta");
  }
  nif = validationsController.validateNumber(nif);
  let result = String(nif).length === 9;
  if (!result) {
    throw new Error("NIF Inválido");
  }
  return nif;
};

validationsController.validatePassword = (password) => {
  if (typeof password === "undefined") {
    throw new Error("Campo Palavra-passe em Falta");
  }
  password = validationsController.validateString(password);
  let result =
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) && // Pelo menos uma letra maiúscula
    /[a-z]/.test(password) && // Pelo menos uma letra minúscula
    /[0-9]/.test(password) && // Pelo menos um número
    /[\W_]/.test(password); // Pelo menos um caractere especial
  if (!result) {
    throw new Error("Palavra-passe Inválida");
  }
  return password;
};

validationsController.validateDate = (date) => {
  if (typeof date === "undefined") {
    throw new Error("Campo Data em Falta");
  }
  let result = !isNaN(Date.parse(date));
  if (!result) {
    throw new Error("Data Inválida");
  }
  return date;
};

validationsController.validateStartDateEndDate = (startDate, endDate) => {
  let start = new Date(startDate);
  let end = new Date(endDate);
  if (start <= new Date().setMinutes(new Date().getMinutes() - 30)) {
    throw new Error("A data de início tem de ser no minimo há 30 minutos.");
  }
  if (end < start) {
    throw new Error("A data de fim tem de ser superior à data de início.");
  }
  if (start.getFullYear() < new Date().getFullYear() - 5) {
    throw new Error("A data de início tem de ser inferior a 5 anos.");
  }
  if (end.getFullYear() < new Date().getFullYear() - 5) {
    throw new Error("A data de fim tem de ser inferior a 5 anos.");
  }
};

validationsController.validateLatitude = (latitude) => {
  if (typeof latitude === "undefined") {
    throw new Error("Campo Latitude em Falta");
  }
  let result = !isNaN(latitude) && latitude >= -90 && latitude <= 90;
  if (!result) {
    throw new Error("Latitude Inválida");
  }
  return latitude;
};

validationsController.validateLongitude = (longitude) => {
  if (typeof longitude === "undefined") {
    throw new Error("Campo Longitude em Falta");
  }
  let result = !isNaN(longitude) && longitude >= -180 && longitude <= 180;
  if (!result) {
    throw new Error("Longitude Inválida");
  }
  return longitude;
};

validationsController.validateAge = (age) => {
  if (typeof age === "undefined") {
    throw new Error("Campo Idade em Falta");
  }
  let result = age === "young" || age === "junior" || age === "adult" || age === "senior";
  if (!result) {
    throw new Error("Idade Inválida");
  }
  return age;
};

validationsController.validateBoolean = (boolean) => {
  if (typeof boolean === "undefined") {
    throw new Error("Campo Booleano em Falta");
  }
  let result = boolean === "true" || boolean === "false";
  if (!result) {
    throw new Error("Booleano Inválido");
  }
  return boolean;
};

module.exports = validationsController;
