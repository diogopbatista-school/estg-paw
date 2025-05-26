// Configuração para a API Spoonacular
require('dotenv').config();

module.exports = {
  apiKey: process.env.SPOONACULAR_API_KEY || '0fe694eb177a43ddb591bcabe96a69aa',
  baseUrl: 'https://api.spoonacular.com',
  endpoints: {
    searchFood: '/food/products/search',
    foodInfo: '/food/products/',
    nutritionInfo: '/food/ingredients/{id}/information',
    allergens: '/food/ingredients/{id}/information'
  }
};