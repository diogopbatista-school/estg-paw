import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { api } from '../../environments/api';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = `${api.api}/orders`;
  constructor(private http: HttpClient) {}

  // Obter todos os pedidos
  getAllOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  // Verificar se o usuário está bloqueado
  checkUserBlocked(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/check-blocked`);
  }

  // Criar um novo pedido
  createOrder(orderData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, orderData);
  }
  // Obter pedidos do usuário logado
  getUserOrders(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Obter pedido por ID
  getOrderById(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}`);
  }

  // Obter o status de um pedido
  getOrderStatus(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}/status`);
  } // Cancelar um pedido
  cancelOrder(orderId: string, motive?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${orderId}/cancel`, { motive });
  }

  // Verificar limite de cancelamentos do usuário
  getUserCancellationsCount(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}/cancellations`);
  }

  // Verificar bloqueio de cancelamento do usuário
  getUserCancellationBlock(userId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/user/${userId}/cancellation-block`
    );
  } // Avaliar um pedido
  rateOrder(orderId: string, rating: number, comment: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${orderId}/review`, {
      rating,
      comment,
    });
  }

  // Obter pratos de um restaurante
  getRestaurantDishes(restaurantId: string): Observable<any> {
    return this.http.get<any>(`${api.api}/dishes/restaurant/${restaurantId}`);
  }

  // Obter restaurante por ID
  getRestaurantById(restaurantId: string): Observable<any> {
    return this.http.get<any>(`${api.api}/restaurants/${restaurantId}`);
  }
  // Criar uma avaliação para um pedido
  addReview(
    orderId: string,
    reviewData: { rating: number; comment: string },
    image?: File
  ): Observable<any> {
    const formData = new FormData();
    formData.append('rating', reviewData.rating.toString());
    formData.append('comment', reviewData.comment);

    if (image) {
      formData.append('image', image);
    }

    return this.http.post<any>(`${this.apiUrl}/${orderId}/review`, formData);
  }

  // Obter avaliação de um pedido
  getReview(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}/review`);
  }

  // Deletar uma avaliação
  deleteReview(orderId: string, reviewId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/${orderId}/review/${reviewId}`
    );
  }

  // Criar sessão Stripe Checkout
  createStripeCheckoutSession(payload: any): Observable<any> {
    return this.http.post<any>(
      `${api.api}/stripe/create-checkout-session`,
      payload
    );
  }

  // Obter detalhes da sessão Stripe
  getStripeSessionDetails(sessionId: string): Observable<any> {
    return this.http.get<any>(`${api.api}/stripe/session/${sessionId}`);
  }
}
