const Restaurant = require("../models/Restaurant");

const adminController = {};

/**
 * Alterna o status de verificação de um restaurante.
 *
 * @function toggleValidation
 * @memberof adminController
 * @async
 * @param {Object} req - Objeto de requisição Express.
 * @param {Object} res - Objeto de resposta Express.
 * @returns {void}
 *
 * @example
 * // Rota que usa esse controller:
 * // GET /admin/validate/:restaurantId
 *
 * // Se o restaurante existir, altera seu status de verificado (true/false)
 * // e redireciona para o dashboard. Caso contrário, retorna erro 404.
 */
adminController.toggleValidation = async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Buscar o restaurante pelo ID
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).render("error", { message: "Restaurante não encontrado." });
    }

    // Alternar o status de validação
    restaurant.verified = !restaurant.verified;
    await restaurant.save();

    // Redirecionar de volta ao painel de administração
    res.redirect("/user/dashboard");
  } catch (error) {
    res.status(500).render("error", { message: "Erro ao alternar validação do restaurante." });
  }
};

module.exports = adminController;
