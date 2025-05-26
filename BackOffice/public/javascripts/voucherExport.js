/**
 * Script para exportação de dados de vouchers para CSV
 *
 * Manipula os dados de voucher e gera um arquivo CSV baseado nos valores
 * presentes na página de histórico de pedidos, incluindo informações de
 * data filtrada e detalhes de vouchers.
 */
document.addEventListener("DOMContentLoaded", function () {
  const exportBtn = document.getElementById("exportVouchers");

  if (exportBtn) {
    // Capturar os valores de data do data-attribute do botão
    const startDate = exportBtn.getAttribute("data-start-date") || "Início";
    const endDate = exportBtn.getAttribute("data-end-date") || "Hoje";

    // Capturar os valores do resumo de vouchers do elemento na página
    const summaryCard = document.querySelector(".voucher-summary-card");

    exportBtn.addEventListener("click", function () {
      // Obter os valores diretamente da página
      // Procurar pelo badge que contém o número de pedidos com vouchers
      const badgeText = document.querySelector(".voucher-summary-card .badge.bg-light").textContent;
      const totalOrdersWithVouchers = parseInt(badgeText.match(/(\d+)/)[1]) || 0;

      // Buscar os valores financeiros da seção de resumo
      const financialValues = document.querySelectorAll(".voucher-summary-card .bg-light .d-flex.justify-content-between strong");
      const totalOriginalAmount = parseFloat(financialValues[0]?.textContent.replace(" €", "")) || 0;
      const totalVoucherDiscount = parseFloat(financialValues[1]?.textContent.replace("-", "").replace(" €", "")) || 0;
      const totalFinalAmount = parseFloat(financialValues[2]?.textContent.replace(" €", "")) || 0;

      // Extrair os dados de breakdown dos vouchers da página
      const voucherBreakdown = {};

      // Extrair os dados de breakdown do DOM
      document.querySelectorAll(".voucher-summary-card .bg-white.rounded.border").forEach((item) => {
        const codeElement = item.querySelector(".badge");
        if (!codeElement) return;

        const code = codeElement.textContent.trim();
        const countMatch = item.querySelector("small").textContent.match(/\((\d+) usos\)/);
        const count = countMatch ? parseInt(countMatch[1]) : 0;
        const totalDiscount = parseFloat(item.querySelector(".text-danger").textContent.replace("-", "").replace(" €", "")) || 0;

        // Obter a descrição do voucher do atributo title, ou usar valor padrão
        const description = codeElement.getAttribute("title") || item.querySelector('[data-bs-toggle="tooltip"]')?.getAttribute("title") || "Sem descrição";

        voucherBreakdown[code] = {
          count,
          totalDiscount,
          description,
        };
      });

      // Criar cabeçalho do CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Resumo de Vouchers\n";

      // Adicionar informações de filtro de data
      csvContent += "Período: " + startDate + " a " + endDate + "\n\n";

      // Adicionar dados resumidos
      csvContent += "Total de pedidos com vouchers," + totalOrdersWithVouchers + "\n";
      csvContent += "Valor original total," + totalOriginalAmount.toFixed(2) + " €\n";
      csvContent += "Desconto total de vouchers," + totalVoucherDiscount.toFixed(2) + " €\n";
      csvContent += "Valor final recebido," + totalFinalAmount.toFixed(2) + " €\n";
      csvContent += "Valor total a ser reembolsado pela plataforma," + totalVoucherDiscount.toFixed(2) + " €\n\n";
      // Adicionar detalhes por voucher
      csvContent += "Código do Voucher,Número de Usos,Desconto Total,Descrição\n";

      // Adicionar detalhes para cada voucher
      for (const [code, data] of Object.entries(voucherBreakdown)) {
        csvContent += `${code},${data.count},${data.totalDiscount.toFixed(2)} €,${data.description || "Sem descrição"}\n`;
      }

      // Adicionar informações adicionais
      csvContent += "\n";
      csvContent += "Informações Adicionais\n";
      csvContent += `Data de exportação,${new Date().toLocaleDateString("pt-PT")} ${new Date().toLocaleTimeString("pt-PT")}\n`;
      csvContent += `Período filtrado,${startDate} a ${endDate}\n`;

      // Criar elemento para download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      // Nome do arquivo com a data atual e período selecionado
      const today = new Date().toISOString().split("T")[0];
      // Formatação para o nome do arquivo: resumo-vouchers_[período de datas]_gerado-em-[data atual].csv
      link.setAttribute("download", `resumo-vouchers_${startDate}-a-${endDate}_gerado-em-${today}.csv`);

      // Clicar automaticamente para iniciar download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Exportação de relatório de vouchers concluída");
    });
  }
});
