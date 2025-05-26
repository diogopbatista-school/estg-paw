import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { ToastrService } from 'ngx-toastr';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationSocketService } from '../../services/notification-socket.service';
import { Subscription } from 'rxjs';

interface OrderLog {
  status: string;
  timestamp: string;
  description: string;
}

interface Order {
  _id: string;
  status: 'pending' | 'preparing' | 'delivered' | 'finished' | 'cancelled';
  items: Array<{
    dish: {
      name: string;
      description: string;
    };
    quantity: number;
    price: number;
  }>;
  restaurant: {
    _id: string;
    name: string;
  };
  totalPrice: number;
  createdAt: string;
  acceptedAt?: string;
  readyAt?: string;
  finishedAt?: string;
  type: 'takeAway' | 'homeDelivery' | 'eatIn';
  order_number: number;
  cancelled_count?: number;
  cancellation_blocked_until?: string;
  logs: OrderLog[];
}

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, RouterLink, MatSnackBarModule],
  templateUrl: './track-order.component.html',
  styleUrl: './track-order.component.scss'
})
export class TrackOrderComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  pagedOrders: Order[] = [];
  loading = true;
  error: string | null = null;
  
  // User data
  userId: string | null = null;
  private orderSubscription: Subscription | null = null;

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;
  pages: number[] = [];

  // Valid order states
  validStates = ['pending', 'preparing', 'delivered'];

  constructor(
    private orderService: OrderService,
    private toastr: ToastrService,
    private router: Router,
    private authService: AuthService,
    private socketService: NotificationSocketService,
    private cdr: ChangeDetectorRef // <-- Adicionado
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.userId = currentUser?._id ?? null;
    if (this.userId) {
      this.socketService.setUserIdToJoin(this.userId);
      this.socketService.connect();
    }
    this.initializeSocketConnection();
    this.loadOrders();
  }
  
  ngOnDestroy(): void {
    // Clean up socket subscription when component is destroyed
    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
    }
    this.socketService.disconnect();
  }
    private initializeSocketConnection(): void {
    console.log('🔗 Initializing socket connection for real-time order tracking');
    
    // Listen for order notifications with direct order manipulation (like restaurant dashboard)
    this.orderSubscription = this.socketService.listenOrderNotifications()
      .subscribe(notification => {
        this.handleOrderNotification(notification);
      });
  }
    private handleOrderNotification(notification: any): void {
    if (!notification) return;
    
    console.log('🔔 Received order notification:', notification);
    
    // Handle the actual notification structure from the backend
    if (notification.type === 'order-status' && notification.orderData) {
      // This is the structure sent by notifyCustomer function
      console.log('📋 Order status updated:', notification.orderData);
      this.updateOrderInList(notification.orderData);
      
      const statusText = this.getStatusText(notification.orderData.status);
      this.toastr.success(
        `Pedido #${notification.orderData.order_number} ${statusText}`,
        'Status Atualizado!'
      );
    } else if (notification.type === 'order-cancelled') {
      // Handle cancellation
      console.log('❌ Order cancelled:', notification);
      if (notification.orderData || notification._id) {
        const orderId = notification.orderData?._id || notification._id;
        const orderNumber = notification.orderData?.order_number || notification.order_number;
        this.removeOrderFromList(orderId);
        
        this.toastr.warning(
          `Pedido #${orderNumber} foi cancelado`,
          'Pedido Cancelado!'
        );
      }
    } else if (notification.type === 'new-order') {
      // Handle new order (shouldn't normally happen for customers, but just in case)
      console.log('📋 New order received:', notification);
      if (notification.orderData || notification._id) {
        const orderData = notification.orderData || notification;
        this.addOrderToList(orderData);
        
        this.toastr.info(
          `Pedido #${orderData.order_number} recebido`,
          'Novo Pedido!'
        );
      }
    } else if (notification.orderData || notification._id) {
      // Generic handling - treat the notification itself as order data if it has order properties
      const orderData = notification.orderData || notification;
      console.log('🔄 Generic order update:', orderData);
      this.updateOrderInList(orderData);
      
      this.toastr.info(
        notification.message || 'Pedido atualizado',
        'Atualização'
      );
    } else {
      // Fallback for any other notification types
      console.log('ℹ️ Generic notification:', notification);
      this.toastr.info(
        notification.message || 'Atualização recebida',
        'Notificação'
      );
    }
  }loadOrders(): void {
    if (!this.userId) {
      const user = this.authService.getCurrentUser();
      this.userId = user?._id ?? null;
      if (!this.userId) {
        console.error('❌ No user ID available, redirecting to login');
        this.router.navigate(['/login']);
        return;
      }
    }

    console.log('📋 Loading orders for user:', this.userId);
    this.loading = true;

    this.orderService.getUserOrders(this.userId).subscribe({
      next: (orders) => {
        console.log('📋 Orders loaded successfully:', orders.length, 'orders');
        console.log('📋 Orders data:', orders);
        
        this.orders = orders;
        this.filterOrders();
        this.updatePagination();
        this.loading = false;
        this.error = null;
        this.cdr.detectChanges();
        
        console.log('📋 Filtered orders:', this.filteredOrders.length, 'active orders');
      },
      error: (error) => {
        console.error('❌ Error loading orders:', error);
        this.error = 'Erro ao carregar pedidos. Tente novamente.';
        this.loading = false;
        this.toastr.error('Erro ao carregar pedidos', 'Erro');
        this.cdr.detectChanges();
      }
    });
  }

  filterOrders(): void {
    // Filtra para mostrar apenas pedidos que NÃO estão finalizados
    this.filteredOrders = this.orders
      .filter(order => order.status !== 'finished')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
    this.pages = Array.from({length: this.totalPages}, (_, i) => i + 1);
    this.setPage(1);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    this.pagedOrders = this.filteredOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      pending: 'bg-warning',
      preparing: 'bg-info',
      delivered: 'bg-success',
      finished: 'bg-primary',
      cancelled: 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      pending: 'Pendente',
      preparing: 'Em Preparação',
      delivered: 'Pronto para Entrega',
      finished: 'Finalizado',
      cancelled: 'Cancelado'
    };
    return statusTexts[status] || status;
  }

  getTypeText(type: string): string {
    const typeTexts: { [key: string]: string } = {
      takeAway: 'Para Levar',
      homeDelivery: 'Entrega em Casa',
      eatIn: 'Comer no Local'
    };
    return typeTexts[type] || type;
  }

  canCancelOrder(order: Order): boolean {
    if (!order) return false;
    return order.status === 'pending';
  }
  cancelOrder(orderId: string): void {
    const motive = window.prompt('Por favor, insira o motivo do cancelamento:');
    
    if (motive === null) {
      // User clicked Cancel
      return;
    }

    this.orderService.cancelOrder(orderId, motive).subscribe({
      next: () => {
        this.toastr.success('Pedido cancelado com sucesso');
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error canceling order:', error);
        this.toastr.error(error.error?.message || 'Erro ao cancelar pedido');
      }
    });
  }formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    const orderDate = new Date(dateStr);
    if (isNaN(orderDate.getTime())) return '';

    const now = new Date();
    const isToday = orderDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return orderDate.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return orderDate.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(',', '');
    }
  }

  formatBlockDate(date: string): string {
    const blockDate = new Date(date);
    blockDate.setMinutes(blockDate.getMinutes() + blockDate.getTimezoneOffset());
    return blockDate.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Direct order manipulation methods (like restaurant dashboard)
  private updateOrderInList(updatedOrder: Order): void {
    console.log('🔄 Updating order in list:', updatedOrder);
    
    if (!updatedOrder || !updatedOrder._id) {
      console.error('❌ Cannot update order: missing order ID');
      return;
    }
    
    // Find and update the order in the main orders array
    const orderIndex = this.orders.findIndex(order => order._id === updatedOrder._id);
    if (orderIndex !== -1) {
      this.orders[orderIndex] = updatedOrder;
      console.log(`🔄 Updated order ${updatedOrder._id} with status: ${updatedOrder.status}`);
    } else {
      // If order not found, add it (might be a new order for this user)
      console.log(`🔄 Order ${updatedOrder._id} not found, adding to list`);
      this.orders.unshift(updatedOrder);
    }
    
    // Refresh filtered view and pagination
    this.filterOrders();
    this.cdr.detectChanges();
  }
  
  private removeOrderFromList(orderId: string): void {
    console.log('🗑️ Removing order from list:', orderId);
    
    const initialLength = this.orders.length;
    this.orders = this.orders.filter(order => order._id !== orderId);
    
    if (this.orders.length < initialLength) {
      console.log(`🗑️ Removed order ${orderId} from list`);
      this.filterOrders();
      this.cdr.detectChanges();
    } else {
      console.log(`❌ Order ${orderId} not found in list`);
    }
  }
  
  private addOrderToList(newOrder: Order): void {
    console.log('➕ Adding new order to list:', newOrder);
    
    // Check if order already exists to avoid duplicates
    const existingOrderIndex = this.orders.findIndex(order => order._id === newOrder._id);
    if (existingOrderIndex === -1) {
      // Add new order at the beginning (most recent first)
      this.orders.unshift(newOrder);
      console.log(`➕ Added new order ${newOrder._id} to list`);
      
      // Refresh filtered view and pagination
      this.filterOrders();
      this.cdr.detectChanges();
    } else {
      console.log(`⚠️ Order ${newOrder._id} already exists, updating instead`);
      this.updateOrderInList(newOrder);
    }
  }
}
