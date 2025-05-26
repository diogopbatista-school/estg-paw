const mongoose = require("mongoose");

let validationsController = {};

/**
 * Validates if two passwords match.
 * @param {string} password - The password.
 * @param {string} confirmPassword - The confirmation password.
 * @throws {Error} If the passwords do not match.
 */
validationsController.validatePasswordsMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    throw new Error("A senha e a confirmação não coincidem.");
  }
};

/**
 * Validates a string input.
 * @param {string} string - The string to validate.
 * @returns {string} The trimmed and validated string.
 * @throws {Error} If the string is invalid or missing.
 */
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

/**
 * Validates an email address.
 * @param {string} email - The email to validate.
 * @returns {string} The validated email.
 * @throws {Error} If the email is invalid or missing.
 */
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

/**
 * Validates a numeric input.
 * @param {number} number - The number to validate.
 * @returns {number} The validated number.
 * @throws {Error} If the number is invalid or missing.
 */
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

/**
 * Validates a Portuguese NIF (tax identification number).
 * @param {number} nif - The NIF to validate.
 * @returns {number} The validated NIF.
 * @throws {Error} If the NIF is invalid or missing.
 */
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

/**
 * Validates a password based on security criteria.
 * @param {string} password - The password to validate.
 * @returns {string} The validated password.
 * @throws {Error} If the password is invalid or missing.
 */
validationsController.validatePassword = (password) => {
  if (typeof password === "undefined") {
    throw new Error("Campo Palavra-passe em Falta");
  }
  password = validationsController.validateString(password);
  let result =
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) && // At least one uppercase letter
    /[a-z]/.test(password) && // At least one lowercase letter
    /[0-9]/.test(password) && // At least one number
    /[\W_]/.test(password); // At least one special character
  if (!result) {
    throw new Error("Palavra-passe Inválida");
  }
  return password;
};

/**
 * Validates if two passwords match.
 * @param {string} password - The password.
 * @param {string} confirmPassword - The confirmation password.
 * @returns {boolean} True if the passwords match.
 * @throws {Error} If the passwords do not match.
 */
validationsController.validateMatchPassword = (password, confirmPassword) => {
  if (typeof password === "undefined" || typeof confirmPassword === "undefined") {
    throw new Error("Campo Palavra-passe em Falta");
  }

  password = validationsController.validateString(password);
  confirmPassword = validationsController.validateString(confirmPassword);
  let result = password === confirmPassword;
  if (!result) {
    throw new Error("As palavras-passe não coincidem");
  }
  return true;
};

/**
 * Validates a date input.
 * @param {string} date - The date to validate.
 * @returns {string} The validated date.
 * @throws {Error} If the date is invalid or missing.
 */
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

/**
 * Validates a start and end date.
 * Ensures the start date is at least 30 minutes in the past and within 5 years.
 * Ensures the end date is after the start date and within 5 years.
 * @param {string} startDate - The start date.
 * @param {string} endDate - The end date.
 * @throws {Error} If the dates are invalid or do not meet the criteria.
 */
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

/**
 * Validates a latitude value.
 * @param {number} latitude - The latitude to validate.
 * @returns {number} The validated latitude.
 * @throws {Error} If the latitude is invalid or missing.
 */
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

/**
 * Validates a longitude value.
 * @param {number} longitude - The longitude to validate.
 * @returns {number} The validated longitude.
 * @throws {Error} If the longitude is invalid or missing.
 */
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

/**
 * Validates a boolean value.
 * @param {string} boolean - The boolean value to validate.
 * @returns {string} The validated boolean value.
 * @throws {Error} If the boolean value is invalid or missing.
 */
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

/**
 * Validates a price value.
 * @param {number} price - The price to validate.
 * @returns {number} The validated price.
 * @throws {Error} If the price is invalid or missing.
 */
validationsController.validatePrice = (price) => {
  if (typeof price === "undefined") {
    throw new Error("Campo Preço em Falta");
  }
  let result = !isNaN(price) && price >= 0;
  if (!result) {
    throw new Error("Preço Inválido");
  }
  return price;
};

/**
 * Validates an entity by ID and checks if the user has access to it
 * @param {String} id - The ID of the entity to validate
 * @param {Model} model - The Mongoose model to query
 * @param {Object} user - The user object to check for access permissions
 * @param {Function} accessCheck - Function that determines if the user has access to the entity
 * @param {String} notFoundMessage - Error message to display if entity not found
 * @param {Function} [additionalChecks] - Optional additional validation function to run on the entity
 * @returns {Promise<Object>} The validated entity
 * @throws {Error} If the entity is not found or user doesn't have access
 */
validationsController.validateEntityAndAccess = async (id, model, user, accessCheck, notFoundMessage, additionalChecks) => {
  const entity = await validationsController.validateAndFetchById(id, model, notFoundMessage);

  if (additionalChecks) {
    additionalChecks(entity);
  }

  const hasAccess = accessCheck(user, entity);
  if (!hasAccess) {
    throw new Error("Acesso negado. Você não tem permissão para realizar esta ação.");
  }

  return entity;
};

/**
 * Validates an ObjectId and fetches the corresponding document.
 * @param {String} id - The ObjectId to validate.
 * @param {Model} model - The Mongoose model to query.
 * @param {String} errorMessage - The error message to throw if validation fails.
 * @returns {Promise<Object>} - The fetched document.
 * @throws {Error} - Throws an error if the ID is invalid or the document is not found.
 */

validationsController.validateAndFetchById = async (id, model, errorMessage) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID inválido.");
  }

  const document = await model.findById(id);
  if (!document) {
    throw new Error(errorMessage);
  }

  return document;
};

module.exports = validationsController;





