import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RestaurantService } from '../../services/restaurant.service';
import { ImageService } from '../../services/image.service';
import { DishService } from '../../services/dish.service';
import { HttpClientModule } from '@angular/common/http';
import { catchError, finalize, of, tap } from 'rxjs';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './restaurant-list.component.html',
  styleUrl: './restaurant-list.component.scss',
})
export class RestaurantListComponent implements OnInit {
  // Arrays para restaurantes e categorias
  restaurants: any[] = [];
  filteredRestaurants: any[] = [];
  dishCategories: Array<{ label: string; icon: string; value: string }> = [];

  // Estados de UI
  loading: boolean = false;
  error: string | null = null;

  // Filtros
  filters = {
    name: '',
    verifiedOnly: true,
    category: '',
    priceRange: '',
    location: {
      enabled: false,
      latitude: 0,
      longitude: 0,
      maxDistance: 10, // km
    },
  };

  // Localização do usuário
  userLocation: { latitude: number; longitude: number } | null = null;

  // Propriedade para controle da sidebar
  sidebarActive = false;
  constructor(
    private restaurantService: RestaurantService,
    private dishService: DishService,
    private imageService: ImageService,
    private route: ActivatedRoute
  ) {}
  ngOnInit(): void {
    console.log('[RestaurantListComponent] carregado');
    this.loadCategories();
    this.requestUserLocation();

    // Verificar se existe um parâmetro de categoria na URL
    this.route.queryParams.subscribe((params) => {
      const categoryParam = params['category'];
      if (categoryParam) {
        // Se existe um parâmetro de categoria, filtrar diretamente por essa categoria
        this.filterByCategory(categoryParam);
      } else {
        // Caso contrário, carregar todos os restaurantes
        this.loadRestaurants();
      }
    });
  }

  // Method to get a random subset of restaurants for the suggestions section
  getRandomRestaurants(): any[] {
    if (!this.restaurants || this.restaurants.length === 0) {
      return [];
    }

    // Create a copy of the restaurants array to avoid modifying the original
    const shuffled = [...this.restaurants];

    // Shuffle the array (Fisher-Yates algorithm)
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return a subset (max 10 restaurants)
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }

  loadRestaurants(): void {
    this.loading = true;
    this.error = null;

    // Carrega apenas restaurantes verificados por padrão
    this.restaurantService
      .getVerifiedRestaurants()
      .pipe(
        catchError((error) => {
          console.error('Erro ao carregar restaurantes:', error);
          this.error =
            'Não foi possível carregar os restaurantes. Por favor, tente novamente mais tarde.';
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((restaurants) => {
        this.restaurants = restaurants;
        this.applyFilters(); // Aplica filtros iniciais se houver
      });
  }

  loadCategories(): void {
    this.dishService
      .getAllCategories()
      .pipe(
        catchError((error) => {
          console.error('Erro ao carregar categorias:', error);
          return of([]);
        })
      )
      .subscribe((categories) => {
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
      });
  }

  filterByCategory(category: string): void {
    this.filters.category = category;
    this.loading = true;
    this.error = null;
    this.restaurantService
      .getRestaurantsByDishCategory(category)
      .pipe(
        catchError((error) => {
          console.error('Erro ao filtrar restaurantes por categoria:', error);
          this.error = 'Não foi possível filtrar restaurantes por categoria.';
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((restaurants) => {
        this.restaurants = restaurants;
        this.filteredRestaurants = restaurants;
        // Não aplicar applyFilters() para não filtrar de novo por categoria
      });
  }

  clearCategoryFilter(): void {
    this.filters.category = '';
    this.loadRestaurants();
  }

  requestUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
        }
      );
    }
  }

  applyFilters(): void {
    this.filteredRestaurants = [...this.restaurants];

    // Filtro por nome
    if (this.filters.name) {
      const searchTerm = this.filters.name.toLowerCase();
      this.filteredRestaurants = this.filteredRestaurants.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(searchTerm) ||
          (restaurant.description &&
            restaurant.description.toLowerCase().includes(searchTerm))
      );
    }

    // Filtro por verificação
    if (this.filters.verifiedOnly) {
      this.filteredRestaurants = this.filteredRestaurants.filter(
        (restaurant) => restaurant.verified
      );
    }

    // Filtro por localização (se habilitado e houver localização do usuário)
    if (this.filters.location.enabled && this.userLocation) {
      this.filteredRestaurants = this.filteredRestaurants.filter(
        (restaurant) => {
          const distance = this.calculateDistance(
            this.userLocation!.latitude,
            this.userLocation!.longitude,
            restaurant.location.latitude,
            restaurant.location.longitude
          );
          return distance <= this.filters.location.maxDistance;
        }
      );
    }

    // Filtro por categoria de prato
    if (this.filters.category) {
      this.filteredRestaurants = this.filteredRestaurants.filter(
        (restaurant) => {
          // O restaurante deve ter pelo menos 1 prato com a categoria selecionada
          return (
            Array.isArray(restaurant.dishes) &&
            restaurant.dishes.some((dish: any) => {
              return (
                dish.category &&
                dish.category.toLowerCase() ===
                  this.filters.category.toLowerCase()
              );
            })
          );
        }
      );
    }

    // Se nenhum restaurante corresponder aos filtros, recarrega todos
    if (this.filteredRestaurants.length === 0 && this.restaurants.length > 0) {
      // Manter a lista vazia, mas exibir uma mensagem de "nenhum restaurante encontrado"
    }
  }

  // Calcula distância entre coordenadas (fórmula de Haversine)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distância em km
    return d;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  toggleLocationFilter(): void {
    this.filters.location.enabled = !this.filters.location.enabled;

    if (this.filters.location.enabled && !this.userLocation) {
      this.requestUserLocation();
    }

    this.applyFilters();
  }

  // Limpa todos os filtros
  clearFilters(): void {
    this.filters = {
      name: '',
      verifiedOnly: true,
      category: '',
      priceRange: '',
      location: {
        enabled: false,
        latitude: 0,
        longitude: 0,
        maxDistance: 10,
      },
    };
    this.applyFilters();
  }

  // Pesquisar restaurantes
  searchRestaurants(): void {
    this.applyFilters();
  }

  // Usado para mostrar estrelas de avaliação
  getStarsArray(rating: number): number[] {
    const ratingRounded = Math.round(rating * 2) / 2; // Arredonda para 0.5 mais próximo
    const fullStars = Math.floor(ratingRounded);
    const halfStar = ratingRounded % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    const starsArray = [];

    // Adiciona estrelas cheias
    for (let i = 0; i < fullStars; i++) {
      starsArray.push(1); // 1 = estrela cheia
    }

    // Adiciona meia estrela se necessário
    if (halfStar) {
      starsArray.push(0.5); // 0.5 = meia estrela
    }

    // Adiciona estrelas vazias
    for (let i = 0; i < emptyStars; i++) {
      starsArray.push(0); // 0 = estrela vazia
    }

    return starsArray;
  }

  // Método para obter URL da imagem
  getImageUrl(imagePath: string): string {
    return this.imageService.getImageUrl(imagePath);
  }

  // Método para alternar o estado da sidebar
  toggleSidebar() {
    this.sidebarActive = !this.sidebarActive;
  }
}
