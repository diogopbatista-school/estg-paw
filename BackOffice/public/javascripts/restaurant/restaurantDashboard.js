// NÃO manipule scroll manualmente! Deixe o navegador cuidar disso.
document.addEventListener("DOMContentLoaded", function () {
  // Função para reabrir seções que estavam abertas antes do refresh
  function reopenSectionsSync() {
    const openSectionIds = sessionStorage.getItem("openOrderSections");
    if (openSectionIds) {
      try {
        const sectionIds = JSON.parse(openSectionIds);
        if (sectionIds.length > 0) {
          sectionIds.forEach((id) => {            const section = document.getElementById(id);
            if (section) {
              const orderIdWithStatus = id.replace("order-", "");
              const button = document.querySelector(`[data-order-id="${orderIdWithStatus}"]`);
              if (button) {
                section.style.display = "block";
                section.style.maxHeight = section.scrollHeight + "px";
                const icon = button.querySelector("i");
                if (icon) {
                  icon.classList.remove("fa-info-circle");
                  icon.classList.add("fa-chevron-up");
                }
                button.innerHTML = '<i class="fas fa-chevron-up me-1"></i> Ocultar';
                button.classList.add("btn-primary");
                button.classList.remove("btn-info", "btn-light", "btn-warning");
              } else {
                section.style.display = "block";
                section.style.maxHeight = section.scrollHeight + "px";
              }
            }
          });
        }
        sessionStorage.removeItem("openOrderSections");
      } catch (e) {
        sessionStorage.removeItem("openOrderSections");
      }
    }
  }

  // Só reabrir seções, não mexer no scroll!
  reopenSectionsSync();

  const toggleButtons = document.querySelectorAll(".order-details-toggle");
  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const orderIdWithStatus = this.getAttribute("data-order-id");
      const detailsContent = document.getElementById("order-" + orderIdWithStatus);
      const icon = this.querySelector("i");

      if (detailsContent && (detailsContent.style.display === "none" || detailsContent.style.display === "")) {        // Fechar todos os outros detalhes abertos
        document.querySelectorAll(".order-details-content").forEach((el) => {
          if (el.id !== "order-" + orderIdWithStatus) {
            el.style.display = "none";

            // Resetar ícones de outros botões
            const otherButton = document.querySelector(`[data-order-id="${el.id.replace("order-", "")}"]`);
            if (otherButton) {
              const otherIcon = otherButton.querySelector("i");
              if (otherIcon) {
                otherIcon.classList.remove("fa-chevron-up");
                otherIcon.classList.add("fa-info-circle");
              }
              otherButton.innerHTML = '<i class="fas fa-info-circle me-1"></i> Ver Detalhes';
            }
          }
        });

        // Abrir este detalhe
        detailsContent.style.display = "block";

        // Animar a abertura com slide down
        detailsContent.style.maxHeight = "0";
        setTimeout(() => {
          detailsContent.style.maxHeight = detailsContent.scrollHeight + "px";
        }, 10);

        // Mudar o ícone
        icon.classList.remove("fa-info-circle");
        icon.classList.add("fa-chevron-up");

        // Adicionar classe de ativo para melhor visibilidade
        this.classList.add("btn-primary");
        this.classList.remove("btn-info", "btn-light");

        this.innerHTML = '<i class="fas fa-chevron-up me-1"></i> Ocultar';
      } else {
        // Fechar este detalhe
        detailsContent.style.maxHeight = "0";

        setTimeout(() => {
          detailsContent.style.display = "none";
        }, 300);

        // Mudar o ícone
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-info-circle");

        // Restaurar classe original com base no tipo de card
        this.classList.remove("btn-primary");

        const cardType = this.closest(".card").classList;
        if (cardType.contains("text-bg-info")) {
          this.classList.add("btn-info");
        } else if (cardType.contains("text-bg-warning")) {
          this.classList.add("btn-warning");
        } else if (cardType.contains("text-bg-success")) {
          this.classList.add("btn-light");
        }

        this.innerHTML = '<i class="fas fa-info-circle me-1"></i> Ver Detalhes';
      }
    });
  });

  // Função auxiliar para salvar seções abertas
  function saveCurrentPageState() {
    // Salvar seções abertas
    const openDetailSections = document.querySelectorAll('.order-details-content[style*="display: block"]');
    if (openDetailSections.length > 0) {
      const openSectionIds = Array.from(openDetailSections).map((section) => section.id);
      sessionStorage.setItem("openOrderSections", JSON.stringify(openSectionIds));
    } else {
      sessionStorage.removeItem("openOrderSections");
    }
  }

  // Ao submeter, salvar estado
  const allOrderForms = document.querySelectorAll(".order-actions form, .order-item form");
  allOrderForms.forEach((form) => {
    form.addEventListener("submit", function () {
      saveCurrentPageState();
      // ...feedback visual do botão e preloader, se desejar...
    });
  });
});
