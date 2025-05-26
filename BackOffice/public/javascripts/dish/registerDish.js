// Função para adicionar mais campos de preço
function addPriceField() {
  const container = document.getElementById("price-container");
  const newField = document.createElement("div");
  newField.classList.add("mb-3", "price-row");
  newField.innerHTML = `
    <div class="row">
      <div class="col-md-5">
        <label for="dose" class="form-label">Dose</label>
        <input
          type="text"
          class="form-control"
          name="doses[]"
          placeholder="Ex.: Pequena, Média, Grande"
          required />
      </div>
      <div class="col-md-5">
        <label for="price" class="form-label">Preço</label>
        <input
          type="number"
          step="0.01"
          class="form-control"
          name="prices[]"
          placeholder="Digite o preço"
          required />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button
          type="button"
          class="btn btn-danger btn-sm"
          onclick="removePriceField(this)">
          Remover
        </button>
      </div>
    </div>
  `;
  container.appendChild(newField);
}

function removePriceField(button) {
  const priceRow = button.closest(".price-row");
  priceRow.remove();
}

function showNewCategoryField() {
  const categorySelect = document.getElementById("category");
  const newCategoryContainer = document.getElementById("new-category-container");
  const categoryContainer = document.getElementById("category-container");

  // Oculta o select e desmarca o "required" pra não causar erro
  categorySelect.style.display = "none";
  categorySelect.required = false;

  // Mostra o input de nova categoria e marca como required
  newCategoryContainer.style.display = "block";
  document.getElementById("newCategory").required = true;

  // Opcional: pode ocultar o container do botão "Outra categoria"
  categoryContainer.querySelector("button").style.display = "none";
}

function hideNewCategoryField() {
  const categorySelect = document.getElementById("category");
  const newCategoryContainer = document.getElementById("new-category-container");
  const categoryContainer = document.getElementById("category-container");

  // Mostra o select novamente e restaura o required
  categorySelect.style.display = "";
  categorySelect.required = true;

  // Esconde o input de nova categoria e remove o required
  newCategoryContainer.style.display = "none";
  document.getElementById("newCategory").required = false;
  document.getElementById("newCategory").value = ""; // Limpa o valor

  // Mostra o botão "Outra categoria" novamente
  categoryContainer.querySelector("button").style.display = "";
}

// Função para verificar se o nome do prato é reconhecido pela API
let dishApiTimeout;
let apiDishRecognized = false;

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM carregado, inicializando verificador de prato");
  const dishNameInput = document.getElementById("name");
  const apiStatusContainer = document.getElementById("api-recognition-status");
  const nutritionManualContainer = document.getElementById("nutrition-manual-container");

  console.log("Elementos encontrados:", {
    dishNameInput: !!dishNameInput,
    apiStatusContainer: !!apiStatusContainer,
    nutritionManualContainer: !!nutritionManualContainer,
  });

  if (dishNameInput) {
    dishNameInput.addEventListener("input", function () {
      // Limpar o timeout anterior para evitar múltiplas requisições
      clearTimeout(dishApiTimeout);

      const dishName = dishNameInput.value.trim();
      if (dishName.length < 3) {
        apiStatusContainer.innerHTML = "";
        nutritionManualContainer.style.display = "none";
        return;
      }

      // Definir status como "verificando..."
      apiStatusContainer.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin me-2"></i>Verificando nome do prato...</div>';

      // Aguardar 800ms após o usuário parar de digitar antes de fazer a requisição
      dishApiTimeout = setTimeout(() => {
        console.log("Fazendo requisição para API com nome:", dishName);
        fetch(`/api/dishes/check-name?name=${encodeURIComponent(dishName)}`)
          .then((response) => response.json())
          .then((data) => {
            console.log("Resposta da API:", data);
            if (data.recognized) {
              apiDishRecognized = true;
              apiStatusContainer.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>Prato reconhecido! Informações nutricionais serão obtidas automaticamente.</div>';
              nutritionManualContainer.style.display = "none";
            } else {
              apiDishRecognized = false;
              apiStatusContainer.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Prato não reconhecido pela API. Você pode inserir os valores nutricionais manualmente abaixo.</div>';
              nutritionManualContainer.style.display = "block";
            }
          })
          .catch((error) => {
            console.error("Erro ao verificar nome do prato:", error);
            apiStatusContainer.innerHTML = '<div class="alert alert-danger"><i class="fas fa-times-circle me-2"></i>Erro ao verificar o nome. Tente novamente ou insira os valores manualmente.</div>';
            nutritionManualContainer.style.display = "block";
          });
      }, 800);
    });
  }
});
