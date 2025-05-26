// Script para preservar posição da página durante submits de formulário
document.addEventListener("DOMContentLoaded", () => {
  // Salvar posição do scroll antes do submit
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", () => {
      sessionStorage.setItem("scrollPosition", window.scrollY);
    });
  });

  // Restaurar posição do scroll após o carregamento da página
  const restoreScroll = () => {
    const scrollPosition = sessionStorage.getItem("scrollPosition");
    if (scrollPosition) {
      window.scrollTo({
        top: parseInt(scrollPosition),
        behavior: "instant",
      });
      sessionStorage.removeItem("scrollPosition");
    }
  };

  // Tenta restaurar a posição várias vezes para garantir
  setTimeout(restoreScroll, 0);
  setTimeout(restoreScroll, 100);
  setTimeout(restoreScroll, 200);
});
