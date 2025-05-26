const axios = require('axios');
const spoonacularConfig = require('../config/api/spoonacularConfig');
const { getFallbackNutritionData } = require('./fallbackNutritionData');

/**
 * Serviço para obter informações nutricionais da API Spoonacular
 */
class NutritionService {
  constructor() {
    this.apiKey = spoonacularConfig.apiKey;
    this.baseUrl = spoonacularConfig.baseUrl;
    console.log("Serviço de Nutrição inicializado com API key:", this.apiKey ? "Configurada" : "Não configurada");
  }

  /**
   * Busca um produto alimentar pelo nome
   * @param {string} foodName - Nome do alimento/prato
   * @returns {Promise} - Promessa com resultados da busca
   */
  async searchFood(foodName) {
    try {
      console.log(`Buscando informações para o alimento: "${foodName}"`);
      
      // Verificar primeiro se temos dados locais de fallback para este item
      const fallbackData = getFallbackNutritionData(foodName);
      if (fallbackData) {
        console.log(`Dados de fallback encontrados para "${foodName}"`);
        // Retorna um objeto compatível com o formato esperado, marcado como fallback
        return [{
          id: `fallback_${foodName.replace(/\s+/g, '_').toLowerCase()}`,
          title: foodName,
          type: 'fallback'
        }];
      }
      
      // Se não tiver dados de fallback, continua com a busca na API
      // Primeiro, tentamos buscar como produto
      let products = await this.searchFoodProducts(foodName);
      
      // Se não encontrar produtos, tenta buscar como receita
      if (!products || products.length === 0) {
        console.log("Nenhum produto encontrado, tentando buscar como receita...");
        products = await this.searchFoodRecipes(foodName);
      }
      
      // Se ainda não encontrou, tenta buscar ingredientes
      if (!products || products.length === 0) {
        console.log("Nenhuma receita encontrada, tentando buscar como ingrediente...");
        products = await this.searchFoodIngredients(foodName);
      }
      
      return products;
    } catch (error) {
      console.error('Erro ao buscar alimento:', error);
      return [];
    }
  }
  
  /**
   * Busca produtos alimentares pelo nome
   */
  async searchFoodProducts(foodName) {
    try {
      const response = await axios.get(`${this.baseUrl}${spoonacularConfig.endpoints.searchFood}`, {
        params: {
          query: foodName,
          apiKey: this.apiKey,
          number: 5
        }
      });
      
      console.log(`Resposta da busca de produtos para "${foodName}":`, 
                  response.data.products ? `${response.data.products.length} resultados` : "Nenhum resultado");
      
      return response.data.products || [];
    } catch (error) {
      console.error('Erro ao buscar produtos:', error.message);
      return [];
    }
  }
  
  /**
   * Busca receitas pelo nome
   */
  async searchFoodRecipes(foodName) {
    try {
      const response = await axios.get(`${this.baseUrl}/recipes/complexSearch`, {
        params: {
          query: foodName,
          apiKey: this.apiKey,
          number: 5
        }
      });
      
      console.log(`Resposta da busca de receitas para "${foodName}":`, 
                  response.data.results ? `${response.data.results.length} resultados` : "Nenhum resultado");
      
      // Adapta o formato para compatibilidade com produtos
      return (response.data.results || []).map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        type: 'recipe'
      }));
    } catch (error) {
      console.error('Erro ao buscar receitas:', error.message);
      return [];
    }
  }
  
  /**
   * Busca ingredientes pelo nome
   */
  async searchFoodIngredients(foodName) {
    try {
      const response = await axios.get(`${this.baseUrl}/food/ingredients/search`, {
        params: {
          query: foodName,
          apiKey: this.apiKey,
          number: 5
        }
      });
      
      console.log(`Resposta da busca de ingredientes para "${foodName}":`, 
                  response.data.results ? `${response.data.results.length} resultados` : "Nenhum resultado");
      
      // Adapta o formato para compatibilidade com produtos
      return (response.data.results || []).map(ingredient => ({
        id: ingredient.id,
        title: ingredient.name,
        image: `${this.baseUrl}/cdn/ingredients_100x100/${ingredient.image}`,
        type: 'ingredient'
      }));
    } catch (error) {
      console.error('Erro ao buscar ingredientes:', error.message);
      return [];
    }
  }

  /**
   * Obter informações nutricionais de um produto específico
   * @param {string} productId - ID do produto na API Spoonacular
   * @param {string} type - Tipo do item (produto, receita, ingrediente ou fallback)
   * @returns {Promise} - Promessa com informações nutricionais
   */
  async getFoodNutritionInfo(productId, type = 'product') {
    try {
      console.log(`Buscando informações nutricionais para ${type} com ID: ${productId}`);
      
      // Se for um item de fallback, busca dados locais
      if (type === 'fallback') {
        const foodName = productId.replace('fallback_', '').replace(/_/g, ' ');
        const fallbackData = getFallbackNutritionData(foodName);
        console.log(`Usando dados de fallback para "${foodName}"`);
        return fallbackData || {
          nutritionalInfo: {},
          nutriScore: null,
          allergens: []
        };
      }
      
      let response;
      
      try {
        if (type === 'recipe') {
          // Buscar informações de receitas
          response = await axios.get(`${this.baseUrl}/recipes/${productId}/nutritionWidget.json`, {
            params: { apiKey: this.apiKey }
          });
        } else if (type === 'ingredient') {
          // Buscar informações de ingredientes
          response = await axios.get(`${this.baseUrl}/food/ingredients/${productId}/information`, {
            params: { 
              apiKey: this.apiKey,
              amount: 100,
              unit: 'grams'
            }
          });
        } else {
          // Buscar informações de produtos (padrão)
          response = await axios.get(`${this.baseUrl}${spoonacularConfig.endpoints.foodInfo}${productId}`, {
            params: { apiKey: this.apiKey }
          });
        }
      } catch (apiError) {
        console.error(`Erro na chamada à API Spoonacular: ${apiError.message}`);
        
        // Tentar buscar dados de fallback como último recurso
        const searchTerms = Array.isArray(productId) ? productId.join(' ') : String(productId);
        const fallbackData = getFallbackNutritionData(searchTerms);
        if (fallbackData) {
          console.log(`Usando dados de fallback após falha na API para ID: ${productId}`);
          return fallbackData;
        }
        
        throw apiError;
      }
      
      console.log(`Resposta obtida para ${type} ${productId}:`, 
                  response.data ? "Dados recebidos" : "Nenhum dado");
      
      // Formatar os dados e verificar se são válidos
      const formattedData = this.formatNutritionData(response.data, type);
      
      // Verificar se os dados nutricionais são válidos (têm pelo menos algumas informações úteis)
      if (!this.isValidNutritionData(formattedData)) {
        console.log("Dados nutricionais inválidos ou insuficientes recebidos da API");
        
        // Tentar encontrar dados de fallback
        const searchTerms = response.data && response.data.title ? response.data.title : String(productId);
        const fallbackData = getFallbackNutritionData(searchTerms);
        if (fallbackData) {
          console.log(`Usando dados de fallback para: ${searchTerms}`);
          return fallbackData;
        }
      }
      
      return formattedData;
    } catch (error) {
      console.error('Erro ao obter informações nutricionais:', error);
      return {
        nutritionalInfo: {},
        nutriScore: null,
        allergens: []
      };
    }
  }

  /**
   * Verifica se os dados nutricionais recebidos são válidos e úteis
   * @param {Object} data - Dados nutricionais formatados
   * @returns {boolean} - Verdadeiro se os dados forem válidos
   */
  isValidNutritionData(data) {
    if (!data || !data.nutritionalInfo) return false;
    
    // Verificar se pelo menos alguns valores nutricionais básicos existem e são maiores que zero
    const { calories, protein, carbs, fat } = data.nutritionalInfo;
    
    // Pelo menos um destes valores deve ser maior que zero para considerarmos útil
    return (calories > 0 || protein > 0 || carbs > 0 || fat > 0);
  }

  /**
   * Formata os dados nutricionais para o formato do nosso modelo
   * @param {Object} apiData - Dados da API Spoonacular
   * @param {string} type - Tipo do item (produto, receita ou ingrediente)
   * @returns {Object} - Dados formatados para o nosso modelo
   */
  formatNutritionData(apiData, type = 'product') {
    // Se não tiver dados, retorna objeto vazio
    if (!apiData) {
      console.log("Sem dados para formatar");
      return {
        nutritionalInfo: {},
        nutriScore: null,
        allergens: []
      };
    }
    
    console.log(`Formatando dados nutricionais para ${type}`);
    
    let nutritionalInfo = {};
    let allergens = [];
    
    try {
      if (type === 'recipe') {
        // Formato para receitas
        nutritionalInfo = {
          calories: this.extractValueFromString(apiData.calories),
          carbs: this.extractValueFromString(apiData.carbs),
          protein: this.extractValueFromString(apiData.protein),
          fat: this.extractValueFromString(apiData.fat),
          // As receitas geralmente não têm informações sobre fibra e açúcar no widget básico
        };
        
        // As alergias nas receitas podem estar em bad_ingredients
        allergens = apiData.bad_ingredients || [];
        
      } else if (type === 'ingredient') {
        // Formato para ingredientes
        const nutrients = apiData.nutrition ? apiData.nutrition.nutrients : [];
        
        nutritionalInfo = {
          calories: this.extractNutrientValue(nutrients, 'Calories'),
          carbs: this.extractNutrientValue(nutrients, 'Carbohydrates'),
          protein: this.extractNutrientValue(nutrients, 'Protein'),
          fat: this.extractNutrientValue(nutrients, 'Fat'),
          fiber: this.extractNutrientValue(nutrients, 'Fiber'),
          sugar: this.extractNutrientValue(nutrients, 'Sugar')
        };
        
        // Alguns ingredientes já têm categorias de alérgenos
        if (apiData.categoryPath) {
          const allergenCategories = ['Dairy', 'Nuts', 'Shellfish', 'Wheat', 'Soy', 'Eggs'];
          allergens = apiData.categoryPath
            .filter(category => allergenCategories.some(allergen => 
              category.toLowerCase().includes(allergen.toLowerCase())
            ));
        }
        
      } else {
        // Formato padrão para produtos
        const nutrients = apiData.nutrition && apiData.nutrition.nutrients 
                          ? apiData.nutrition.nutrients 
                          : [];
        
        nutritionalInfo = {
          calories: this.extractNutrientValue(nutrients, 'Calories'),
          carbs: this.extractNutrientValue(nutrients, 'Carbohydrates'),
          protein: this.extractNutrientValue(nutrients, 'Protein'),
          fat: this.extractNutrientValue(nutrients, 'Fat'),
          fiber: this.extractNutrientValue(nutrients, 'Fiber'),
          sugar: this.extractNutrientValue(nutrients, 'Sugar')
        };
        
        // Extrai alérgenos da resposta da API
        allergens = (apiData.nutrition && apiData.nutrition.allergens) 
                    ? apiData.nutrition.allergens 
                    : [];
                    
        // Outra fonte potencial de alérgenos é a lista de ingredientes
        if (apiData.ingredients && !allergens.length) {
          const commonAllergens = ['milk', 'egg', 'fish', 'shellfish', 'nuts', 'peanuts', 'wheat', 'soy', 'gluten'];
          const ingredients = apiData.ingredients.toLowerCase();
          
          commonAllergens.forEach(allergen => {
            if (ingredients.includes(allergen) && !allergens.includes(allergen)) {
              allergens.push(allergen);
            }
          });
        }
      }
      
      // Garante que todos os valores nutricionais estão presentes
      nutritionalInfo = {
        calories: nutritionalInfo.calories || 0,
        carbs: nutritionalInfo.carbs || 0,
        protein: nutritionalInfo.protein || 0,
        fat: nutritionalInfo.fat || 0,
        fiber: nutritionalInfo.fiber || 0,
        sugar: nutritionalInfo.sugar || 0
      };
      
      console.log("Informações nutricionais extraídas:", nutritionalInfo);
      console.log("Alérgenos identificados:", allergens);
      
      // Calcula NutriScore
      const nutriScore = this.calculateNutriScore(nutritionalInfo);
      
      return {
        nutritionalInfo,
        nutriScore,
        allergens
      };
      
    } catch (error) {
      console.error("Erro ao formatar dados nutricionais:", error);
      return {
        nutritionalInfo: {},
        nutriScore: null,
        allergens: []
      };
    }
  }

  /**
   * Extrai números de strings como "100 calories"
   */
  extractValueFromString(str) {
    if (!str) return null;
    const match = str.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Extrai o valor de um nutriente específico do array de nutrientes
   * @param {Array} nutrients - Array de nutrientes da API
   * @param {string} name - Nome do nutriente a ser extraído
   * @returns {number} - Valor do nutriente
   */
  extractNutrientValue(nutrients, name) {
    if (!nutrients || !Array.isArray(nutrients)) return null;
    
    const nutrient = nutrients.find(n => n.name === name);
    return nutrient ? nutrient.amount : null;
  }

  /**
   * Calcula o NutriScore com base nas informações nutricionais
   * Algoritmo simplificado - para um algoritmo completo, use as regras oficiais do NutriScore
   * @param {Object} nutritionalInfo - Informações nutricionais
   * @returns {string} - NutriScore (A-E)
   */
  calculateNutriScore(nutritionalInfo) {
    // Implementação simplificada do cálculo do NutriScore
    if (!nutritionalInfo.calories) return null;
    
    // Exemplo simples baseado em calorias
    // Na implementação real, considere todos os fatores do NutriScore
    if (nutritionalInfo.calories < 40) return 'A';
    if (nutritionalInfo.calories < 80) return 'B';
    if (nutritionalInfo.calories < 120) return 'C';
    if (nutritionalInfo.calories < 160) return 'D';
    return 'E';
  }
}

module.exports = new NutritionService();