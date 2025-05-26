import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationSocketService {
  private socket: Socket;
  private orderNotification$ = new ReplaySubject<any>(1);
  private reviewNotification$ = new ReplaySubject<any>(1);
  private listenersRegistered = false;
  private userIdToJoin: string | null = null;

  constructor() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: false,
    });
    this.registerListeners();
  }
  private registerListeners() {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;
    
    // Listen for customer order updates (this is what the backend sends to customers)
    this.socket.on('order-update', (data) => {
      console.log('[Socket] order-update received:', data);
      this.orderNotification$.next(data);
    });
    
    // Listen for review updates
    this.socket.on('review-update', (data) => {
      console.log('[Socket] review-update received:', data);
      this.reviewNotification$.next(data);
    });
    
    // Also listen for legacy orderNotification for backward compatibility
    this.socket.on('orderNotification', (data) => {
      console.log('[Socket] orderNotification (legacy) received:', data);
      this.orderNotification$.next(data);
    });
    
    // Also listen for reviewNotification for backward compatibility
    this.socket.on('reviewNotification', (data) => {
      console.log('[Socket] reviewNotification (legacy) received:', data);
      this.reviewNotification$.next(data);
    });
  }

  setUserIdToJoin(userId: string) {
    this.userIdToJoin = userId;
  }

  connect(token?: string) {
    console.log('[Socket] Conectando ao servidor...');
    this.socket.connect();
    this.socket.on('connect', () => {
      console.log('[Socket] Conectado:', this.socket.id);
      if (this.userIdToJoin) {
        this.joinRoom(this.userIdToJoin);
      }
    });
    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Desconectado:', reason);
    });
  }

  disconnect() {
    console.log('[Socket] Desconectando...');
    this.socket.disconnect();
  }

  joinRoom(userId: string) {
    console.log('[Socket] Entrando na sala do cliente:', userId);
    this.socket.emit('join-customer-orders', userId);
  }

  listenOrderNotifications(): Observable<any> {
    return this.orderNotification$.asObservable();
  }

  listenReviewNotifications(): Observable<any> {
    return this.reviewNotification$.asObservable();
  }
}
