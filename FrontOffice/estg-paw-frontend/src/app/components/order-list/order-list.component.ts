import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { ToastrService } from 'ngx-toastr';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationSocketService } from '../../services/notification-socket.service';
import { UserService } from '../../services/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Review {
  _id: string;
  rating: number;
  comment: string;
  image?: string;
  user: string;
  restaurant: string;
  created_at: string;
  response?: {
    text: string;
    user: string;
    created_at: string;
  };
}

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
  deliveryAddress?: string;
  logs: OrderLog[];
  review?: Review;
  appliedVoucher?: any;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
})
export class OrderListComponent implements OnInit {
  // Orders and filtering
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  pagedOrders: Order[] = [];
  loading = true;
  error: string | null = null;

  // Search and filter
  searchTerm = '';
  selectedStatus = '';
  selectedDate: string = '';
  selectedPrice: string = '';
  priceOptions: string[] = ['asc', 'desc'];

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;
  pages: number[] = []; // Review
  reviewRating = 0;
  reviewComment = '';
  selectedOrderId: string | null = null;
  selectedReviewImage: File | null = null;
  imagePreview: string | null = null;

  // Expandable cards
  expandedOrders: Set<string> = new Set();

  constructor(
    private orderService: OrderService,
    private toastr: ToastrService,
    private notificationSocket: NotificationSocketService,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    // Exemplo: obter o userId do usuário autenticado
    const userId = this.getCurrentUserId();
    console.log('[Socket] Connecting...');
    this.notificationSocket.connect();
    if (userId) {
      console.log(`[Socket] Joining room: ${userId}`);
      this.notificationSocket.joinRoom(userId);
    }
    this.notificationSocket.listenOrderNotifications().subscribe((data) => {
      console.log('[Socket] Order notification received:', data);
      this.snackBar.open(
        `Atualização do pedido: ${
          data.message || 'Seu pedido foi atualizado.'
        }`,
        'Fechar',
        {
          duration: 4000,
          panelClass: ['snackbar-info'],
        }
      );
      // Opcional: atualizar lista de pedidos automaticamente
      this.loadOrders();
    });
    this.notificationSocket.listenReviewNotifications().subscribe((data) => {
      console.log('[Socket] Review notification received:', data);
      this.snackBar.open(
        `Nova avaliação: ${data.message || 'Sua avaliação foi atualizada.'}`,
        'Fechar',
        {
          duration: 4000,
          panelClass: ['snackbar-info'],
        }
      );
    });
  }

  // Exemplo de método para obter o userId do usuário autenticado
  getCurrentUserId(): string | null {
    // Implemente conforme sua lógica de autenticação
    // Exemplo: buscar do localStorage ou do UserService
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?._id || null;
  }

  loadOrders(): void {
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.filterOrders();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.error = 'Erro ao carregar pedidos';
        this.loading = false;
      },
    });
  }
  // Review functionality
  canReview(order: Order): boolean {
    return order.status === 'finished' && !order.review;
  }
  canDeleteReview(order: Order): boolean {
    // Customer can always delete their own review, even if restaurant has responded
    return !!order.review;
  }
  deleteReview(order: Order): void {
    if (!order.review) return;

    // Show confirmation dialog
    const confirmed = confirm(
      'Tem a certeza que deseja eliminar esta avaliação? Esta ação não pode ser desfeita.'
    );

    if (!confirmed) {
      return;
    }
    this.orderService.deleteReview(order._id, order.review._id).subscribe({
      next: () => {
        order.review = undefined;
        this.toastr.success('Avaliação removida com sucesso!');
      },
      error: (error) => {
        console.error('Error deleting review:', error);
        let errorMessage = 'Erro ao remover avaliação';

        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }

        this.toastr.error(errorMessage);
      },
    });
  }
  submitReview(order: Order): void {
    if (!this.reviewRating) {
      this.toastr.error('Por favor, selecione uma classificação');
      return;
    }

    this.orderService
      .addReview(
        order._id,
        {
          rating: this.reviewRating,
          comment: this.reviewComment,
        },
        this.selectedReviewImage || undefined
      )
      .subscribe({
        next: (response) => {
          order.review = response;
          this.toastr.success('Avaliação enviada com sucesso!');
          this.resetReviewForm();
        },
        error: (error) => {
          console.error('Error submitting review:', error);
          this.toastr.error('Erro ao enviar avaliação');
        },
      });
  }
  resetReviewForm(): void {
    this.reviewRating = 0;
    this.reviewComment = '';
    this.selectedOrderId = null;
    this.selectedReviewImage = null;
    this.imagePreview = null;
  }

  filterOrders(): void {
    let filtered = [...this.orders];

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toString().includes(searchLower) ||
          order.restaurant.name.toLowerCase().includes(searchLower) ||
          order.items.some((item) =>
            item.dish.name.toLowerCase().includes(searchLower)
          )
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(
        (order) => order.status === this.selectedStatus
      );
    }

    // Apply date filter (YYYY-MM-DD)
    if (this.selectedDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const selected = new Date(this.selectedDate);
        return (
          orderDate.getFullYear() === selected.getFullYear() &&
          orderDate.getMonth() === selected.getMonth() &&
          orderDate.getDate() === selected.getDate()
        );
      });
    }

    // Apply price sort
    if (this.selectedPrice === 'asc') {
      filtered = filtered.sort((a, b) => a.totalPrice - b.totalPrice);
    } else if (this.selectedPrice === 'desc') {
      filtered = filtered.sort((a, b) => b.totalPrice - a.totalPrice);
    } else {
      // Default: sort by creation date (newest first)
      filtered = filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    this.filteredOrders = filtered;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.setPage(1);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    this.pagedOrders = this.filteredOrders.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      pending: 'bg-warning',
      preparing: 'bg-info',
      delivered: 'bg-success',
      finished: 'bg-primary',
      cancelled: 'bg-danger',
    };
    return statusClasses[status] || 'bg-secondary';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      pending: 'Pendente',
      preparing: 'Em Preparação',
      delivered: 'Pronto para Entrega',
      finished: 'Finalizado',
      cancelled: 'Cancelado',
    };
    return statusTexts[status] || status;
  }

  getTypeText(type: string): string {
    const typeTexts: { [key: string]: string } = {
      takeAway: 'Para Levar',
      homeDelivery: 'Entrega em Casa',
      eatIn: 'Comer no Local',
    };
    return typeTexts[type] || type;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('pt-BR');
  }

  // Cancel order
  canCancelOrder(order: Order): boolean {
    if (!order) return false;
    return order.status === 'pending';
  }

  cancelOrder(order: Order): void {
    this.orderService.cancelOrder(order._id).subscribe({
      next: () => {
        order.status = 'cancelled';
        this.toastr.success('Pedido cancelado com sucesso');
      },
      error: (error) => {
        console.error('Error canceling order:', error);
        this.toastr.error('Erro ao cancelar pedido');
      },
    });
  }
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedDate = '';
    this.selectedPrice = '';
    this.filterOrders();
  }

  // Toggle expandable cards
  toggleOrderDetails(orderId: string): void {
    if (this.expandedOrders.has(orderId)) {
      this.expandedOrders.delete(orderId);
    } else {
      this.expandedOrders.add(orderId);
    }
  }

  isOrderExpanded(orderId: string): boolean {
    return this.expandedOrders.has(orderId);
  }

  // Image handling methods
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
      ];
      if (!allowedTypes.includes(file.type)) {
        this.toastr.error('Formato de imagem inválido. Use JPEG, PNG ou GIF.');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.toastr.error('Imagem muito grande. Tamanho máximo: 5MB.');
        return;
      }

      this.selectedReviewImage = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage(): void {
    this.selectedReviewImage = null;
    this.imagePreview = null;
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/')
      ? imagePath.substring(1)
      : imagePath;
    return `http://localhost:3000/${cleanPath}`;
  }

  openImageModal(imageUrl: string): void {
    // Create modal for image viewing
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    `;

    modal.appendChild(img);
    document.body.appendChild(modal);

    // Close modal on click
    modal.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  // Calcula o desconto aplicado do voucher (valor original - valor final)
  getVoucherDiscount(order: Order): string {
    if (!order || !order.appliedVoucher) return '0.00';
    const itemsTotal = Number(this.getOrderItemsTotal(order));
    const discount = itemsTotal - order.totalPrice;
    return discount.toFixed(2);
  }

  // Calcula o valor total dos itens do pedido
  getOrderItemsTotal(order: Order): string {
    if (!order || !order.items) return '0.00';
    let total = 0;
    order.items.forEach(item => {
      total += item.price * item.quantity;
    });
    return total.toFixed(2);
  }

  getGoogleMapsUrl(address: string): string {
    return 'https://www.google.com/maps?q=' + encodeURIComponent(address);
  }
}
