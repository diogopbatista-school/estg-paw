import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth/auth.service';

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
      // Buscar detalhes da sessão Stripe (inclui deliveryAddress nos metadados)
      this.orderService.getStripeSessionDetails(sessionId).subscribe({
        next: (sessionResponse) => {
          if (!sessionResponse.success) {
            throw new Error('Falha ao obter detalhes da sessão: ' + sessionResponse.error);
          }
          const metadata = sessionResponse.metadata;
          // Montar o payload do pedido a partir dos metadados Stripe
          const orderData = {
            customerId: metadata.userId,
            restaurantId: metadata.restaurantId,
            items: JSON.parse(metadata.items),
            type: metadata.orderType,
            deliveryAddress: metadata.deliveryAddress || '',
            totalPrice: parseFloat(metadata.finalTotal),
            voucherDiscount: parseFloat(metadata.voucherDiscount) || 0,
            appliedVoucher: metadata.appliedVoucher || null
          };
          this.orderService.createOrder(orderData).subscribe({
            next: (response) => {
              this.processing = false;
              this.success = true;
              localStorage.removeItem('pendingOrder');
              localStorage.removeItem('cartItems');
              localStorage.removeItem('cartTimeRemaining');              this.toastr.success('Pedido realizado com sucesso!');
              // Longer delay to ensure the styling has time to apply and user sees the success message
              setTimeout(() => {
                this.router.navigate(['/orders/track']);
              }, 3500);
            },
            error: (error) => {
              this.processing = false;
              this.error = true;
              this.errorMessage = error.error?.message || error.message || 'Erro ao processar pedido';
              this.toastr.error('Erro ao processar pedido: ' + this.errorMessage);
            }
          });
        },
        error: (error) => {
          this.processing = false;
          this.error = true;
          this.errorMessage = 'Erro ao obter detalhes da sessão: ' + (error.error?.message || error.message);
          this.toastr.error('Erro ao processar pagamento: ' + this.errorMessage);
        }
      });
    } catch (err: any) {
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
