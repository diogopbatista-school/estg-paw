import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
// Update the import path below if your api config is in a different location, e.g. 'src/environments/api'
import { api } from '../../environments/api';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  private apiUrl = `${api.api}/restaurants`;

  constructor(private http: HttpClient) {}

  // Obter todos os restaurantes
  getAllRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  // Obter restaurantes verificados
  getVerifiedRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/verified`);
  }

  // Obter restaurantes em destaque
  getFeaturedRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/featured`);
  }

  // Obter restaurante por ID
  getRestaurantById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Obter todos os menus de um restaurante
  getRestaurantMenus(restaurantId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${restaurantId}/menus`);
  }
  
  // Pesquisar restaurantes
  searchRestaurants(params: any): Observable<any[]> {
    let httpParams = new HttpParams();
    
    if (params.name) {
      httpParams = httpParams.set('name', params.name);
    }
    
    if (params.latitude && params.longitude && params.maxDistance) {
      httpParams = httpParams.set('latitude', params.latitude);
      httpParams = httpParams.set('longitude', params.longitude);
      httpParams = httpParams.set('maxDistance', params.maxDistance);
    }
    
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params: httpParams });
  }

  // Extrair categorias únicas de todos os restaurantes
  getAllUniqueCategories(): Observable<string[]> {
    // Esta função buscará todos os restaurantes e menus, e depois extrairá categorias únicas
    return new Observable<string[]>((observer) => {
      this.getAllRestaurants().subscribe(
        (restaurants) => {
          let allCategories = new Set<string>();

          // Para cada restaurante, obter seus menus
          let completedRequests = 0;

          if (restaurants.length === 0) {
            observer.next([]);
            observer.complete();
            return;
          }

          restaurants.forEach((restaurant) => {
            this.getRestaurantMenus(restaurant._id).subscribe(
              (menus) => {
                // Extrair categorias de cada menu
                menus.forEach((menu) => {
                  if (menu.category) {
                    allCategories.add(menu.category);
                  }
                });

                completedRequests++;

                // Quando todos os restaurantes foram processados, emitir as categorias
                if (completedRequests === restaurants.length) {
                  observer.next(Array.from(allCategories));
                  observer.complete();
                }
              },
              (error) => {
                console.error(
                  `Erro ao obter menus para o restaurante ${restaurant._id}:`,
                  error
                );
                completedRequests++;

                // Continuar mesmo com erro em um restaurante
                if (completedRequests === restaurants.length) {
                  observer.next(Array.from(allCategories));
                  observer.complete();
                }
              }
            );
          });
        },
        (error) => {
          console.error('Erro ao obter restaurantes:', error);
          observer.error(error);
        }
      );
    });
  }
  // Obter restaurantes que tenham pelo menos um prato de uma categoria
  getRestaurantsByDishCategory(category: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/by-dish-category/${encodeURIComponent(category)}`);
  }
  // Obter restaurante com menus e pratos numa única chamada
  getRestaurantWithMenusAndDishes(restaurantId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${restaurantId}/with-menus-and-dishes`);
  }
  
  // Obter restaurante com menus e pratos numa única chamada (endpoint alternativo)
  getRestaurantWithMenusDishes(restaurantId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${restaurantId}/menus-dishes`);
  }
}
