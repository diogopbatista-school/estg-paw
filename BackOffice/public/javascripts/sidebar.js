document.addEventListener("DOMContentLoaded", function() {
  const sidebar = document.getElementById("sidebar");
  const content = document.getElementById("content");
  const sidebarCollapse = document.getElementById("sidebarCollapse");

  // Função para alternar a visibilidade da side bar e ajustar o conteúdo principal
  function toggleSidebar() {
    sidebar.classList.toggle("active");
    content.classList.toggle("active");
  }

  // Adiciona um evento ao botão da side bar
  if (sidebarCollapse) {
    sidebarCollapse.addEventListener("click", toggleSidebar);
  }

  document.querySelectorAll('.sidebar a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const target = document.querySelector(targetId);

      if (target) {
        window.scrollTo({
          top: target.offsetTop - 60,
          behavior: "smooth"
        });
        // Fecha a barra lateral em ecrãs pequenos após clicar num link
        if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
          toggleSidebar();
        }
      }
    });
  });
});
