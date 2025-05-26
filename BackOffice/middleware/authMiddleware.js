const jwt = require("jsonwebtoken");

// Verificar se temos um arquivo de configuração JWT ou usar um fallback
let jwtSecret;
try {
  const config = require("../jwt_secret/config");
  jwtSecret = config.secret;
} catch (error) {
  console.warn("JWT config file not found, using fallback secret");
  jwtSecret = "estg-paw-secret-key";
}

/**
 * Middleware para verificar se o token JWT é válido
 */
const verifyToken = (req, res, next) => {
  // Pegar o token do cabeçalho Authorization
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
  }

  try {    // Verificar o token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Adicionar o usuário decodificado ao objeto de requisição
    // Ensure _id is available for backward compatibility
    req.user = {
      ...decoded,
      _id: decoded.id // Map id to _id for consistency
    };
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

/**
 * Middleware para verificar se o usuário é admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  if (req.user.role !== "admin" && req.user.role !== "superAdmin") {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }

  next();
};

/**
 * Middleware para verificar se o usuário é o proprietário do restaurante
 */
const isRestaurantOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  // Verificar se o restaurante pertence ao usuário ou se é admin
  if (req.user.role === "admin" || req.user.role === "superAdmin") {
    return next(); // Admins têm acesso total
  }

  // Para implementar a verificação de proprietário, precisamos obter o restaurante
  // Esta é uma implementação básica, você pode precisa adaptar
  const restaurantId = req.params.id;

  if (req.user.restaurants && req.user.restaurants.includes(restaurantId)) {
    return next();
  }

  return res.status(403).json({ message: "Acesso negado. Você não é o proprietário deste restaurante." });
};

module.exports = {
  verifyToken,
  isAdmin,
  isRestaurantOwner,
};
