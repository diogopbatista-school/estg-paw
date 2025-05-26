/**
 * Serviço que fornece dados nutricionais de fallback para itens populares de fast food
 * quando a API externa não retorna resultados.
 */
const fallbackFoodData = {
  // McDonald's
  "big mac": {
    nutritionalInfo: {
      calories: 550,
      carbs: 45,
      protein: 25,
      fat: 30,
      fiber: 3,
      sugar: 9
    },
    nutriScore: "E",
    allergens: ["gluten", "leite", "soja", "sésamo"]
  },
  "mcchicken": {
    nutritionalInfo: {
      calories: 400,
      carbs: 40,
      protein: 14,
      fat: 21,
      fiber: 2,
      sugar: 5
    },
    nutriScore: "D",
    allergens: ["gluten", "leite", "soja"]
  },
  "quarter pounder": {
    nutritionalInfo: {
      calories: 520,
      carbs: 42,
      protein: 30,
      fat: 26,
      fiber: 3,
      sugar: 10
    },
    nutriScore: "E",
    allergens: ["gluten", "leite", "soja", "sésamo"]
  },
  "mcnuggets": {
    nutritionalInfo: {
      calories: 300,
      carbs: 18,
      protein: 17,
      fat: 18,
      fiber: 1,
      sugar: 0
    },
    nutriScore: "D",
    allergens: ["gluten", "leite"]
  },
  
  // Burger King
  "whopper": {
    nutritionalInfo: {
      calories: 660,
      carbs: 50,
      protein: 28,
      fat: 40,
      fiber: 2,
      sugar: 11
    },
    nutriScore: "E",
    allergens: ["gluten", "leite", "soja", "sésamo"]
  },
  
  // KFC
  "bucket": {
    nutritionalInfo: {
      calories: 800,
      carbs: 55,
      protein: 45,
      fat: 45,
      fiber: 1,
      sugar: 1
    },
    nutriScore: "E",
    allergens: ["gluten", "leite", "soja"]
  },
  
  // Pizza
  "pizza margherita": {
    nutritionalInfo: {
      calories: 280,
      carbs: 33,
      protein: 12,
      fat: 10,
      fiber: 2,
      sugar: 3
    },
    nutriScore: "C",
    allergens: ["gluten", "leite"]
  },
  "pizza pepperoni": {
    nutritionalInfo: {
      calories: 330,
      carbs: 33,
      protein: 14,
      fat: 14,
      fiber: 2,
      sugar: 3
    },
    nutriScore: "D",
    allergens: ["gluten", "leite"]
  },
  
  // Pratos populares portugueses
  "francesinha": {
    nutritionalInfo: {
      calories: 950,
      carbs: 75,
      protein: 45,
      fat: 50,
      fiber: 3,
      sugar: 10
    },
    nutriScore: "E",
    allergens: ["gluten", "leite", "soja", "ovos"]
  },
  "bacalhau com natas": {
    nutritionalInfo: {
      calories: 450,
      carbs: 30,
      protein: 30,
      fat: 25,
      fiber: 3,
      sugar: 2
    },
    nutriScore: "D",
    allergens: ["peixe", "leite", "gluten"]
  },
  "pastel de nata": {
    nutritionalInfo: {
      calories: 300,
      carbs: 37,
      protein: 5,
      fat: 15,
      fiber: 1,
      sugar: 20
    },
    nutriScore: "D",
    allergens: ["gluten", "leite", "ovos"]
  }
};

/**
 * Obtém dados nutricionais de fallback para um item alimentar
 * @param {string} foodName - Nome do alimento/prato
 * @returns {Object|null} - Dados nutricionais ou null se não encontrado
 */
const getFallbackNutritionData = (foodName) => {
  if (!foodName) return null;
  
  // Normaliza o nome do alimento (remove acentos, converte para minúsculas)
  const normalizedName = foodName.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Verifica correspondências exatas
  if (fallbackFoodData[normalizedName]) {
    return fallbackFoodData[normalizedName];
  }
  
  // Verifica correspondências parciais
  for (const key in fallbackFoodData) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return fallbackFoodData[key];
    }
  }
  
  return null;
};

module.exports = {
  getFallbackNutritionData
};