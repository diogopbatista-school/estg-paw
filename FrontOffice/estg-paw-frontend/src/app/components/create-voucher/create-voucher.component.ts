import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VoucherService, Voucher } from '../../services/voucher.service';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-create-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-voucher.component.html',
  styleUrl: './create-voucher.component.scss'
})
export class CreateVoucherComponent implements OnInit {
  voucherValues = [5, 10, 20, 50, 100];
  selectedAmount: number | null = null;
  recipientEmail: string = '';
  loading = false;
  errorMessage = '';
  
  // Validação de email do destinatário
  emailValidationLoading = false;
  emailValidationMessage = '';
  emailValidationStatus: 'valid' | 'invalid' | 'empty' | null = null;

  // Lista de vouchers do usuário
  userVouchers: Voucher[] = [];
  loadingVouchers = false;
  constructor(
    private voucherService: VoucherService,
    public authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService
  ) {}
  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadUserVouchers();
      
      // Verifica se deve recarregar vouchers após retornar do Stripe
      if (localStorage.getItem('shouldReloadVouchers') === 'true') {
        localStorage.removeItem('shouldReloadVouchers');
        // Aguarda um pouco antes de recarregar para garantir que o voucher foi processado
        setTimeout(() => {
          this.loadUserVouchers();
          this.toastr.success('Voucher criado com sucesso!');
        }, 2000);
      }
    }
  }

  // Carrega vouchers do usuário autenticado
  loadUserVouchers(): void {
    this.loadingVouchers = true;
    this.voucherService.getUserVouchers().subscribe({
      next: (vouchers) => {
        this.userVouchers = vouchers;
        this.loadingVouchers = false;
      },
      error: (error) => {
        console.error('Erro ao carregar vouchers:', error);
        this.loadingVouchers = false;
      },
    });
  }

  // Método para resetar o estado de validação quando o email é alterado
  onEmailChange() {
    // Reset validation state when email is changed
    if (!this.recipientEmail || this.recipientEmail.trim() === '') {
      this.emailValidationStatus = null;
      this.emailValidationMessage = '';
    } else if (this.emailValidationStatus !== null) {
      // Se havia uma validação anterior e o email foi alterado, reset o estado
      this.emailValidationStatus = null;
      this.emailValidationMessage = '';
    }
  }

  validateEmail() {
    if (!this.recipientEmail || this.recipientEmail.trim() === '') {
      this.emailValidationStatus = 'empty';
      this.emailValidationMessage = 'Por favor, insira um email';
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.recipientEmail.trim())) {
      this.emailValidationStatus = 'invalid';
      this.emailValidationMessage = 'Formato de email inválido';
      return;
    }

    this.emailValidationLoading = true;
    this.emailValidationMessage = '';
    this.emailValidationStatus = null;

    this.userService.findUserByEmail(this.recipientEmail.trim()).subscribe({
      next: (user) => {
        this.emailValidationLoading = false;
        if (user && user.role === 'client') {
          this.emailValidationStatus = 'valid';
          this.emailValidationMessage = `✓ Email válido - ${user.name}`;
        } else if (user && user.role !== 'client') {
          this.emailValidationStatus = 'invalid';
          this.emailValidationMessage = 'Este email não pertence a um cliente';
        } else {
          this.emailValidationStatus = 'invalid';
          this.emailValidationMessage = 'Email não encontrado';
        }
      },
      error: () => {
        this.emailValidationLoading = false;
        this.emailValidationStatus = 'invalid';
        this.emailValidationMessage = 'Erro ao validar email';
      }
    });
  }
  async buyVoucher() {
    this.errorMessage = '';
    
    // Validações antes de prosseguir
    if (!this.selectedAmount) return;
    
    // Normalizar o email (trim e null se vazio)
    const normalizedEmail = this.recipientEmail?.trim() || '';
    
    // Se tem email do destinatário, validar se é válido
    if (normalizedEmail !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        this.errorMessage = 'Por favor, insira um email válido.';
        return;
      }
      
      if (this.emailValidationStatus !== 'valid') {
        this.errorMessage = 'Por favor, valide o email do destinatário primeiro.';
        return;
      }
    }
    
    this.loading = true;
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.toastr.error('É necessário estar autenticado para comprar voucher.');
        this.loading = false;
        return;
      }

      const payload: any = {
        userId: currentUser._id || currentUser.id,
        amount: this.selectedAmount,
      };

      // Só adicionar recipientEmail se não estiver vazio
      if (normalizedEmail !== '') {
        payload.recipientEmail = normalizedEmail;
      }

      this.voucherService.createVoucherCheckoutSession(payload).subscribe({
        next: async (data) => {
          if (!data.sessionId) throw new Error('Erro ao criar sessão de pagamento');
          
          // Carrega Stripe.js dinamicamente se necessário
          if (!(window as any).Stripe || typeof (window as any).Stripe !== 'function') {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://js.stripe.com/v3/';
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }

          const stripe = (window as any).Stripe && typeof (window as any).Stripe === 'function'
            ? (window as any).Stripe('pk_test_51RRfCfGhkRcbdFqGLbg3Oa2oCH2RPgPy6FSlDGVQ1z18nZQ5wKJuOn9nlaG1jNpCaa4GXq5zOsE9RYfJPymMTysx004C9YPlBe')
            : null;          if (!stripe) throw new Error('Stripe.js não foi carregado corretamente');
          
          // Store a flag para recarregar vouchers quando voltar
          localStorage.setItem('shouldReloadVouchers', 'true');
          
          await stripe.redirectToCheckout({ sessionId: data.sessionId });
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Erro ao criar sessão Stripe';
          this.loading = false;
        }
      });
    } catch (err: any) {
      this.errorMessage = err.message || 'Erro ao iniciar pagamento';
      this.loading = false;
    }
  }

  // Helper method para formatar a exibição dos vouchers
  getVoucherDisplayText(voucher: Voucher): string {
    const expiryDate = new Date(voucher.expirationDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let expiryText = '';
    if (daysUntilExpiry <= 7) {
      expiryText =
        daysUntilExpiry === 1
          ? ' (expira amanhã!)'
          : ` (expira em ${daysUntilExpiry} dias)`;
    } else {
      expiryText = ` (expira em ${expiryDate.toLocaleDateString('pt-PT')})`;
    }

    return `${voucher.code} - ${voucher.discount.toFixed(2)}€${expiryText}`;
  }

  // Helper method para determinar a classe CSS baseada na data de expiração
  getVoucherExpiryClass(voucher: Voucher): string {
    const expiryDate = new Date(voucher.expirationDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 1) {
      return 'text-danger'; // Expira hoje/amanhã
    } else if (daysUntilExpiry <= 7) {
      return 'text-warning'; // Expira em uma semana
    } else {
      return 'text-success'; // Ainda válido por mais tempo
    }
  }

  // Copia o código do voucher para a área de transferência
  copyVoucherCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toastr.success(`Código ${code} copiado para a área de transferência!`);
    }).catch(() => {
      this.toastr.error('Erro ao copiar código do voucher');
    });
  }
}
