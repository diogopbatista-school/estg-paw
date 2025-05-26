import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user.module';
import { HttpClient } from '@angular/common/http';
import { DishService } from '../../services/dish.service';
import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  loading: boolean = true;
  errorMessage: string = '';
  error: string | null = null;
  sidebarActive = false;

  // Voucher payment success handling
  showVoucherSuccess = false;
  voucherSuccessProcessing = false;

  // Categorias de pratos para os botões interativos
  dishCategories: Array<{ label: string; icon: string; value: string }> = [];

  constructor(
    private authService: AuthService,
    private dishService: DishService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    public router: Router // <-- Inject Router and make it public
  ) {}
  ngOnInit(): void {
    console.log('[DashboardComponent] carregado');

    // Check for voucher payment success
    this.route.queryParams.subscribe((params) => {
      if (params['success'] === 'voucher') {
        this.handleVoucherPaymentSuccess();
      }
    });

    this.authService.currentUser$.subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erro ao carregar os dados do usuário';
        this.loading = false;
        console.error('Erro ao obter dados do usuário:', err);
      },
    });
    this.loadDishCategories();
  }

  private loadDishCategories(): void {
    this.loading = true;
    this.dishService
      .getAllCategories()
      .pipe(
        catchError((err) => {
          console.error('Erro ao carregar categorias:', err);
          this.error = 'Não foi possível carregar as categorias de pratos.';
          this.loading = false;
          // Fallback example categories
          return of([
            'Entradas',
            'Sopas',
            'Peixe',
            'Carne',
            'Vegetariano',
            'Sobremesas',
            'Bebidas',
          ]);
        })
      )
      .subscribe({
        next: (categories) => {
          const iconMap: Record<string, string> = {
            entradas: 'fas fa-bread-slice',
            sopas: 'fas fa-mug-hot',
            peixe: 'fas fa-fish',
            carne: 'fas fa-drumstick-bite',
            vegetariano: 'fas fa-leaf',
            sobremesas: 'fas fa-ice-cream',
            bebidas: 'fas fa-glass-cheers',
            pizza: 'fas fa-pizza-slice',
            sushi: 'fas fa-egg',
            burger: 'fas fa-hamburger',
            pasta: 'fas fa-bowl-food',
            salad: 'fas fa-seedling',
            dessert: 'fas fa-cookie-bite',
            breakfast: 'fas fa-coffee',
            seafood: 'fas fa-shrimp',
            arroz: 'fas fa-bowl-rice',
            frango: 'fas fa-drumstick-bite',
            sandes: 'fas fa-bread-slice',
            vegetariana: 'fas fa-leaf',
            carne_de_vaca: 'fas fa-cow',
            carne_de_porco: 'fas fa-bacon',
            ovos: 'fas fa-egg',
            massas: 'fas fa-bowl-food',
            peixe_grelhado: 'fas fa-fish',
            marisco: 'fas fa-shrimp',
            doces: 'fas fa-cookie-bite',
            bebidas_alcoolicas: 'fas fa-wine-glass-alt',
            refrigerantes: 'fas fa-glass-cheers',
            sumos: 'fas fa-wine-bottle',
            agua: 'fas fa-tint',
          };
          this.dishCategories = categories.map((cat: string) => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            icon:
              iconMap[cat.toLowerCase().replace(/\s|-/g, '_')] ||
              'fas fa-utensils',
            value: cat,
          }));
          this.loading = false;
        },
      });
  }

  logout(): void {
    this.authService.logout();
  }

  toggleSidebar() {
    this.sidebarActive = !this.sidebarActive;
  }

  getUserInitial(): string {
    if (!this.user || !this.user.name || this.user.name.length === 0) {
      return 'U';
    }
    return this.user.name.charAt(0).toUpperCase();
  }

  getUserName(): string {
    return this.user?.name || 'Usuário';
  }

  getUserRole(): string {
    if (!this.user) return 'Cliente';

    switch (this.user.role) {
      case 'client':
        return 'Cliente';
      case 'admin':
        return 'Administrador';
      case 'restaurant':
        return 'Restaurante';
      default:
        return 'Cliente';
    }
  }

  getUserEmail(): string {
    return this.user?.email || 'N/D';
  }

  getUserPhone(): string {
    return this.user?.phone || 'N/D';
  }

  getUserNIF(): string {
    return this.user?.nif || 'N/D';
  }
  onCategoryClick(cat: any) {
    // Navegar para página de restaurantes com filtro de categoria aplicado
    this.router.navigate(['/restaurants'], {
      queryParams: { category: cat.value },
    });
  }

  private handleVoucherPaymentSuccess(): void {
    console.log('✅ Voucher payment success detected');
    this.showVoucherSuccess = true;
    this.voucherSuccessProcessing = false;

    this.toastr.success('Voucher criado com sucesso!', 'Pagamento Confirmado');

    // Hide success message and redirect after 3 seconds
    setTimeout(() => {
      this.showVoucherSuccess = false;
      // Clear the query parameter by navigating to the same route without params
      this.router.navigate(['/dashboard']);
    }, 3000);
  }
}
