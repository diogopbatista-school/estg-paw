import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-process-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-payment.component.html',
  styleUrl: './process-payment.component.scss'
})
export class ProcessPaymentComponent implements OnInit {
  processing = true;
  success = false;
  error = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['session_id'];
      
      if (sessionId) {
        this.processPayment(sessionId);
      } else {
        this.error = true;
        this.processing = false;
        this.errorMessage = 'Session ID não encontrado';
      }
    });
  }

  private async processPayment(sessionId: string) {
    try {
      // Recupera dados do pedido salvos no localStorage
      const orderData = localStorage.getItem('pendingOrder');
      
      if (!orderData) {
        throw new Error('Dados do pedido não encontrados');
      }

      const pendingOrder = JSON.parse(orderData);
      
      console.log('🛒 Processando pedido após pagamento Stripe:', {
        sessionId,
        orderData: pendingOrder
      });

      // Cria o pedido usando o endpoint que já tem a lógica de vouchers
      this.orderService.createOrder(pendingOrder).subscribe({
        next: (response) => {
          console.log('✅ Pedido criado com sucesso após pagamento:', response);
          
          this.processing = false;
          this.success = true;
          
          // Limpa dados salvos
          localStorage.removeItem('pendingOrder');
          localStorage.removeItem('cartItems');
          localStorage.removeItem('cartTimeRemaining');
          
          this.toastr.success('Pedido realizado com sucesso!');
            // Redireciona após 2 segundos
          setTimeout(() => {
            this.router.navigate(['/track-order']);
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Erro ao criar pedido após pagamento:', error);
          this.processing = false;
          this.error = true;
          this.errorMessage = error.error?.message || error.message || 'Erro ao processar pedido';
          this.toastr.error('Erro ao processar pedido: ' + this.errorMessage);
        }
      });
      
    } catch (err: any) {
      console.error('❌ Erro no processamento do pagamento:', err);
      this.processing = false;
      this.error = true;
      this.errorMessage = err.message || 'Erro desconhecido';
      this.toastr.error('Erro no processamento: ' + this.errorMessage);
    }
  }

  goToOrders() {
    this.router.navigate(['/orders']);
  }
}
