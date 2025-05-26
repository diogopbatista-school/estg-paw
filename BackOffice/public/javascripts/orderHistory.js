document.addEventListener("DOMContentLoaded", function() {
  // Manipular os toggles para mostrar/esconder detalhes dos pedidos em cards
  const toggleButtons = document.querySelectorAll('.toggle-card-details');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const card = this.closest('.card');
      const detailsSection = card.querySelector('.order-card-details');
      const icon = this.querySelector('i');
      
      // Alterna a visibilidade dos detalhes do card com animação
      if (!detailsSection.classList.contains('show')) {
        // Abrir detalhes
        detailsSection.classList.add('show');
        detailsSection.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        card.classList.add('expanded');
      } else {
        // Fechar detalhes
        detailsSection.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        card.classList.remove('expanded');
        
        // Atraso para deixar a animação ocorrer antes de ocultar
        setTimeout(() => {
          if (!detailsSection.classList.contains('show')) {
            detailsSection.style.display = 'none';
          }
        }, 300);
      }
    });
  });
  
  // Animação do badge de notificações
  const pendingReviewsBadge = document.querySelector('.pending-reviews-badge');
  if (pendingReviewsBadge) {
    setInterval(() => {
      pendingReviewsBadge.classList.toggle('pulse');
    }, 2000);
  }
    // Auto-abrir cards com avaliações pendentes quando o filtro estiver ativado
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('pendingReviews') === 'true') {
    const cardsWithPendingReviews = document.querySelectorAll('.card:has(.badge.bg-warning)');
    cardsWithPendingReviews.forEach(card => {
      const toggleButton = card.querySelector('.toggle-card-details');
      if (toggleButton) {
        setTimeout(() => {
          toggleButton.click();
        }, 500); // Pequeno atraso para garantir que a página foi totalmente carregada
      }
    });
  }

  // Função para abrir modal de imagem
  window.openImageModal = function(imageSrc) {
    // Criar modal dinamicamente se não existir
    let modal = document.getElementById('imageModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.innerHTML = `
        <div class="modal fade" id="imageModal" tabindex="-1" aria-labelledby="imageModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="imageModalLabel">Imagem da Avaliação</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center">
                <img id="modalImage" src="" alt="Imagem da avaliação" class="img-fluid" style="max-width: 100%; height: auto;">
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal = document.getElementById('imageModal');
    }
    
    // Definir a imagem no modal
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    
    // Abrir o modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  };
});