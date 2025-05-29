import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { api } from '../../environments/api';

export interface Voucher {
  id: string;
  code: string;
  discount: number;
  expirationDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private apiUrl = `${api.api}/stripe`;
  private userApiUrl = `${api.api}/user`;

  constructor(private http: HttpClient) {}

  // Cria sessão Stripe para compra de voucher
  createVoucherCheckoutSession(payload: { userId: string; amount: number; recipientEmail?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create-voucher-session`, payload);
  }

  // Busca vouchers do usuário autenticado
  getUserVouchers(): Observable<Voucher[]> {
    return this.http.get<Voucher[]>(`${this.userApiUrl}/vouchers`);
  }

  // Valida um código de voucher
  validateVoucherCode(code: string): Observable<Voucher> {
    return this.http.get<Voucher>(`${this.userApiUrl}/voucher/validate/${code}`);
  }

  // Aplica desconto de voucher
  applyVoucherDiscount(voucherId: string, orderAmount: number): Observable<{ discountApplied: number; remainingVoucherValue: number }> {
    return this.http.post<any>(`${this.userApiUrl}/voucher/apply`, {
      voucherId,
      orderAmount
    });
  }
  
  // Obter detalhes da sessão Stripe
  getStripeSessionDetails(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/session/${sessionId}`);
  }
  
  // Criar voucher após pagamento confirmado
  createVoucher(payload: { userId: string; amount: number; recipientEmail?: string }): Observable<any> {
    return this.http.post<any>(`${this.userApiUrl}/create-voucher`, payload);
  }
}
