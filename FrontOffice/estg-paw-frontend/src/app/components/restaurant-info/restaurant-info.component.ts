import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RestaurantService } from '../../services/restaurant.service';
import { ImageService } from '../../services/image.service';
import { AuthService } from '../../services/auth/auth.service';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-restaurant-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './restaurant-info.component.html',
  styleUrl: './restaurant-info.component.scss',
})
export class RestaurantInfoComponent implements OnInit {
  restaurant: any = null;
  isAuthenticated = false;
  loading = true;
  error: string | null = null;
  activeMenuId: string | null = null;
  selectedCategory: string | null = null;
  showImageModal = false;
  selectedImage: string | null = null;
  modalImagePosition = { x: 0, y: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private imageService: ImageService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe((isAuth) => {
      this.isAuthenticated = isAuth;
    });

    this.route.paramMap.subscribe((params) => {
      const restaurantId = params.get('id');
      if (restaurantId) {
        this.loadRestaurantData(restaurantId);
      } else {
        this.error = 'ID do restaurante não encontrado';
        this.loading = false;
      }
    });
  }

  loadRestaurantData(restaurantId: string): void {
    this.loading = true;
    this.error = null;

    // Obter os dados do restaurante com menus e pratos em uma única chamada
    this.restaurantService
      .getRestaurantWithMenusDishes(restaurantId)
      .pipe(
        catchError((error) => {
          console.error(
            'Erro ao carregar restaurante com menus e pratos:',
            error
          );
          this.error = 'Não foi possível carregar os dados do restaurante.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((restaurant) => {
        if (!restaurant) {
          return;
        }

        this.restaurant = restaurant;

        // Se houver menus, definir o primeiro como ativo
        if (this.restaurant.menus && this.restaurant.menus.length > 0) {
          this.activeMenuId = this.restaurant.menus[0]._id;
        }
      });
  }

  setActiveMenu(menuId: string): void {
    this.activeMenuId = menuId;
  }

  getImageUrl(imagePath: string): string {
    return this.imageService.getImageUrl(imagePath);
  }

  getRestaurantImageUrl(imagePath: string): string {
    return this.imageService.getRestaurantImageUrl(imagePath);
  }

  getDishImageUrl(imagePath: string): string {
    return this.imageService.getDishImageUrl(imagePath);
  }

  goToOrder(): void {
    if (this.isAuthenticated) {
      // Implementar navegação para a tela de pedido
      this.router.navigate(['/orders/new'], {
        queryParams: { restaurantId: this.restaurant._id },
      });
    } else {
      // Redirecionar para login com returnUrl para voltar ao restaurante
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: `/restaurant/${this.restaurant._id}`,
        },
      });
    }
  }
  // Função auxiliar para formatar preço
  formatPrice(price: number | undefined): string {
    if (price === undefined || price === null || isNaN(price)) {
      return '0.00€';
    }
    return price.toFixed(2) + '€';
  }

  // Funções auxiliares para menus e pratos
  getActiveMenu(): any {
    if (!this.activeMenuId || !this.restaurant?.menus) return null;
    return this.restaurant.menus.find((m: any) => m._id === this.activeMenuId);
  }

  getDishesFromActiveMenu(): any[] {
    const activeMenu = this.getActiveMenu();
    return activeMenu?.dishes || [];
  }

  hasDishes(): boolean {
    return this.getDishesFromActiveMenu().length > 0;
  }

  getUniqueCategories(): string[] {
    const dishes = this.getDishesFromActiveMenu();
    return Array.from(new Set(dishes.map((dish: any) => dish.category)))
      .filter((category): category is string => category != null && category !== '');
  }  getDishesFromActiveMenuByCategory(category: string): any[] {
    const dishes = this.getDishesFromActiveMenu();
    return dishes
      .filter((dish: any) => dish.category === category)
      .map((dish: any) => ({
        ...dish,
        prices: this.validatePrices(dish.prices)
      }));
  }

  private validatePrices(prices: any[]): any[] {
    if (!prices || !Array.isArray(prices)) {
      return [{ dose: 'Padrão', price: 0 }];
    }
    return prices.map(price => ({
      dose: price.dose || 'Padrão',
      price: typeof price.price === 'number' ? price.price : 0
    }));
  }

  getAllCategories(): string[] {
    if (!this.restaurant?.menus) return [];
    
    const allDishes = this.restaurant.menus.flatMap((menu: any) => menu.dishes || []);
    return Array.from(new Set(allDishes.map((dish: any) => dish.category)))
      .filter((category): category is string => category != null && category !== '')
      .sort();
  }

  getMenusWithCategory(category: string): any[] {
    if (!this.restaurant?.menus) return [];
    
    return this.restaurant.menus.filter((menu: any) => {
      return menu.dishes?.some((dish: any) => dish.category === category);
    });
  }

  setSelectedCategory(category: string | null): void {
    this.selectedCategory = category;
    
    if (category === null) {
      // Se nenhuma categoria estiver selecionada, seleciona o primeiro menu
      if (this.restaurant?.menus?.length > 0) {
        this.activeMenuId = this.restaurant.menus[0]._id;
      }
      return;
    }

    // Encontra o primeiro menu que contém a categoria selecionada
    const menusWithCategory = this.getMenusWithCategory(category);
    if (menusWithCategory.length > 0) {
      this.activeMenuId = menusWithCategory[0]._id;
    }
  }

  shouldShowMenu(menu: any): boolean {
    if (!this.selectedCategory) return true;
    return menu.dishes?.some((dish: any) => dish.category === this.selectedCategory);
  }  openImageModal(event: MouseEvent, imageUrl: string): void {
    this.selectedImage = imageUrl;
    
    const modal = document.querySelector('.image-modal') as HTMLElement;
    if (modal) {
      // Posicionar o modal na posição atual do scroll
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      modal.style.top = `${scrollTop}px`;
      modal.style.height = '100vh';
    }
    
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImage = null;
  }
}
