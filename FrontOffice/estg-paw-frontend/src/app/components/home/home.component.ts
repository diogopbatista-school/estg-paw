import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginComponent } from '../login/login.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RestaurantService } from '../../services/restaurant.service';
import { DishService } from '../../services/dish.service';
import { HttpClientModule } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    LoginComponent,
    CommonModule,
    FormsModule,
    HttpClientModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  // Propriedades para newsletter
  newsletterEmail: string = '';
  // Propriedades para restaurantes e categorias
  featuredRestaurants: any[] = [];
  dishCategories: string[] = [];
  loading: boolean = true;
  error: string = '';

  constructor(
    private restaurantService: RestaurantService,
    private dishService: DishService,
    private imageService: ImageService
  ) {}

  ngOnInit(): void {
    console.log('[HomeComponent] carregado');
    // Inicializar animações e outros efeitos quando a página carregar
    this.initAnimations();

    // Carregar restaurantes em destaque
    this.loadFeaturedRestaurants();

    // Carregar categorias de pratos
    this.loadDishCategories();
  }

  // Método para enviar email de newsletter
  onNewsletterSubmit(): void {
    if (this.newsletterEmail && this.validateEmail(this.newsletterEmail)) {
      console.log('Newsletter subscription for:', this.newsletterEmail);
      // Aqui você adicionará a chamada ao serviço backend quando estiver pronto

      // Exibir mensagem de sucesso
      alert(
        'Obrigado por se inscrever! Em breve você receberá nossas ofertas exclusivas.'
      );

      // Limpar campo após envio
      this.newsletterEmail = '';
    } else {
      alert('Por favor, insira um endereço de e-mail válido.');
    }
  }

  // Método helper para validar email
  private validateEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  // Método para inicializar animações quando a página carregar
  private initAnimations(): void {
    // Implementar animações adicionais conforme necessário
    // Este método pode ser expandido conforme o projeto crescer
  }
  // Carregar restaurantes em destaque
  private loadFeaturedRestaurants(): void {
    this.loading = true;
    this.restaurantService.getFeaturedRestaurants().subscribe({
      next: (restaurants) => {
        // Limitar para os 3 primeiros restaurantes em destaque
        this.featuredRestaurants = restaurants.slice(0, 3);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar restaurantes em destaque:', err);
        this.error = 'Não foi possível carregar os restaurantes em destaque.';
        this.loading = false;
      },
    });
  }
  
  // Carregar categorias de pratos
  private loadDishCategories(): void {
    this.loading = true;
    this.dishService
      .getAllCategories()
      .pipe(
        catchError((err) => {
          console.error('Erro ao carregar categorias:', err);
          this.error = 'Não foi possível carregar as categorias de pratos.';
          this.loading = false;

          // Fornecer categorias de fallback como exemplo no caso de erro
          return of([
            'Pizza',
            'Sushi',
            'Burger',
            'Pasta',
            'Salad',
            'Dessert',
            'Breakfast',
            'Seafood',
          ]);
        })
      )
      .subscribe({
        next: (categories) => {
          this.dishCategories = categories;
          this.loading = false;
        },
      });
  }
  
  // Método para formatar nomes de categorias
  formatCategoryName(category: string): string {
    if (!category) return '';

    // Converter primeira letra para maiúscula
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }
  
  // Método para gerar URLs corretas para imagens
  getImageUrl(imagePath: string): string {
    return this.imageService.getRestaurantImageUrl(imagePath);
  }
}
