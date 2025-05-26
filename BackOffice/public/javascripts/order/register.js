document.addEventListener('DOMContentLoaded', function() {
    const clientSearch = document.getElementById('clientSearch');
    const clientResults = document.getElementById('clientResults');
    const customerIdInput = document.getElementById('customerId');
    const orderForm = document.getElementById('orderForm');
    let selectedClientId = null;

    // Evento de submit do formulário
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Verificar se tem NIF preenchido e validar
        const nif = clientSearch.value.trim();
        if (!nif) {
            alert('Por favor, preencha o NIF do cliente.');
            clientSearch.focus();
            return;
        }

        try {
            const response = await fetch(`/order/validate-nif?nif=${nif}`);
            const data = await response.json();
            
            if (!data.valid || !data.user) {
                alert('NIF inválido ou cliente não encontrado.');
                clientSearch.focus();
                return;
            }

            // Atualizar dados do cliente
            selectClient(data.user._id, data.user.name, data.user.nif);
        } catch (error) {
            console.error('Erro ao validar NIF:', error);
            alert('Erro ao validar NIF. Por favor, tente novamente.');
            return;
        }

        // Verificar se tem tipo de pedido selecionado
        const orderType = document.querySelector('input[name="type"]:checked');
        if (!orderType) {
            alert('Por favor, selecione um tipo de pedido.');
            return;
        }

        // Verificar se o carrinho tem itens
        const cartItems = document.querySelectorAll('#cartList li');
        if (cartItems.length === 0) {
            alert('Por favor, adicione itens ao carrinho antes de prosseguir.');
            return;
        }

        // Se tudo estiver ok, submeter o formulário
        this.submit();
    });
});

// Função para selecionar um cliente
function selectClient(id, name, nif) {
    const customerIdInput = document.getElementById('customerId');
    customerIdInput.value = id;
    selectedClientId = id;
}
