import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { RestaurantService } from '../../services/restaurant.service';
import { ImageService } from '../../services/image.service';
import { AuthService } from '../../services/auth/auth.service';
import { VoucherService, Voucher } from '../../services/voucher.service';
import { ToastrService } from 'ngx-toastr';

interface CartItem {
  id: string;
  name: string;
  dose: string;
  price: number;
  quantity: number;
}

interface Price {
  dose: string;
  price: number;
}

interface Dish {
  _id: string;
  name: string;
  description: string;
  image: string;
  prices: Price[];
  category: string;
}

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterLink,
  ],
  templateUrl: './create-order.component.html',
  styleUrl: './create-order.component.scss',
})
export class CreateOrderComponent implements OnInit, OnDestroy {
  dishes: Dish[] = [];
  filteredDishes: Array<Dish> = [];
  categories: string[] = [];
  cartItems: CartItem[] = [];
  searchTerm: string = '';
  selectedCategory: string = '';
  orderType: 'takeAway' | 'homeDelivery' | 'eatIn' = 'takeAway';
  deliveryAddress: string = '';
  restaurantId: string = '';  // Voucher properties
  userVouchers: Voucher[] = [];
  selectedVoucher: Voucher | null = null;
  appliedVoucherDiscount: number = 0;

  // Payment loading state
  loading = false;

  // User blocking state
  userBlocked = false;
  blockMessage = '';

  timeRemaining: number = 600; // 10 minutes in seconds
  private timer: any;
  private warningShown: boolean = false;
  constructor(
    private orderService: OrderService,
    private restaurantService: RestaurantService,
    private imageService: ImageService,
    private authService: AuthService,
    private voucherService: VoucherService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}
  ngOnInit(): void {
    // Carrega carrinho do localStorage, se existir
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      this.cartItems = JSON.parse(savedCart);
    }
    // Carrega tempo restante do localStorage, se existir
    const savedTime = localStorage.getItem('cartTimeRemaining');
    if (savedTime) {
      this.timeRemaining = parseInt(savedTime, 10);
    }
    // Get restaurant ID from route params
    this.route.params.subscribe((params) => {
      this.restaurantId = params['id'];
      console.log('Restaurant ID:', this.restaurantId);
      this.checkUserBlockedStatus();
      this.loadRestaurantAndDishes();
    });
    // Se houver itens no carrinho, reinicia o timer
    if (this.cartItems.length > 0) {
      this.startTimer();
    }
    // Carrega vouchers do usuário se estiver autenticado
    if (this.authService.isAuthenticated()) {
      this.loadUserVouchers();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  isOrderFormValid(): boolean {
    // Check if cart has items
    if (this.cartItems.length === 0) {
      return false;
    }

    // Check if delivery address is provided for home delivery orders
    if (
      this.orderType === 'homeDelivery' &&
      (!this.deliveryAddress || this.deliveryAddress.trim() === '')
    ) {
      console.log('Endereço de entrega é obrigatório para pedidos de entrega em casa.');
      return false;
    }

    return true;
  }

  loadRestaurantAndDishes(): void {
    this.restaurantService
      .getRestaurantWithMenusDishes(this.restaurantId)
      .subscribe({
        next: (restaurant) => {
          console.log('Restaurant data:', restaurant);
          if (restaurant.menus && restaurant.menus.length > 0) {
            const allDishes: Dish[] = [];

            restaurant.menus.forEach((menu: any) => {
              if (menu.dishes) {
                allDishes.push(
                  ...menu.dishes.map((dish: any) => ({
                    ...dish,
                    image: this.imageService.getDishImageUrl(dish.image),
                  }))
                );
              }
            });

            console.log('All dishes:', allDishes);
            this.dishes = allDishes;
            this.filteredDishes = allDishes;
            this.categories = [
              ...new Set(allDishes.map((dish) => dish.category)),
            ].filter(
              (category): category is string => typeof category === 'string'
            );
            console.log('Categories:', this.categories);
          } else {
            this.toastr.warning(
              'Este restaurante não possui menus ou pratos disponíveis'
            );
          }
        },
        error: (error) => {
          console.error('Error loading restaurant:', error);
          this.toastr.error('Erro ao carregar dados do restaurante');
        },
      });
  }

  checkUserBlockedStatus(): void {
    if (this.authService.isAuthenticated()) {
      this.orderService.checkUserBlocked().subscribe({
        next: (response) => {
          if (response.success && response.isBlocked) {
            this.userBlocked = true;
            this.blockMessage = response.message;
            this.toastr.error(response.message, 'Conta Bloqueada', {
              timeOut: 10000,
            });
            // Redirect to restaurant page or home
            this.router.navigate(['/restaurant', this.restaurantId]);
          } else {
            this.userBlocked = false;
            this.blockMessage = '';
          }
        },
        error: (error) => {
          console.error('Error checking user block status:', error);
          // Don't show error to user, just log it
        },
      });
    }
  }

  filterDishes(): void {
    this.filteredDishes = this.dishes.filter((dish) => {
      const matchesSearch = dish.name
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());
      const matchesCategory =
        !this.selectedCategory || dish.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }
  addToCart(
    dish: Dish,
    dose: string,
    priceStr: string | null,
    quantity: number = 1
  ): void {
    if (!dose) {
      this.toastr.error('Please select a portion size');
      return;
    }

    const price = priceStr ? parseFloat(priceStr) : 0;
    if (isNaN(price) || price <= 0) {
      this.toastr.error('Invalid price');
      return;
    }

    if (!quantity || quantity < 1) {
      this.toastr.error('Please enter a valid quantity');
      return;
    }

    const existingItem = this.cartItems.find(
      (item) => item.id === dish._id && item.dose === dose
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cartItems.push({
        id: dish._id,
        name: dish.name,
        dose: dose,
        price: price,
        quantity: quantity,
      });
    }
    // Salva carrinho no localStorage
    localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
    this.toastr.success('Added to cart');

    // Start or reset timer when adding first item
    if (this.cartItems.length === 1) {
      this.startTimer();
    }
  }

  removeFromCart(item: CartItem): void {
    const index = this.cartItems.indexOf(item);
    if (index > -1) {
      this.cartItems.splice(index, 1);
      // Salva carrinho no localStorage
      localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
    }
  }

  increaseQuantity(item: CartItem): void {
    item.quantity++;
    // Salva carrinho no localStorage
    localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      // Salva carrinho no localStorage
      localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
    } else {
      this.removeFromCart(item);
    }
  }
  // Helper method to round monetary values to 2 decimal places
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  getSubtotal(): number {
    const subtotal = this.cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    return this.roundToTwoDecimals(subtotal);
  }

  getTotal(): number {
    const subtotal = this.getSubtotal();
    const total = subtotal - this.appliedVoucherDiscount;
    return this.roundToTwoDecimals(Math.max(0, total));
  }
  placeOrder(): void {
    // Check if user is blocked before placing order
    if (this.userBlocked) {
      this.toastr.error(
        'Não é possível fazer pedidos. Sua conta está temporariamente bloqueada.',
        'Conta Bloqueada'
      );
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.toastr.error('Please login to place an order');
      this.router.navigate(['/login']);
      return;
    }

    // Validate delivery address for home delivery orders
    if (this.orderType === 'homeDelivery' && (!this.deliveryAddress || this.deliveryAddress.trim() === '')) {
      this.toastr.error('Por favor, insira a morada de entrega para pedidos de entrega ao domicílio.');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    console.log('Current user when placing order:', currentUser);

    if (!currentUser) {
      this.toastr.error('User not logged in');
      this.router.navigate(['/login']);
      return;
    }

    const userId = currentUser._id || currentUser.id;
    if (!userId) {
      this.toastr.error('Unable to get user information');
      return;
    } // Map cart items to order items with dishId for backend lookup
    const orderItems = this.cartItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      dose: item.dose,
      dishId: item.id,
    }));
    const orderData = {
      customerId: userId,
      restaurantId: this.restaurantId,
      items: orderItems,
      type: this.orderType,
      deliveryAddress: this.orderType === 'homeDelivery' ? this.deliveryAddress : null,
      totalPrice: this.getTotal(),
      voucherDiscount: this.appliedVoucherDiscount,
      appliedVoucher: this.selectedVoucher?.id || null,
    };

    console.log(' Dados do pedido:', orderData);
    console.log(' Detalhes do voucher:', {
      selectedVoucher: this.selectedVoucher,
      appliedDiscount: this.appliedVoucherDiscount,
      cartSubtotal: this.getSubtotal(),
      finalTotal: this.getTotal(),
    });

    this.orderService.createOrder(orderData).subscribe({
      next: (response) => {
        console.log('✅ Pedido criado com sucesso:', response);
        this.toastr.success('Pedido realizado com sucesso!');        // Reset voucher state after successful order
        this.appliedVoucherDiscount = 0;
        this.selectedVoucher = null;
        this.router.navigate(['/orders/track']);
        // Limpa o carrinho do localStorage ao finalizar o pedido
        localStorage.removeItem('cartItems');
        localStorage.removeItem('cartTimeRemaining');
      },
      error: (error) => {
        console.error(' Erro ao criar pedido:', error);
        this.toastr.error(error.message || 'Erro ao realizar pedido');
      },
    });
  }
  private startTimer(): void {
    // Só reseta para 10 minutos se o tempo não foi restaurado
    if (
      this.timeRemaining === 600 ||
      !localStorage.getItem('cartTimeRemaining')
    ) {
      this.timeRemaining = 600;
    }
    this.warningShown = false;
    // Salva tempo inicial no localStorage
    localStorage.setItem('cartTimeRemaining', this.timeRemaining.toString());
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.timeRemaining--;
      // Salva tempo restante no localStorage
      localStorage.setItem('cartTimeRemaining', this.timeRemaining.toString());
      // Show warning at 2 minutes remaining
      if (this.timeRemaining === 120 && !this.warningShown) {
        this.warningShown = true;
        this.showWarningDialog();
      }
      // Clear cart when time runs out
      if (this.timeRemaining <= 0) {
        this.clearCart();
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Limpa tempo do localStorage
    localStorage.removeItem('cartTimeRemaining');
  }
  private showWarningDialog(): void {
    const snackBarRef = this.snackBar.open(
      'Seu carrinho expira em 2 minutos! Finalize o pedido agora.',
      'Finalizar Pedido',
      {
        duration: 0, // Não fecha automaticamente
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar'],
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.placeOrder();
      snackBarRef.dismiss();
    });

    // Fecha o snackbar após 30 segundos se não houver ação
    setTimeout(() => {
      snackBarRef.dismiss();
    }, 30000);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  clearCart(): void {
    this.cartItems = [];
    this.clearTimer();
    // Limpa carrinho do localStorage
    localStorage.removeItem('cartItems');
    // Limpa tempo do localStorage
    localStorage.removeItem('cartTimeRemaining');
    this.snackBar.open('Cart was cleared due to inactivity', 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  proceedToCheckout(): void {
    // Implement your checkout logic here
    this.placeOrder();
  }
  async payWithStripe(): Promise<void> {
    // Check if user is blocked before processing payment
    if (this.userBlocked) {
      this.toastr.error(
        'Não é possível fazer pedidos. Sua conta está temporariamente bloqueada.',
        'Conta Bloqueada'
      );
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.toastr.error('Please login to pay');
      this.router.navigate(['/login']);
      return;
    }

    // Validate delivery address for home delivery orders
    if (this.orderType === 'homeDelivery' && (!this.deliveryAddress || this.deliveryAddress.trim() === '')) {
      this.toastr.error('Por favor, insira a morada de entrega para pedidos de entrega ao domicílio.');
      return;
    }

    if (this.cartItems.length === 0) {
      this.toastr.error('Seu carrinho está vazio!');
      return;
    }

    // Se o total for 0 após aplicar voucher, processa diretamente sem Stripe
    const total = this.getTotal();
    if (total <= 0) {
      this.toastr.info(
        'Pedido totalmente coberto pelo voucher. Processando...'
      );
      this.placeOrder();
      return;
    }

    this.loading = true;

    try {
      const currentUser = this.authService.getCurrentUser();
      const orderItems = this.cartItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        dose: item.dose,
        dishId: item.id,
      }));

      // Prepara dados do pedido para salvar no localStorage
      const orderData = {
        customerId: currentUser?._id || currentUser?.id,
        restaurantId: this.restaurantId,
        items: orderItems,
        type: this.orderType,
        deliveryAddress: this.orderType === 'homeDelivery' ? this.deliveryAddress : '',
        totalPrice: this.getSubtotal(),
        voucherDiscount: this.appliedVoucherDiscount,
        appliedVoucher: this.selectedVoucher?.id || null,
      };

      // Salva dados do pedido no localStorage
      localStorage.setItem('pendingOrder', JSON.stringify(orderData));
      console.log('💾 Dados do pedido salvos no localStorage:', orderData);

      const payload = {
        items: orderItems,
        restaurantId: this.restaurantId,
        orderType: this.orderType,
        userId: currentUser?._id || currentUser?.id,
        deliveryAddress: this.orderType === 'homeDelivery' ? this.deliveryAddress : '', // Incluir deliveryAddress no payload
        voucherDiscount: this.appliedVoucherDiscount,
        appliedVoucher: this.selectedVoucher?.id || null,
      };

      console.log('Enviando para Stripe:', payload);
      console.log('Desconto aplicado:', this.appliedVoucherDiscount);
      console.log('Voucher selecionado:', this.selectedVoucher);

      this.orderService.createStripeCheckoutSession(payload).subscribe({
        next: async (data) => {
          if (!data.sessionId)
            throw new Error('Erro ao criar sessão de pagamento');
          // Carrega Stripe.js dinamicamente se necessário
          if (
            !(window as any).Stripe ||
            typeof (window as any).Stripe !== 'function'
          ) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://js.stripe.com/v3/';
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          const stripe =
            (window as any).Stripe &&
            typeof (window as any).Stripe === 'function'
              ? (window as any).Stripe(
                  'pk_test_51RRfCfGhkRcbdFqGLbg3Oa2oCH2RPgPy6FSlDGVQ1z18nZQ5wKJuOn9nlaG1jNpCaa4GXq5zOsE9RYfJPymMTysx004C9YPlBe'
                )
              : null;
          if (!stripe)
            throw new Error('Stripe.js não foi carregado corretamente');
          await stripe.redirectToCheckout({ sessionId: data.sessionId });
          // Nota: O carrinho será limpo apenas após o processamento bem-sucedido do pagamento
        },
        error: (err) => {
          this.loading = false;
          // Remove dados salvos em caso de erro
          localStorage.removeItem('pendingOrder');
          this.toastr.error(
            'Erro ao iniciar pagamento: ' +
              (err.error?.message || err.message || err)
          );
        },
      });
    } catch (err: any) {
      this.loading = false;
      // Remove dados salvos em caso de erro
      localStorage.removeItem('pendingOrder');
      this.toastr.error('Erro ao iniciar pagamento: ' + (err.message || err));
    }
  }

  // Métodos para vouchers
  loadUserVouchers(): void {
    this.voucherService.getUserVouchers().subscribe({
      next: (vouchers) => {
        this.userVouchers = vouchers;
      },
      error: (error) => {
        console.error('Erro ao carregar vouchers:', error);
      },
    });
  }
  onVoucherSelectionChange(): void {
    if (this.selectedVoucher) {
      this.applyVoucher(this.selectedVoucher);
    } else {
      this.removeVoucherDiscount();
    }
  }
  applyVoucher(voucher: Voucher): void {
    const subtotal = this.getSubtotal();
    if (subtotal <= 0) {
      this.toastr.error(
        'Adicione itens ao carrinho antes de aplicar um voucher'
      );
      return;
    }

    // Calculate discount (voucher value or cart total, whichever is smaller)
    // Round to avoid floating point precision issues
    this.appliedVoucherDiscount = this.roundToTwoDecimals(
      Math.min(voucher.discount, subtotal)
    );

    // Store the voucher for later use in order creation
    this.selectedVoucher = voucher;

    const remainingVoucherValue = this.roundToTwoDecimals(
      voucher.discount - this.appliedVoucherDiscount
    );
    const message =
      this.appliedVoucherDiscount < voucher.discount
        ? `Voucher aplicado! Desconto: ${this.appliedVoucherDiscount.toFixed(
            2
          )}€. Valor restante no voucher: ${remainingVoucherValue.toFixed(2)}€`
        : `Voucher de ${voucher.discount.toFixed(
            2
          )}€ aplicado! Desconto: ${this.appliedVoucherDiscount.toFixed(2)}€`;

    this.toastr.success(message);
  }  removeVoucherDiscount(): void {
    this.appliedVoucherDiscount = 0;
    this.selectedVoucher = null;

    this.toastr.info('Voucher removido');
  }
  getVoucherDiscountText(): string {
    if (this.appliedVoucherDiscount > 0) {
      const appliedVoucher = this.selectedVoucher;
      if (
        appliedVoucher &&
        this.appliedVoucherDiscount < appliedVoucher.discount
      ) {
        const remaining = this.roundToTwoDecimals(
          appliedVoucher.discount - this.appliedVoucherDiscount
        );
        return `Desconto aplicado: -${this.appliedVoucherDiscount.toFixed(
          2
        )}€ (restante: ${remaining.toFixed(2)}€)`;
      }
      return `Desconto do voucher: -${this.appliedVoucherDiscount.toFixed(2)}€`;
    }
    return '';
  }

  // Helper method to check if cart has items
  hasCartItems(): boolean {
    return this.cartItems.length > 0;
  }
  // Helper method to get formatted voucher info for display
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
      expiryText = ` (expira em ${new Date(
        voucher.expirationDate
      ).toLocaleDateString('pt-PT')})`;
    }

    return `${voucher.code} - ${voucher.discount}€${expiryText}`;
  }

  // Helper methods for voucher handling
  isOrderFullyCoveredByVoucher(): boolean {
    return this.appliedVoucherDiscount > 0 && this.getTotal() <= 0;
  }

  getVoucherSavingsMessage(): string {
    if (this.appliedVoucherDiscount <= 0) return '';

    const subtotal = this.getSubtotal();
    if (this.appliedVoucherDiscount >= subtotal) {
      return `🎉 Pedido totalmente grátis com seu voucher!`;
    } else {
      return `💰 Você economizou ${this.appliedVoucherDiscount.toFixed(
        2
      )}€ com seu voucher!`;
    }
  }
}
