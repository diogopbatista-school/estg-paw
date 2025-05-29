import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { VoucherService } from '../../services/voucher.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-process-voucher-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-voucher-payment.component.html',
  styleUrl: './process-voucher-payment.component.scss'
})
export class ProcessVoucherPaymentComponent implements OnInit {
  processing = true;
  success = false;
  error = false;
  errorMessage = '';
  isRecipient = false;
  recipientName = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private voucherService: VoucherService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['session_id'];
      
      if (sessionId) {
        this.processVoucherPayment(sessionId);
      } else {
        this.error = true;
        this.processing = false;
        this.errorMessage = 'Session ID não encontrado';
      }
    });
  }

  private async processVoucherPayment(sessionId: string) {
    try {
      // Buscar detalhes da sessão Stripe
      this.voucherService.getStripeSessionDetails(sessionId).subscribe({
        next: (sessionResponse) => {
          if (!sessionResponse.success) {
            throw new Error('Falha ao obter detalhes da sessão: ' + sessionResponse.error);
          }

          // Verificar se o pagamento foi bem-sucedido
          if (sessionResponse.payment_status !== 'paid') {
            this.processing = false;
            this.error = true;
            this.errorMessage = 'O pagamento ainda não foi confirmado. Tente novamente em alguns instantes.';
            return;
          }

          const metadata = sessionResponse.metadata;
          // Verificar se é um pagamento de voucher
          if (metadata.type !== 'voucher') {
            this.processing = false;
            this.error = true;
            this.errorMessage = 'Esta sessão não é para compra de voucher';
            return;
          }

          // Criar o voucher com base nas informações da sessão
          const voucherData = {
            userId: metadata.buyerId,
            amount: parseFloat(metadata.voucherAmount),
            recipientEmail: metadata.recipientEmail || ''
          };

          // Determinar se é um voucher para outra pessoa
          this.isRecipient = !!voucherData.recipientEmail && voucherData.recipientEmail.trim() !== '';
          
          this.voucherService.createVoucher(voucherData).subscribe({
            next: (response) => {
              this.processing = false;
              this.success = true;
              
              if (this.isRecipient && response.recipientName) {
                this.recipientName = response.recipientName;
                this.toastr.success(`Voucher enviado para ${response.recipientName} com sucesso!`);
              } else {
                this.toastr.success('Voucher criado com sucesso!');
              }
            },
            error: (error) => {
              this.processing = false;
              this.error = true;
              this.errorMessage = error.error?.message || error.message || 'Erro ao criar voucher';
              this.toastr.error('Erro ao criar voucher: ' + this.errorMessage);
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

  goToVouchers() {
    this.router.navigate(['/vouchers']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
